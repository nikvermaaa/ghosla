# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev          # start dev server (Next.js, port 3000)
pnpm build        # production build
pnpm start        # serve production build
pnpm lint         # Biome check (lint + format check)
pnpm format       # Biome format with auto-fix
```

No test suite configured.

## Architecture

**Ghosla** — rental home finder. User describes requirements via voice, backend scrapes listings, results shown with locality intel.

### Routes

| Route | File | Role |
|---|---|---|
| `/` | `app/page.tsx` | Marketing landing page |
| `/call` | `app/call/page.tsx` | Voice call entry (lazy-loads `VoiceCall.tsx`) |
| `/results` | `app/results/page.tsx` | Listing cards with expandable locality intel |

### Call flow

`/call` renders `VoiceCall.tsx` (dynamically imported, `ssr: false` required because it holds a singleton `PipecatClient`).

`VoiceCall` has four internal states:
1. **select** — choose Voice Agent vs Chatbot (chatbot is disabled/coming-soon)
2. **connecting** — `PipecatClient.startBotAndConnect()` call in flight to `PIPECAT_URL` (`localhost:7860`)
3. **conversation** — live WebRTC session; transcript shown; transitions to analyzing when bot says `"give me a moment"` or user clicks "End conversation"
4. **analyzing** — POSTs to `BACKEND_URL/session/complete`, polls `/scan/status` every 3 s and `/scan/logs` every 1.5 s, redirects to `/results` on `status === "complete"`

### External services

| Var | Default | Service |
|---|---|---|
| `PIPECAT_URL` | `http://localhost:7860` | Pipecat voice server (WebRTC, `/start` endpoint) |
| `BACKEND_URL` | `http://localhost:8000` | Python REST backend |

Backend endpoints used:
- `POST /session/complete` — triggers scraping pipeline
- `GET /scan/status` → `{ status: "complete" | ... }`
- `GET /scan/logs` → `{ logs: string[] }`
- `GET /results` → `{ results: Listing[] }` (also accepts `listings` key)

### Tooling

- **Biome 2.2** — linter + formatter (2-space indent, organizeImports on save). Replaces ESLint/Prettier.
- **Tailwind CSS v4** — PostCSS plugin, no `tailwind.config.*` file needed.
- **Framer Motion** — all animation. Use `useReducedMotion()` guard when adding new motion.
- **pnpm** — package manager (workspace config present).
