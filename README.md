<div align="center">

# Ghosla 🪹

### *Your next home is one smart conversation away.*

---

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991?style=flat-square&logo=openai)](https://openai.com)
[![Deepgram](https://img.shields.io/badge/Deepgram-STT-13EF93?style=flat-square)](https://deepgram.com)
[![Pipecat](https://img.shields.io/badge/Pipecat-Voice%20AI-FF6B6B?style=flat-square)](https://pipecat.ai)

**Describe your dream rental in Hindi or English. Get a phone call from our AI agent. Watch it search 3 platforms live. Receive a shortlist ranked by match, vibe, and trust — in under 2 minutes.**

</div>

---

## The Problem

Finding a rental in Bangalore is broken.

You open NoBroker, 99acres, MagicBricks — tab after tab, duplicate listings, fake posts, brokers who never call back. You filter by BHK and price but nobody asks about your commute, your gym habit, the AQI outside your window, or whether tanker water is a deal-breaker.

**Ghosla fixes this. Talk to Sara. She handles the rest.**

---

## Demo

> Sara, our Hindi/Hinglish AI voice agent, calls your phone and asks 6 targeted questions. While you talk, our backend silently opens 3 browsers side-by-side, scanning NoBroker, 99acres, and MagicBricks simultaneously. By the time you hang up, you have a personalized shortlist with locality intelligence baked in.

| Stage | What happens |
|-------|-------------|
| **Talk** | Sara calls you. 6 questions. 2 minutes. Hindi/Hinglish native. |
| **Watch** | 3 browser agents open live — NoBroker, 99acres, MagicBricks |
| **Read** | AI-ranked cards with match score, vibe score, and fraud risk |
| **Decide** | Locality intel: AQI, water supply, metro, commute, safety |

---

## How It Works

```
                        ┌─────────────────────────────────────────────┐
                        │              USER JOURNEY                   │
                        └─────────────────────────────────────────────┘

  User enters phone           Sara calls (+91 XXXXXXXXXX)
         │                              │
         ▼                              ▼
  ┌─────────────┐          ┌────────────────────────┐
  │  /call page │          │     Pipecat Pipeline   │
  └─────────────┘          │  Deepgram STT (multi)  │
                           │  GPT-4.1 (Hindi LLM)   │
                           │  Cartesia TTS (Indian) │
                           │  Silero VAD            │
                           └──────────┬─────────────┘
                                      │ 6 questions answered
                                      ▼
                           ┌────────────────────────┐
                           │  Session Extracted     │
                           │  POST /session/complete│
                           └──────────┬─────────────┘
                                      │
                    ┌─────────────────┴──────────────────┐
                    ▼                                     ▼
       ┌────────────────────────┐          ┌─────────────────────────┐
       │   Platform Scan        │          │   Research Pipeline     │
       │  NoBroker   (t=0s)     │          │   Exa: listing search   │
       │  99acres    (t=5s)     │          │   Exa: locality intel   │
       │  MagicBricks(t=10s)    │          │   GPT-4 card generator  │
       │  60s hard timeout      │          │   6 structured cards    │
       └────────────────────────┘          └─────────────────────────┘
                    │                                     │
                    └─────────────────┬──────────────────┘
                                      ▼
                           ┌────────────────────────┐
                           │   GET /results         │
                           │   Priority:            │
                           │   1. AI-generated cards│
                           │   2. Live + fallback   │
                           │   3. Fallback only     │
                           └──────────┬─────────────┘
                                      ▼
                              /results page
                         Match score · Vibe score
                         Fraud risk · Locality intel
```

---

## Key Features

### Voice-First, Vernacular-Native
Sara speaks Hindi. You can reply in Hindi, Hinglish, or English — Deepgram's multilingual nova-3 model handles it natively. No awkward "please say your budget" menus.

### Parallel Platform Search
Three browser agents open simultaneously. NoBroker, 99acres, and MagicBricks are all searched at the same time. The frontend shows a live log of every step each agent takes.

### AI-Generated Property Cards
Exa deep-searches the live web for actual listings and locality data. GPT-4 synthesizes this into 6 structured cards — each with BHK, rent, furnishing, amenities, owner contact, platform URL, and a full locality intelligence report.

### Three Scores Per Listing

| Score | What it measures |
|-------|-----------------|
| **Match Score** (60–97) | How well the listing fits your BHK, budget, furnishing, locality, and commute |
| **Vibe Score** (0–100) | Lifestyle quality — gym, cafes, community, walkability |
| **Fraud Score** (0–100) | Risk signals — suspicious pricing, unverified owner, vague address |

### Locality Intelligence
Every card includes a full locality dossier:
- AQI (PM2.5, PM10)
- Noise level
- Peak-hour traffic delays
- Water supply (BWSSB / borewell / tanker)
- Safety rating + nearest police station
- Metro connectivity
- Nearby IT parks, hospitals, supermarkets

---

## Tech Stack

### Frontend
| Tool | Role |
|------|------|
| Next.js 16 + React 19 | Framework |
| Tailwind CSS v4 | Styling |
| Framer Motion | Animations (spring physics, 3D cards) |
| Pipecat client-react | WebRTC voice client |

### Backend
| Tool | Role |
|------|------|
| FastAPI | REST API server |
| Pipecat | Voice pipeline orchestration |
| Deepgram nova-3 | Speech-to-text (multilingual) |
| Cartesia | TTS — Indian female voice |
| OpenAI GPT-4.1 | Conversation LLM + card generation |
| Twilio | Outbound phone call delivery |
| browser-use | AI-driven browser automation agents |
| Exa | Deep web search (listings + locality) |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Three Services                 │
├─────────────────┬───────────────┬───────────────┤
│   Frontend      │   Backend     │   Voice Agent │
│   Next.js :3000 │   FastAPI     │   Pipecat     │
│                 │   :8000       │   :8765       │
└─────────────────┴───────────────┴───────────────┘

Voice transport: Twilio Media Stream → WebSocket → Pipecat
Frontend ↔ Backend: REST + polling (fetch every 1.5–4s)
Backend → Voice: HTTP proxy + session handoff
```

---

## Running Locally

### Prerequisites
- Python 3.11+
- Node.js 20+ with pnpm
- ngrok (for Twilio callback)
- API keys: OpenAI, Deepgram, Cartesia, Twilio, Exa

### 1. Backend

```bash
cd backend
cp .env.example .env
# Fill in your API keys in .env

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Voice Agent

```bash
cd pipecat-quickstart
pip install -r requirements.txt
# Start ngrok: ngrok http 8765
# Set PUBLIC_URL in .env to your ngrok URL

python outbound.py   # Twilio outbound handler on :8765
```

### 3. Frontend

```bash
cd frontend
pnpm install
pnpm dev   # http://localhost:3000
```

### Environment Variables

```env
# Backend (.env)
OPENAI_API_KEY=
EXA_API_KEY=
BROWSER_USE_API_KEY=
DEEPGRAM_API_KEY=
CARTESIA_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
PUBLIC_URL=https://your-ngrok-url.ngrok.io

# Frontend (.env.local)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## API Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/call/initiate` | Trigger outbound Twilio call |
| `GET` | `/call/status` | Poll call state |
| `POST` | `/session/complete` | Receive session, start pipelines |
| `GET` | `/scan/status` | Poll platform scan progress |
| `GET` | `/scan/logs` | Stream live browser agent logs |
| `GET` | `/results` | Fetch ranked property cards |
| `POST` | `/scan/reset` | Dev — reset all state |

---

## Results Priority

```
GET /results returns source field:

"ai"           → Exa + GPT pipeline succeeded (real web data)
"live+fallback" → Browser scrape + hardcoded fallback cards
"fallback"     → Hardcoded cards with dynamic match scoring
```

The fallback always works. The demo never breaks.

---

**Ghosla — Your next home is one smart conversation away.**

</div>
