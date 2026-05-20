# TrueNest AI — Backend

FastAPI server that powers the platform scan and serves results.

## Architecture

```
backend/
├── main.py                        # FastAPI app, all routes
├── session/
│   └── store.py                   # In-memory session store (data from Nest)
├── automations/
│   ├── runner.py                  # Runs all 3 automations in parallel
│   ├── utils.py                   # Chrome profile path, slow_type helper
│   └── scripts/
│       ├── ninety_nine_acres.py   # 99acres choreography
│       ├── nobroker.py            # NoBroker choreography
│       └── magicbricks.py         # MagicBricks choreography
└── results/
    └── engine.py                  # Hardcoded listings + dynamic match scores
```

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| POST | `/session/complete` | Pipecat calls this when Nest finishes |
| GET | `/scan/status` | Frontend polls: `idle / running / complete` |
| GET | `/results` | Returns 3 cards with match scores |
| POST | `/scan/reset` | Dev reset endpoint |

## Setup

```bash
cd backend
pip install -r requirements.txt
playwright install chromium
```

Create `.env` from example:
```bash
cp .env.example .env
```

If your Chrome profile is not at the default macOS path, set it:
```env
CHROME_PROFILE_PATH=/Users/yourname/Library/Application Support/Google/Chrome/Default
```

## Run

```bash
uvicorn main:app --reload --port 8000
```

## Editing Automations

Each automation is a standalone script in `automations/scripts/`.
- Edit `SEARCH_URL` / `SEARCH_QUERY` at the top of each file to change what gets searched
- Edit the `STEPS` inside each `run_*` function to change what the browser does
- To add a 4th automation, create a new file and add it to `runner.py`'s `asyncio.gather()`

## Editing Results

Edit `HARDCODED_LISTINGS` in `results/engine.py` — change titles, prices, images, tags.
Match scores auto-adjust based on what the user told Nest.

## Full Demo Flow

1. User talks to Nest on frontend (`localhost:3000`)
2. Nest finishes → bot.py calls `POST /session/complete`
3. Backend triggers 3 browser windows in parallel (visible on screen)
4. Frontend polls `GET /scan/status` until `complete`
5. Frontend navigates to `/results`, fetches `GET /results`
6. 3 property cards shown with match scores
