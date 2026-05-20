"""
TrueNest AI — Backend Server
FastAPI server that:
1. Receives session data from Pipecat when conversation ends
2. Triggers parallel browser-use Cloud agents (platform scan)
3. Serves live scraped results merged with hardcoded fallback cards
4. Exposes status and live log endpoints for the frontend to poll
"""

import asyncio
import os
import time
from contextlib import asynccontextmanager
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

load_dotenv()

PIPECAT_URL = os.getenv("PIPECAT_URL", "http://localhost:8765")

from automations.log_store import clear_logs, get_logs
from automations.runner import AutomationRunner
from research.pipeline import run_research_pipeline
from research.store import ResearchStore
from results.engine import compute_results, get_automation_results
from session.store import SessionStore

# ── Shared state ────────────────────────────────────────────────────────────
session_store = SessionStore()
automation_runner = AutomationRunner()
research_store = ResearchStore()
call_bridge_state: dict[str, Any] = {"active": False, "started_at": 0.0}


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await automation_runner.shutdown()


app = FastAPI(title="TrueNest AI Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:7860"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ───────────────────────────────────────────────────────────────────
class SessionData(BaseModel):
    name: str = ""
    age: str = ""
    gender: str = ""
    has_locality: str = ""
    locality: str = ""
    budget_range: str = ""
    bhk_type: str = ""
    furnishing_type: str = ""
    occupancy_type: str = ""
    lifestyle_preference: str = ""
    nearby_requirements: str = ""
    priorities: str = ""
    workplace_location: str = ""
    max_commute_time: str = ""
    user_type: str = ""
    living_type: str = ""
    kids: str = ""
    primary_priority: str = ""
    suggested_locality_choice: str = ""
    amenities_required: str = ""
    deal_breakers: str = ""


# ── Routes ───────────────────────────────────────────────────────────────────

def _fallback_call_status() -> str:
    """Infer call progress when upstream Pipecat status endpoint is unavailable."""
    if not call_bridge_state.get("active"):
        return "idle"

    research_status = getattr(research_store, "status", "idle")
    scan_status = getattr(automation_runner, "status", "idle")

    if research_status == "complete" or scan_status == "complete":
        return "complete"
    if research_status == "error":
        return "failed"
    if research_status == "running" or scan_status == "running":
        return "processing"
    if session_store.get():
        return "processing"

    # Pipecat status unavailable and no downstream progress yet:
    # keep "calling" briefly, then move to "processing" so UI doesn't stall.
    started_at = float(call_bridge_state.get("started_at") or 0.0)
    if started_at and (time.time() - started_at) < 45:
        return "calling"
    return "processing"

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/session/complete")
async def session_complete(data: SessionData):
    """
    Called by Pipecat bot when Nest says the final line.
    Saves session data, clears old logs, and triggers:
      - Platform scan (3 parallel browser windows: NoBroker, 99acres, MagicBricks)
      - Exa + GPT research pipeline (property listings + locality → AI-generated cards)
    Both run as background tasks; /scan/status and /results are polled by frontend.
    """
    session_dict = data.model_dump()
    session_store.save(session_dict)
    clear_logs()
    research_store.clear()
    asyncio.create_task(automation_runner.run_all(session_dict))
    asyncio.create_task(run_research_pipeline(session_dict, research_store))
    return {"status": "started"}


@app.get("/scan/status")
async def scan_status():
    """
    Frontend polls this to know when the platform scan is done.
    Returns: idle | running | complete
    """
    return {"status": automation_runner.status}


@app.get("/scan/logs")
async def get_scan_logs():
    """
    Frontend polls this every 1 second to display live activity logs.
    Returns all logs collected so far from all 3 browser agents.
    """
    return {"logs": get_logs()}


@app.get("/results")
async def get_results():
    """
    Returns property cards with match scores.

    Priority:
      1. AI-generated cards from Exa + GPT research pipeline (if ready)
      2. Live-scraped cards from browser automation (if any) + hardcoded fallback
      3. Hardcoded fallback cards only
    """
    session = session_store.get() or {}

    # 1. Research pipeline results — Exa + GPT generated cards
    research = research_store.get_results()
    if research:
        return {"results": research, "source": "ai"}

    # 2. Live automation scrape + hardcoded fallback
    hardcoded = compute_results(session)
    live = get_automation_results(automation_runner)
    if live:
        return {"results": live + hardcoded, "source": "live+fallback"}

    # 3. Pure hardcoded fallback
    return {"results": hardcoded, "source": "fallback"}


@app.post("/call/initiate")
async def initiate_call(request: Request):
    """Proxy call initiation request to the outbound Pipecat service.

    Body: {"phone": "+91XXXXXXXXXX"}

    Returns:
        JSON with status and call_sid from Pipecat service, or error.
    """
    body = await request.json()
    phone = body.get("phone", "")

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(f"{PIPECAT_URL}/call", json={"to": phone})
            if resp.is_success:
                call_bridge_state["active"] = True
                call_bridge_state["started_at"] = time.time()
            else:
                call_bridge_state["active"] = False
            return JSONResponse(resp.json(), status_code=resp.status_code)
    except Exception as e:
        call_bridge_state["active"] = False
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)


@app.get("/call/status")
async def call_status():
    """Proxy call status check to the outbound Pipecat service.

    Returns:
        JSON with status (idle|calling|on_call|processing|complete|failed).
    """
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{PIPECAT_URL}/call/status")
            if resp.status_code == 404:
                status = _fallback_call_status()
                if status in ("complete", "failed", "idle"):
                    call_bridge_state["active"] = False
                return JSONResponse({"status": status, "source": "backend-fallback"})

            data = resp.json()
            status = data.get("status")
            if status in ("complete", "failed", "idle"):
                call_bridge_state["active"] = False
            return JSONResponse(data, status_code=resp.status_code)
    except Exception as exc:
        status = _fallback_call_status()
        if status in ("complete", "failed", "idle"):
            call_bridge_state["active"] = False
        return JSONResponse(
            {
                "status": status,
                "source": "backend-fallback",
                "message": f"call status unavailable: {exc}",
            }
        )


@app.post("/scan/reset")
async def reset_scan():
    """Dev endpoint — reset automation state and research pipeline for re-running."""
    automation_runner.reset()
    session_store.clear()
    research_store.clear()
    clear_logs()
    return {"status": "reset"}
