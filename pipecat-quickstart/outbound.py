#
# Copyright (c) 2024-2026, Daily
#
# SPDX-License-Identifier: BSD 2-Clause License
#

"""Gosla Outbound Twilio Call.

Makes an outbound phone call using Twilio and runs the Gosla voice pipeline.
After the call ends, extracts session data from the conversation and
POSTs it to the main backend at MAIN_BACKEND_URL/session/complete.

Setup:
    1. Run ngrok:          ngrok http 8765
    2. Set PUBLIC_URL in .env to your ngrok HTTPS URL
    3. Update TWILIO_AUTH_TOKEN in .env
    4. Install deps:       uv sync
    5. Run:                uv run outbound.py
"""

import asyncio
import json
import os

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from loguru import logger
from openai import AsyncOpenAI
from twilio.rest import Client as TwilioClient

from pipecat.audio.turn.smart_turn.local_smart_turn_v3 import LocalSmartTurnAnalyzerV3
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import LLMRunFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.serializers.twilio import TwilioFrameSerializer
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)
from pipecat.turns.user_start import TranscriptionUserTurnStartStrategy, VADUserTurnStartStrategy
from pipecat.turns.user_stop import TurnAnalyzerUserTurnStopStrategy
from pipecat.turns.user_turn_strategies import UserTurnStrategies

load_dotenv(override=True)

ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "+12297432113")
TO_NUMBER = os.getenv("TWILIO_TO_NUMBER", "+918218134534")
PUBLIC_URL = os.getenv("PUBLIC_URL", "").rstrip("/")
MAIN_BACKEND_URL = os.getenv("MAIN_BACKEND_URL", "http://localhost:8000")

# ── Call state ────────────────────────────────────────────────────────────────
# Single-call-at-a-time state (demo context — no concurrency needed).
# status: idle | calling | on_call | processing | complete | failed
_call_state: dict = {"status": "idle", "to": None, "call_sid": None}

# ── Fallback session ──────────────────────────────────────────────────────────
# Sent to /session/complete when the call fails or the transcript is unusable.
FALLBACK_SESSION: dict = {
    "name": "User",
    "age": "28",
    "gender": "male",
    "locality": "Koramangala",
    "suggested_locality_choice": "Koramangala 5th Block",
    "budget_range": "20000-30000",
    "bhk_type": "2 BHK",
    "furnishing_type": "semi-furnished",
    "lifestyle_preference": "balanced community",
    "workplace_location": "Koramangala",
    "max_commute_time": "30 minutes",
    "amenities_required": "parking, lift, security",
    "deal_breakers": "noise, no parking",
    "priorities": "location, budget",
    "user_type": "working professional",
    "living_type": "bachelor",
    "kids": "no",
    "primary_priority": "proximity to office",
    "nearby_requirements": "supermarket, pharmacy",
    "occupancy_type": "single",
    "has_locality": "yes",
}

REQUIRED_SESSION_KEYS = tuple(FALLBACK_SESSION.keys())

SYSTEM_PROMPT = """
Aap Gosla voice assistant hain.

GOAL:
- User se basic rental preferences jaldi lena.
- Sirf short Q&A, phir polite wrap-up.

LANGUAGE:
- Hindi default.
- User English bole to Hinglish.
- Natural, simple spoken language.

VOICE STYLE:
- Expressive, warm, aur human tone.
- Fast-paced boliye, lekin clear aur crisp.
- Har line sunne mein natural lage, robotic nahi.

SPEED + LATENCY:
- Har response max 1 short sentence (kabhi-kabhi 2).
- Extra explanation, recap, ya long wording mat do.
- Filler words aur long intros avoid karo.

ASK ONLY THESE CORE QUESTIONS (one by one; if already answered, skip):
1) Aapka preferred area/locality?
2) Monthly budget?
3) Kitne BHK?
4) Furnishing preference?
5) Koi must-have (metro/parking/office paas)?
6) Koi deal-breaker?

OPENING:
"Namaste, main Gosla se bol rahi hoon. Aapka naam?"

WRAP-UP (exact line when enough info collected):
"Gosla se judne ke liye shukriya. Maine aapki requirements le li hain. Ab main aapko best listings dikhati hoon."

HARD RULES:
- Voice-friendly plain text only.
- Max 6 questions total.
- Specific listings ya prices suggest mat karo.
"""


# ── Session extraction ────────────────────────────────────────────────────────

_EXTRACTION_SYSTEM = """You are extracting Indian rental housing preferences from a Hindi/Hinglish voice conversation between Gosla AI assistant and a user.

CRITICAL RULES — READ CAREFULLY:
- Fill EVERY field. Never return null, empty string, or "unknown".
- If information is NOT mentioned in the conversation, make a reasonable and creative assumption based on available context (city, language hints, profession, budget level).
- You MUST generate plausible values for every field — even if guessing or inventing. The goal is a complete, realistic Indian renter profile.
- Think creatively. A high budget implies premium lifestyle. A tech city implies IT worker. A young voice implies bachelor.
- Return ONLY a flat JSON object with exactly these keys — no extra keys, no nesting.

REQUIRED KEYS:
name, age, gender, locality, suggested_locality_choice, budget_range, bhk_type,
furnishing_type, lifestyle_preference, workplace_location, max_commute_time,
amenities_required, deal_breakers, priorities, user_type, living_type, kids,
primary_priority, nearby_requirements, occupancy_type, has_locality

FIELD GUIDE:
- name: user's name (default "User" if not given)
- age: string number like "26" (guess from context)
- gender: "male" or "female" (guess from name or context)
- locality: area they want, e.g. "Koramangala" or "Electronic City"
- suggested_locality_choice: more specific, e.g. "Koramangala 5th Block"
- budget_range: like "20000-30000" (string, monthly rent in INR)
- bhk_type: like "2 BHK"
- furnishing_type: "fully-furnished", "semi-furnished", or "unfurnished"
- lifestyle_preference: e.g. "active healthy fitness-focused", "peaceful quiet", "balanced"
- workplace_location: their office area
- max_commute_time: like "30 minutes"
- amenities_required: comma-separated, e.g. "gym, parking, lift"
- deal_breakers: things they don't want, e.g. "noise, no parking"
- priorities: what matters most, e.g. "location, price, amenities"
- user_type: "working professional", "student", "freelancer", etc.
- living_type: "bachelor", "couple", "family"
- kids: "yes" or "no"
- primary_priority: single most important thing, e.g. "proximity to office"
- nearby_requirements: e.g. "supermarket, hospital, pharmacy"
- occupancy_type: "single", "couple", "family"
- has_locality: "yes" or "no"
"""


async def _extract_session(messages: list) -> dict:
    """Extract rental session fields from the Gosla conversation transcript.

    Uses GPT at temperature 1.4 with explicit permission to fill/create plausible
    values for any fields not mentioned in the conversation.

    Args:
        messages: LLMContext messages list (includes system, user, assistant turns).

    Returns:
        Dict matching the SessionData schema expected by main backend.

    Raises:
        Exception: If OpenAI call fails or JSON parse fails.
    """
    # Filter to actual conversation turns only
    conv_turns = [
        m for m in messages
        if isinstance(m, dict) and m.get("role") in ("user", "assistant")
    ]

    if not conv_turns:
        logger.warning("No conversation turns found — returning fallback session")
        return FALLBACK_SESSION

    # Build readable transcript
    conv_text = "\n".join(
        f"{'USER' if m['role'] == 'user' else 'SARA'}: {_get_content(m)}"
        for m in conv_turns
    )

    logger.info(f"Extracting session from {len(conv_turns)} conversation turns")

    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = await client.chat.completions.create(
        model="gpt-4.1-2025-04-14",
        temperature=1.4,
        messages=[
            {"role": "system", "content": _EXTRACTION_SYSTEM},
            {"role": "user", "content": f"CONVERSATION:\n{conv_text}"},
        ],
        response_format={"type": "json_object"},
    )

    extracted = json.loads(response.choices[0].message.content)
    if not isinstance(extracted, dict):
        raise ValueError("Extraction output is not a JSON object")

    normalized = FALLBACK_SESSION.copy()
    for key in REQUIRED_SESSION_KEYS:
        value = extracted.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            normalized[key] = text

    logger.info(
        f"Session extracted: locality={normalized.get('locality')}, budget={normalized.get('budget_range')}"
    )
    return normalized


def _get_content(message: dict) -> str:
    """Safely extract text content from a message dict.

    Args:
        message: LLMContext message dict with 'content' key.

    Returns:
        String content, or empty string if not extractable.
    """
    content = message.get("content", "")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        # OpenAI content array format
        parts = [c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text"]
        return " ".join(parts)
    return str(content)


async def _post_session_to_backend(session: dict) -> None:
    """POST extracted session to main backend /session/complete.

    Args:
        session: Extracted session dict.
    """
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{MAIN_BACKEND_URL}/session/complete", json=session)
            logger.info(f"Session posted to backend — status {resp.status_code}")
    except Exception as e:
        logger.error(f"Failed to post session to backend: {e}")


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.api_route("/twiml", methods=["GET", "POST"])
async def twiml_endpoint(request: Request):
    """Return TwiML that connects the call to our WebSocket media stream."""
    ws_url = PUBLIC_URL.replace("https://", "wss://").replace("http://", "ws://") + "/ws"
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{ws_url}"/>
    </Connect>
</Response>"""
    return PlainTextResponse(twiml, media_type="application/xml")


@app.get("/call/status")
async def get_call_status():
    """Returns current call state for frontend polling.

    Returns:
        JSON with status (idle|calling|on_call|processing|complete|failed),
        to (phone number), and call_sid.
    """
    return JSONResponse(_call_state)


@app.post("/call")
async def call_endpoint(request: Request):
    """Initiate an outbound call to the given phone number.

    Body: {"to": "+91XXXXXXXXXX"}  (defaults to TWILIO_TO_NUMBER if omitted)

    Returns:
        JSON with status, call_sid, and to number.
    """
    try:
        body = await request.json()
    except Exception:
        body = {}

    to = body.get("to") or TO_NUMBER

    try:
        _call_state.update({"status": "idle", "to": to, "call_sid": None})
        sid = _make_outbound_call(to=to)
        _call_state.update({"status": "calling", "to": to, "call_sid": sid})
        return JSONResponse({"status": "calling", "call_sid": sid, "to": to})
    except Exception as e:
        logger.error(f"Call initiation failed: {e}")
        _call_state.update({"status": "failed", "to": to, "call_sid": None})
        # Still push fallback session so frontend can proceed to results
        asyncio.create_task(_post_session_to_backend(FALLBACK_SESSION))
        return JSONResponse({"status": "failed", "message": str(e)}, status_code=500)


async def _run_sara_pipeline(transport: FastAPIWebsocketTransport):
    """Build and run the Gosla voice pipeline on the given transport.

    Captures the full conversation from LLMContext after the call ends,
    extracts session fields using GPT, and POSTs to the main backend.

    Args:
        transport: FastAPI WebSocket transport connected to Twilio Media Stream.
    """
    stt = DeepgramSTTService(
        api_key=os.getenv("DEEPGRAM_API_KEY"),
        settings=DeepgramSTTService.Settings(
            model="nova-3-general",
            language="multi",
        ),
    )

    tts = CartesiaTTSService(
        api_key=os.getenv("CARTESIA_API_KEY"),
        settings=CartesiaTTSService.Settings(
            voice="95d51f79-c397-46f9-b49a-23763d3eaa2d",
            language="hi-IN",
        ),
    )

    llm = OpenAILLMService(
        api_key=os.getenv("OPENAI_API_KEY"),
        settings=OpenAILLMService.Settings(
            model="gpt-4.1-2025-04-14",
            system_instruction=SYSTEM_PROMPT,
        ),
    )

    context = LLMContext()
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            vad_analyzer=SileroVADAnalyzer(),
            user_turn_strategies=UserTurnStrategies(
                start=[VADUserTurnStartStrategy(), TranscriptionUserTurnStartStrategy()],
                stop=[TurnAnalyzerUserTurnStopStrategy(turn_analyzer=LocalSmartTurnAnalyzerV3())],
            ),
        ),
    )

    pipeline = Pipeline([
        transport.input(),
        stt,
        user_aggregator,
        llm,
        tts,
        transport.output(),
        assistant_aggregator,
    ])

    task = PipelineTask(
        pipeline,
        params=PipelineParams(enable_metrics=True, enable_usage_metrics=True),
    )
    finalized = False

    async def finalize_session(reason: str) -> None:
        nonlocal finalized
        if finalized:
            return
        finalized = True

        logger.info(f"{reason} — extracting session")
        _call_state["status"] = "processing"

        try:
            session = await _extract_session(context.messages)
        except Exception as e:
            logger.error(f"Session extraction failed: {e} — using fallback")
            session = FALLBACK_SESSION

        await _post_session_to_backend(session)
        _call_state["status"] = "complete"
        logger.info("Session complete — research pipeline triggered")

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, websocket):
        logger.info("Twilio stream active — Gosla starting")
        _call_state["status"] = "on_call"
        context.add_message({
            "role": "developer",
            "content": "Start with the exact opening line from instructions. Keep replies short, expressive, human, fast-paced, and clear.",
        })
        await task.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, websocket):
        await finalize_session("Twilio stream ended")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=False)
    try:
        await runner.run(task)
    finally:
        # Safety net: if disconnect handler didn't fire, still finalize once.
        await finalize_session("Pipeline finished")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Handle Twilio Media Stream WebSocket.

    Waits for the Twilio "start" event to obtain stream_sid and call_sid,
    then hands off to the Sara pipeline.
    """
    await websocket.accept()
    logger.info("Twilio WebSocket connected — waiting for stream start")

    stream_sid = None
    call_sid = None

    while True:
        try:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            event = data.get("event")

            if event == "connected":
                logger.debug("Twilio connected event received")
                continue
            elif event == "start":
                stream_sid = data.get("streamSid")
                call_sid = data["start"].get("callSid")
                logger.info(f"Stream started — stream_sid={stream_sid}, call_sid={call_sid}")
                break
            else:
                logger.debug(f"Ignoring Twilio event during handshake: {event}")
        except Exception as e:
            logger.error(f"Twilio handshake failed: {e}")
            _call_state["status"] = "failed"
            asyncio.create_task(_post_session_to_backend(FALLBACK_SESSION))
            return

    if not stream_sid:
        logger.error("Twilio stream start missing stream_sid")
        _call_state["status"] = "failed"
        asyncio.create_task(_post_session_to_backend(FALLBACK_SESSION))
        return

    serializer = TwilioFrameSerializer(
        stream_sid=stream_sid,
        call_sid=call_sid,
        account_sid=ACCOUNT_SID,
        auth_token=AUTH_TOKEN,
    )

    transport = FastAPIWebsocketTransport(
        websocket,
        FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            add_wav_header=False,
            serializer=serializer,
        ),
    )

    await _run_sara_pipeline(transport)


def _make_outbound_call(to: str = None) -> str:
    """Initiate the outbound Twilio call.

    Args:
        to: Destination phone number. Defaults to TWILIO_TO_NUMBER.

    Returns:
        Twilio call SID string.

    Raises:
        ValueError: If PUBLIC_URL is not configured.
        Exception: If Twilio REST call fails.
    """
    target = to or TO_NUMBER

    if not PUBLIC_URL or "your-ngrok" in PUBLIC_URL:
        raise ValueError(
            "PUBLIC_URL not configured. Run ngrok http 8765 and set PUBLIC_URL in .env"
        )

    client = TwilioClient(ACCOUNT_SID, AUTH_TOKEN)
    call = client.calls.create(
        to=target,
        from_=FROM_NUMBER,
        url=f"{PUBLIC_URL}/twiml",
    )
    logger.info(f"Outbound call placed — SID: {call.sid} | {FROM_NUMBER} -> {target}")
    return call.sid


if __name__ == "__main__":
    logger.info("Starting Gosla (Twilio Outbound)")
    logger.info(f"Trigger call: POST http://localhost:8765/call")
    logger.info(f"Check status: GET  http://localhost:8765/call/status")
    uvicorn.run(app, host="0.0.0.0", port=8765)
