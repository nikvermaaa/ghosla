# Ghosla — Frontend

Next.js 16 + React 19 + Tailwind v4 + TypeScript frontend for Ghosla.

This is the user-facing interface. It connects to the Pipecat voice agent (WebRTC), drives the Playwright browser theater, and renders the final property results.

---

## What We Are Building (MVP)

Three screens, one linear flow:

```
[Landing] → [Voice Call / Ghosla] → [Results]
```

### Screen 1 — Landing
- Ghosla logo + tagline
- Single CTA button: **"Talk to Ghosla"**
- Minimal, dark background, clean typography
- No forms, no inputs — everything happens via voice

### Screen 2 — Voice Call (Active Session)
- Animated orb/waveform that reacts to Ghosla speaking vs. user speaking
- Live transcript strip at the bottom (shows what Ghosla just said)
- Subtle status line: `"Listening..."` / `"Ghosla is speaking..."` / `"Searching across platforms..."`
- When Ghosla says final line ("Give me a moment while I search..."), this screen triggers the Playwright theater automatically
- The Playwright browser windows open visibly on screen while this page shows: `"Finding your perfect home across 99acres, NoBroker & more..."`

### Screen 3 — Results
- 3 property cards side by side
- Each card:
  - Property photo
  - Title (e.g. "2 BHK in Koramangala")
  - Rent / Price
  - Key tags: Furnished · 2nd Floor · Lift · Parking
  - Platform badge: `99acres` or `NoBroker`
  - **Match score** (e.g. `94% match`) — calculated from collected preferences
  - CTA: `Schedule Visit` button
- Data is hardcoded for MVP demo — keyed to the most common demo scenario (2BHK, Bangalore, ₹20-25k, furnished)

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Linting/Format | Biome |
| Voice Transport | `@pipecat-ai/client-js` + WebRTC (SmallWebRTC) |
| State | React `useState` / `useRef` (no Redux needed for MVP) |
| Playwright trigger | API route → spawns Playwright subprocess |

---

## Pipecat WebRTC Connection

Pipecat's local server exposes a WebRTC signaling endpoint at:
```
http://localhost:7860/offer
```

The frontend connects using `@pipecat-ai/client-js`:

```ts
import { RTVIClient } from "@pipecat-ai/client-js";
import { SmallWebRTCTransport } from "@pipecat-ai/small-webrtc-transport";

const client = new RTVIClient({
  transport: new SmallWebRTCTransport(),
  params: {
    baseUrl: "http://localhost:7860",
  },
});

await client.connect();
```

Key events to listen for:

```ts
// Bot starts speaking
client.on("botStartedSpeaking", () => setStatus("Ghosla is speaking..."));

// Bot stops speaking
client.on("botStoppedSpeaking", () => setStatus("Listening..."));

// Transcript from bot (for the live caption strip)
client.on("botTranscript", (text) => setTranscript(text));

// User transcript
client.on("userTranscript", (data) => {
  if (data.final) setUserSpeech(data.text);
});
```

### Detecting Conversation End

When Ghosla says the final line (`"Give me a moment while I search..."`), the bot will stop speaking and not respond to further input.

Detect this via transcript matching:

```ts
client.on("botTranscript", (text: string) => {
  if (text.includes("Give me a moment while I search")) {
    triggerPlaywrightTheater(); // call Next.js API route
  }
});
```

---

## Playwright Theater Trigger

A Next.js API route at `/api/search` spawns the Playwright automation:

```ts
// app/api/search/route.ts
import { NextResponse } from "next/server";
import { exec } from "child_process";

export async function POST() {
  // Spawn playwright script as a background process
  exec("node scripts/theater.js", (err) => {
    if (err) console.error("Playwright error:", err);
  });

  return NextResponse.json({ status: "started" });
}
```

The Playwright script (`scripts/theater.js`) runs the browser choreography:
1. Open 99acres → search → scroll → hover listings
2. Open NoBroker → repeat faster
3. Open a third tab showing `"Comparing 47 listings..."`
4. Close all tabs after ~30s

After the API call returns, the frontend starts a ~35 second timer then navigates to `/results`.

---

## File Structure (Planned)

```
frontend/
├── app/
│   ├── page.tsx               # Landing screen
│   ├── call/
│   │   └── page.tsx           # Voice call screen (Ghosla)
│   ├── results/
│   │   └── page.tsx           # Property results screen
│   ├── api/
│   │   └── search/
│   │       └── route.ts       # Playwright trigger API route
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── VoiceOrb.tsx           # Animated orb that reacts to voice state
│   ├── TranscriptStrip.tsx    # Live caption at bottom of call screen
│   ├── PropertyCard.tsx       # Single result card component
│   └── MatchScore.tsx         # Match % badge
├── lib/
│   ├── pipecat.ts             # RTVIClient setup and event hooks
│   └── hardcoded-results.ts   # Static property data for demo
├── scripts/
│   └── theater.js             # Playwright browser choreography
└── README.md
```

---

## Hardcoded Results (Demo Data)

Results are pre-loaded from `lib/hardcoded-results.ts`. Three properties targeting the most common demo input:
- City: Bangalore
- BHK: 2BHK
- Budget: ₹20,000–₹25,000/month
- Furnished: Semi-furnished

Match scores are derived by comparing collected fields vs. property attributes at runtime — even with hardcoded listings, the score will vary slightly based on what the user said, making it feel live.

---

## Running Locally

```bash
cd frontend
pnpm install
pnpm dev
```

Make sure Pipecat bot is running first:
```bash
cd ../pipecat-quickstart
uv run bot.py
```

Then open `http://localhost:3000` and click **Talk to Ghosla**.

---

## Demo Flow (End to End)

1. User opens `localhost:3000` — sees landing page
2. Clicks **"Talk to Ghosla"** → navigates to `/call`
3. WebRTC connects to Pipecat → Ghosla greets and starts the conversation
4. User answers 6–7 questions via voice
5. Ghosla says final line → frontend detects it → calls `/api/search`
6. Playwright opens and runs the browser theater in the background (visible on screen)
7. After ~35s, frontend auto-navigates to `/results`
8. Results page shows 3 property cards with match scores
9. Judges are impressed. We win.
