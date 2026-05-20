# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Setup

```bash
pip install -r requirements.txt
playwright install chromium
cp .env.example .env
```

Optional — override Chrome profile path in `.env`:
```
CHROME_PROFILE_PATH=/Users/yourname/Library/Application Support/Google/Chrome/Default
```

## Run

```bash
uvicorn main:app --reload --port 8000
```

## Architecture

**TrueNest AI backend** — FastAPI server powering a "property search theater": 3 real browser windows open in parallel after a voice conversation (via Pipecat/Nest), visually demonstrating AI-driven property search before returning hardcoded results with dynamic match scores.

### Data flow

```
Pipecat bot  →  POST /session/complete  →  SessionStore.save()
                                        →  AutomationRunner.run_all() (background task)
                                               asyncio.gather(99acres, nobroker, magicbricks)

Frontend     →  GET /scan/status  (polls: idle → running → complete)
             →  GET /results      →  compute_results(session) → sorted cards
```

### Key design decisions

- **`AutomationRunner.status`** is plain string state (`idle | running | complete`); errors still set `complete` so frontend never hangs.
- **`SessionStore`** is in-memory singleton — data lost on restart, intentional for demo.
- **Results are hardcoded** in `results/engine.py::HARDCODED_LISTINGS`. `compute_match_score()` makes them feel dynamic by scoring against session fields (BHK, furnishing, budget, lifestyle, locality). Scores are capped at 97 — 100% looks fake.
- Each automation script uses Playwright's `launch_persistent_context` with the real Chrome profile (not a sandboxed browser) so it inherits cookies/auth.

### Adding a 4th automation

1. Create `automations/scripts/newsite.py` with `async def run_newsite(session: dict)`
2. Import and add to `asyncio.gather()` in `automations/runner.py`

### Modifying automations

Each script has `SEARCH_URL` at the top and `STEPS` inside `run_*()`. Change `SEARCH_URL` to target different search params. Use `slow_type()` from `automations/utils.py` for human-like typing in inputs.

### SessionData fields

Fields collected by Nest during the voice conversation (all strings, may be empty):
`name, age, gender, locality, budget_range, bhk_type, furnishing_type, occupancy_type, lifestyle_preference, nearby_requirements, priorities, workplace_location, max_commute_time, user_type, living_type, kids, primary_priority, suggested_locality_choice, amenities_required, deal_breakers`

## CORS

Allowed origins: `localhost:3000` (frontend), `localhost:7860` (Pipecat/Gradio).
