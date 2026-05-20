#
# Copyright (c) 2024-2026, Daily
#
# SPDX-License-Identifier: BSD 2-Clause License
#

"""TrueNest AI — Nest Voice Agent.

A smart real estate voice assistant that helps users find their ideal home
by collecting structured requirements through a natural conversation.

Supports English and Hindi (Hinglish).

Required AI services:
- Deepgram (Speech-to-Text, multilingual)
- OpenAI (LLM)
- Cartesia (Text-to-Speech)

Run the bot using::

    uv run bot.py
"""

import os

from dotenv import load_dotenv
from loguru import logger

print("🚀 Starting TrueNest AI — Nest...")
print("⏳ Loading models and imports (20 seconds, first run only)\n")

logger.info("Loading Silero VAD model...")
from pipecat.audio.vad.silero import SileroVADAnalyzer

logger.info("✅ Silero VAD model loaded")

from pipecat.frames.frames import LLMRunFrame

logger.info("Loading pipeline components...")
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.audio.filters.rnnoise_filter import RNNoiseFilter
from pipecat.audio.turn.smart_turn.local_smart_turn_v3 import LocalSmartTurnAnalyzerV3
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.runner.types import RunnerArguments
from pipecat.runner.utils import create_transport
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transports.base_transport import BaseTransport, TransportParams
from pipecat.transports.daily.transport import DailyParams
from pipecat.turns.user_stop import TurnAnalyzerUserTurnStopStrategy
from pipecat.turns.user_start import VADUserTurnStartStrategy, TranscriptionUserTurnStartStrategy
from pipecat.turns.user_turn_strategies import UserTurnStrategies

logger.info("✅ All components loaded successfully!")

load_dotenv(override=True)

SYSTEM_PROMPT = """
Aap Sara hain — TrueNest AI ki voice assistant. Aap ek real estate platform ke liye ghar dhundhne mein help karti hain.

GREETING (exactly):
"Namaste! Main Sara hoon, TrueNest AI se. Aapka perfect ghar dhundhne mein help karungi — sirf 2 minute lagenge. Aapka naam kya hai?"

---

LANGUAGE — STRICT RULES:
- ALWAYS speak in Hindi. Default language is Hindi.
- If user replies in English, respond in Hinglish (Hindi + English mix).
- NEVER switch fully to English. Hindi is always preferred.
- Use simple, everyday Hindi — not formal or literary.

---

RESPONSE LENGTH — STRICT RULES:
- Maximum 1-2 short sentences per response. Always.
- Never explain, never elaborate, never summarize.
- One acknowledgment word + one question. That's it.
- BAD: "Bahut acha! Maine aapka budget note kar liya hai. Ab main aapko batana chahungi ki..."
- GOOD: "Bilkul! Kitne BHK chahiye?"
- BAD: "Great choice! Koramangala ek bahut hi acchi jagah hai, wahan metro bhi hai aur..."
- GOOD: "Theek hai. Budget kya hai?"

---

EXAMPLE CONVERSATION (follow this style exactly):
Sara: "Namaste! Main Sara hoon, TrueNest AI se. Aapka perfect ghar dhundhne mein help karungi — sirf 2 minute lagenge. Aapka naam kya hai?"
User: "Rahul"
Sara: "Hi Rahul! Kaunsa area pasand hai — ya abhi explore kar rahe hain?"
User: "Koramangala chahiye"
Sara: "Bilkul. Budget kya hai?"
User: "30 se 40 haazar"
Sara: "Okay. Kitne BHK?"
User: "2BHK"
Sara: "Furnished chahiye ya unfurnished?"
User: "Semi-furnished"
Sara: "Koi zaruri cheez — parking, metro nearby, kuch aur?"
User: "Metro paas hona chahiye"
Sara: "Perfect. Bas ek minute — main best options dhundh rahi hoon."

---

6 QUESTIONS — ASK EXACTLY THESE, ONE BY ONE:
1. Kaunsa area / locality? (ya explore kar rahe hain?)
2. Budget kya hai? (monthly rent)
3. Kitne BHK chahiye?
4. Furnished, semi-furnished, ya unfurnished?
5. Koi specific zarurat — metro, office paas, parking?
6. Koi deal-breaker — koi cheez jo bilkul nahi chahiye?

If user gives multiple answers at once, absorb and skip those questions.

---

WRAP UP:
After all 6 questions (or when enough info is collected), say exactly:
"Perfect. Bas ek minute — main best options dhundh rahi hoon."

Then stop. Do NOT add anything after this.

---

ABSOLUTE RULES:
- Never output JSON, bullets, or formatting — voice only
- Never read brackets or symbols
- Never ask more than 6 questions total
- Never give long responses — ever
- Never suggest specific listings or prices yourself
"""


async def run_bot(transport: BaseTransport, runner_args: RunnerArguments):
    logger.info("Starting TrueNest AI — Nest")

    stt = DeepgramSTTService(
        api_key=os.getenv("DEEPGRAM_API_KEY"),
        settings=DeepgramSTTService.Settings(
            model="nova-3-general",  # nova-3 multilingual: EN, HI, ES, FR, DE, RU, PT, JA, IT, NL
            language="multi",        # Deepgram multilingual mode — handles Hinglish natively
        ),
    )

    tts = CartesiaTTSService(
        api_key=os.getenv("CARTESIA_API_KEY"),
        settings=CartesiaTTSService.Settings(
            voice="95d51f79-c397-46f9-b49a-23763d3eaa2d",  # Hinglish Indian Female voice
            language="hi-IN"
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
            vad_analyzer=SileroVADAnalyzer(),  # VAD for speech start detection
            user_turn_strategies=UserTurnStrategies(
                start=[VADUserTurnStartStrategy(), TranscriptionUserTurnStartStrategy()],
                stop=[TurnAnalyzerUserTurnStopStrategy(turn_analyzer=LocalSmartTurnAnalyzerV3())],
            ),
        ),
    )

    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            user_aggregator,
            llm,
            tts,
            transport.output(),
            assistant_aggregator,
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("Client connected")
        context.add_message(
            {
                "role": "developer",
                "content": "Greet the user with your exact opening line from the instructions. Speak in Hindi.",
            }
        )
        await task.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Client disconnected")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=runner_args.handle_sigint)
    await runner.run(task)


async def bot(runner_args: RunnerArguments):
    """Main bot entry point."""

    transport_params = {
        "daily": lambda: DailyParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
        ),
        "webrtc": lambda: TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            audio_in_filter=RNNoiseFilter(),  # Neural noise suppression on mic input
        ),
    }

    transport = await create_transport(runner_args, transport_params)
    await run_bot(transport, runner_args)


if __name__ == "__main__":
    from pipecat.runner.run import main

    main()
