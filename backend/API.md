# TrueNest AI — Backend API Reference

Base URL: `http://localhost:8000`

---

## How It Works

Two background pipelines fire simultaneously the moment a voice session ends:

```
Voice conversation ends
        │
        ▼
POST /session/complete
        │
        ├──────────────────────────────────────────────┐
        │  BROWSER THEATER                             │  RESEARCH PIPELINE
        │  (visual demo)                               │  (actual results)
        │                                              │
        │  t=0s   NoBroker opens                       │  Exa deep search #1
        │  t=5s   99Acres opens                        │    → property listings
        │  t=10s  MagicBricks opens                    │  Exa deep search #2
        │  t=120s hard timeout, all close              │    → locality intel
        │                                              │         │
        │  [frontend polls /scan/status]            │         ▼
        │                                              │  GPT generates 6 cards
        │                                              │  (structured JSON)
        │                                              │         │
        ▼                                              │         ▼
GET /scan/status → "complete"                      │  stored in ResearchStore
                                                      │
                                                      ▼
                                             GET /results → source: "ai"
```

**Result priority on `GET /results`:**

| Priority | Source | `source` value |
|----------|--------|----------------|
| 1st | Exa + GPT AI-generated cards | `"ai"` |
| 2nd | Live browser scrape + fallback cards | `"live+fallback"` |
| 3rd | Fallback cards only | `"fallback"` |

The frontend should always call `/results` after `/scan/status` is `complete`. If `source === "ai"`, the results are fully AI-generated from real web research. If `source === "fallback"`, the research pipeline failed — use these as demo data only.

---

## Endpoints

### `GET /health`

Liveness check.

**Response**
```json
{ "status": "ok" }
```

---

### `POST /session/complete`

Saves session data and fires both pipelines (theater + research) as background tasks.

**Request body** — all fields strings, all optional. More fields = better AI results.

```json
{
  "name": "Mohammed Mursaleen",
  "age": "28",
  "gender": "male",
  "locality": "Electronic City",
  "suggested_locality_choice": "Electronic City Phase 1 or Phase 2",
  "budget_range": "20000-25000",
  "bhk_type": "2 BHK",
  "furnishing_type": "fully-furnished",
  "occupancy_type": "single",
  "lifestyle_preference": "active healthy fitness-focused",
  "nearby_requirements": "gym hospital pharmacy supermarket",
  "priorities": "gym access low AQI short commute",
  "workplace_location": "Electronic City",
  "max_commute_time": "30 minutes",
  "user_type": "working professional",
  "living_type": "bachelor",
  "kids": "no",
  "primary_priority": "health and fitness infrastructure",
  "amenities_required": "gym swimming pool jogging track",
  "deal_breakers": "high AQI no gym far from office"
}
```

**Response**
```json
{ "status": "started" }
```

> Both pipelines run in background. This returns immediately.

---

### `GET /scan/status`

Poll every 3–5 seconds to track the platform scan.

**Response**
```json
{ "status": "running" }
```

| Value | Meaning |
|-------|---------|
| `"idle"` | No session started |
| `"running"` | Browsers open, agents working |
| `"complete"` | Theater done — safe to call `/results` |

> The research pipeline has no separate status endpoint. Call `/results` — if `source === "ai"` it's done; if `source === "fallback"` it's still running or failed.

---

### `GET /scan/logs`

Live log lines from all browser agents. Poll every 1–2 seconds.

**Response**
```json
{
  "logs": [
    "[Runner] Theater started",
    "[Runner] Opening NoBroker...",
    "[Research] Pipeline started — running Exa searches in parallel",
    "[Research] Listings search done — 15 results",
    "[Research] Locality search done — 12 results",
    "[Research] Generating property cards with GPT...",
    "[Research] Pipeline complete — 6 cards generated"
  ]
}
```

Each line is prefixed with `[Source]` — color-code by prefix:

| Prefix | Color suggestion |
|--------|-----------------|
| `[Runner]` | Gray |
| `[NoBroker]` | Blue `#2563eb` |
| `[99Acres]` | Green `#16a34a` |
| `[MagicBricks]` | Red `#e63946` |
| `[Research]` | Purple `#7c3aed` |

---

### `GET /results`

Returns 6 property cards sorted by `match_score` descending.

**Response**
```json
{
  "source": "ai",
  "results": [ ...6 cards... ]
}
```

**`source` field** — tells the frontend how results were generated:

| Value | Meaning | UI treatment |
|-------|---------|--------------|
| `"ai"` | Exa + GPT — real web research | Show normally |
| `"live+fallback"` | Browser scrape + demo cards | Show with note |
| `"fallback"` | Demo cards only (AI pipeline failed) | Show with note |

---

## Property Card Schema

Every card in `results[]` has this shape:

```json
{
  "id": 1,
  "title": "2 BHK in Arka Residency",
  "society": "Arka Residency",
  "address": "Flat 102, VM35+837 Service Road, Doddathoguru, Konappana Agrahara, Bengaluru 560100",
  "bhk": "2 BHK",
  "area_sqft": 1200,
  "floor": "1st Floor / 4 Floors",
  "total_floors": 4,
  "facing": "North",
  "age_years": 8,
  "rent": 24500,
  "maintenance": 2000,
  "deposit": 60000,
  "furnishing": "fully-furnished",
  "furnishing_details": ["2 beds with mattresses", "sofa set", "refrigerator", "washing machine", "AC in master bedroom", "modular kitchen"],
  "amenities": ["Gym", "Swimming pool", "Jogging track", "Power backup", "Lift", "Security", "CCTV"],
  "available_from": "Immediate",
  "preferred_tenants": "Working Professional",
  "owner": {
    "name": "Raghavendra Bhat",
    "phone": "+91 83412 56493",
    "type": "Owner",
    "since": "Listed 6 days ago",
    "verified": true
  },
  "platform": "NoBroker",
  "platform_color": "#2563eb",
  "platform_url": "https://www.nobroker.in/property/rent/bangalore/Electronic%20City",
  "image": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
  "tags": ["near infosys", "fully furnished", "gym access", "pool", "bachelor friendly"],
  "locality": "electronic city",
  "phase": "Phase 1",
  "lifestyle": "community",
  "commute_friendly": true,
  "nearby": {
    "it_companies": ["Infosys Campus (2.2 km)", "Wipro Gate (2.8 km)", "Tech Mahindra (3.1 km)"],
    "metro": "Electronic City Metro Station (Yellow Line) — 1.8 km",
    "hospital": "Kauvery Hospital, Electronic City — 2.4 km",
    "supermarket": "D Mart Ready, Neeladri Road — 1.2 km",
    "school": "Delhi Public School E-City — 4.6 km",
    "bus_stop": "Doddathoguru Bus Stop — 0.4 km"
  },
  "locality_intel": {
    "overall_rating": 4.2,
    "summary": "This pocket near Doddathoguru works well for IT professionals...",
    "pros": ["Good access to Infosys and Wipro campuses", "Yellow Line metro reachable in under 10 minutes", "..."],
    "red_flags": ["Traffic builds up near Konappana Agrahara junction", "Dust from ongoing roadwork", "..."],
    "aqi": {
      "value": 88,
      "level": "Moderate",
      "pm25": "31 µg/m³",
      "pm10": "68 µg/m³"
    },
    "noise": {
      "level_db": 58,
      "category": "Moderate",
      "note": "Slight traffic noise from service road; manageable on 1st floor with windows closed."
    },
    "traffic": {
      "peak_delay": "15–25 minutes extra towards Wipro Gate during 8:30–10:30 AM.",
      "off_peak": "Electronic City Phase 1 offices reachable in 8–12 minutes."
    },
    "water_supply": {
      "source": "combination",
      "frequency": "daily",
      "flag": "BWSSB plus borewell; tanker support may be used in late summer."
    },
    "safety": {
      "rating": "Good",
      "police_station": "Electronic City Police Station — 2.9 km"
    },
    "internet": "Airtel Xstream, ACT Fibernet and JioFiber available; 100–300 Mbps.",
    "power_backup": "Generator backup for lift, common areas and one light/fan point."
  },
  "match_score": 95,
  "fraud_score": 12,
  "vibe_score": 84
}
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | 1–6 |
| `title` | string | Display title |
| `society` | string | Building/society name |
| `address` | string | Full Indian address with pin code |
| `bhk` | string | e.g. `"2 BHK"` |
| `area_sqft` | int | Carpet/built-up area |
| `floor` | string | e.g. `"3rd Floor / 7 Floors"` |
| `total_floors` | int | Total floors in building |
| `facing` | string | `East / West / North / South / North-East / ...` |
| `age_years` | int | Building age in years |
| `rent` | int | Monthly rent in ₹ (no symbol — prepend `₹` in UI) |
| `maintenance` | int | Monthly maintenance in ₹ (`0` = included in rent) |
| `deposit` | int | Security deposit in ₹ (typically 2–3× rent) |
| `furnishing` | string | `unfurnished / semi-furnished / fully-furnished` |
| `furnishing_details` | string[] | List of furnished items |
| `amenities` | string[] | Society amenities |
| `available_from` | string | `"Immediate"` or `"N days notice"` or date |
| `preferred_tenants` | string | `Bachelor / Family / Working Professional / Bachelor/Family` |
| `owner.name` | string | Owner's name |
| `owner.phone` | string | `+91 XXXXX XXXXX` format |
| `owner.verified` | bool | Whether owner is verified on platform |
| `owner.since` | string | e.g. `"Listed 3 days ago"` |
| `platform` | string | `NoBroker / 99acres / MagicBricks / Housing` |
| `platform_color` | string | Hex color for platform badge |
| `platform_url` | string | Deep link to search results on that platform |
| `image` | string | Unsplash image URL |
| `tags` | string[] | Short highlight tags for the card |
| `locality` | string | Lowercase locality name |
| `phase` | string | Sub-area (e.g. `"Phase 1"`, `"Phase 2"`) |
| `lifestyle` | string | `balanced / peaceful / premium / community / vibrant` |
| `commute_friendly` | bool | Whether commute to IT hub is under 30 min |
| `nearby` | object | Distances to key POIs |
| `locality_intel` | object | Deep locality data (see below) |
| `match_score` | int | 60–97 — fit to user requirements |
| `fraud_score` | int | 0–100 — fraud risk indicator |
| `vibe_score` | int | 0–100 — lifestyle quality score |

### Platform Colors

| Platform | Color | Hex |
|----------|-------|-----|
| NoBroker | Blue | `#2563eb` |
| 99acres | Green | `#16a34a` |
| MagicBricks | Red | `#e63946` |
| Housing | Orange | `#f97316` |

Use `platform_color` from the card directly — don't hardcode.

---

## Score Reference

### `match_score` — 60 to 97

How well this property fits the user's stated requirements. Higher is better. Never 100 (would look fake).

| Range | Meaning |
|-------|---------|
| 90–97 | Excellent match — show a "Top Pick" or highlight badge |
| 75–89 | Good match |
| 60–74 | Partial match — some requirements not met |

Computed from: BHK type, furnishing, rent vs budget, lifestyle, locality, phase.

### `fraud_score` — 0 to 100

Risk that this listing could be fraudulent or misleading. **Lower is safer.**

| Range | Meaning | UI treatment |
|-------|---------|--------------|
| 0–20 | Low risk — verified owner, reputed society, market price | Green badge `"Safe"` or no badge |
| 21–40 | Moderate risk — some signals worth noting | Yellow badge `"Review"` |
| 41–60 | Elevated risk — price gap, unverified, vague details | Orange badge `"Caution"` |
| 61–100 | High risk — multiple red flags | Red badge `"High Risk"` |

Risk factors GPT considers: price 30%+ below market, unverified owner, vague address, too-good-to-be-true amenities, old listing.

### `vibe_score` — 0 to 100

Lifestyle quality of the property + locality. Higher is better. Not about safety — about quality of life.

| Range | Meaning | UI treatment |
|-------|---------|--------------|
| 80–100 | Premium vibe — gym, pool, jogging track, green campus, active community | `"Great Vibe"` |
| 60–79 | Good vibe — decent amenities, liveable area | `"Good Vibe"` |
| 40–59 | Functional — practical, no standout lifestyle features | No badge |
| 0–39 | Basic — isolated, bare minimum | `"Basic"` |

Vibe factors: in-society gym/pool/jogging track, walkability, food/cafe scene nearby, green spaces, community activity, AQI, noise level.

---

## `locality_intel` Object

Detailed intelligence about the neighbourhood. Use this to power an expandable "Locality Details" section.

| Field | Type | Description |
|-------|------|-------------|
| `overall_rating` | float | 3.0–4.8 aggregate neighbourhood score |
| `summary` | string | 2–3 sentence honest assessment |
| `pros` | string[] | 5 positive points |
| `red_flags` | string[] | 5 concerns/negatives |
| `aqi.value` | int | Air Quality Index (60–130 for Bangalore) |
| `aqi.level` | string | `Good / Moderate / Unhealthy for Sensitive Groups / Unhealthy` |
| `aqi.pm25` | string | PM2.5 level e.g. `"31 µg/m³"` |
| `aqi.pm10` | string | PM10 level e.g. `"68 µg/m³"` |
| `noise.level_db` | int | Noise level in dB (CPCB residential limit is 55 dB) |
| `noise.category` | string | `Low / Low-Moderate / Moderate / Moderate-High / High` |
| `noise.note` | string | Context (floor, road proximity, etc.) |
| `traffic.peak_delay` | string | Rush hour delay description |
| `traffic.off_peak` | string | Normal commute time |
| `water_supply.source` | string | `BWSSB / borewell / tanker / combination` |
| `water_supply.frequency` | string | How often water is available |
| `water_supply.flag` | string | Known issue or `"None"` |
| `safety.rating` | string | `Excellent / Good / Moderate / Poor` |
| `safety.police_station` | string | Nearest PS with distance |
| `internet` | string | Available ISPs and typical speeds |
| `power_backup` | string | Backup coverage description |

**AQI colour coding:**

| AQI Value | Level | Color |
|-----------|-------|-------|
| < 50 | Good | Green `#16a34a` |
| 51–100 | Moderate | Yellow `#ca8a04` |
| 101–150 | Unhealthy (sensitive) | Orange `#ea580c` |
| > 150 | Unhealthy | Red `#dc2626` |

---

## Frontend Integration

```js
// 1. After voice conversation ends — send all session fields
const session = {
  name: "...",
  locality: "...",
  budget_range: "20000-25000",
  bhk_type: "2 BHK",
  // ... all fields from session
}

await fetch('http://localhost:8000/session/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(session)
})

// 2. Poll theater status (for visual platform scan indicator)
const scanPoll = setInterval(async () => {
  const { status } = await fetch('/scan/status').then(r => r.json())
  updateTheaterUI(status) // idle | running | complete
  if (status === 'complete') clearInterval(scanPoll)
}, 3000)

// 3. Poll for AI results independently — research pipeline may finish before theater
const resultsPoll = setInterval(async () => {
  const data = await fetch('/results').then(r => r.json())

  if (data.source === 'ai') {
    clearInterval(resultsPoll)
    renderResults(data.results, data.source)
  }
  // source === 'fallback' means still generating — keep polling
}, 4000)

// 4. Show live logs while waiting
const logsPoll = setInterval(async () => {
  const { logs } = await fetch('/scan/logs').then(r => r.json())
  renderLogs(logs) // color-code by prefix
}, 1500)

// 5. Render a single card
function renderCard(card) {
  // Scores
  const match = card.match_score       // 60–97, higher = better
  const fraud = card.fraud_score       // 0–100, lower = safer
  const vibe = card.vibe_score         // 0–100, higher = better

  // Financial
  const totalMonthly = card.rent + card.maintenance  // full monthly cost

  // Platform badge
  const badge = { color: card.platform_color, label: card.platform }

  // AQI color
  const aqi = card.locality_intel.aqi.value
  const aqiColor = aqi < 50 ? '#16a34a' : aqi <= 100 ? '#ca8a04' : aqi <= 150 ? '#ea580c' : '#dc2626'

  // Fraud badge
  const fraudLabel = fraud <= 20 ? 'Safe' : fraud <= 40 ? 'Review' : fraud <= 60 ? 'Caution' : 'High Risk'
  const fraudColor = fraud <= 20 ? '#16a34a' : fraud <= 40 ? '#ca8a04' : fraud <= 60 ? '#ea580c' : '#dc2626'

  // Vibe badge
  const vibeLabel = vibe >= 80 ? 'Great Vibe' : vibe >= 60 ? 'Good Vibe' : vibe >= 40 ? null : 'Basic'
}
```

---

## Polling Strategy

| What | Endpoint | Interval | Stop condition |
|------|----------|----------|---------------|
| Scan visual | `/scan/status` | 3s | `status === "complete"` |
| Live logs | `/scan/logs` | 1.5s | User closes theater view |
| AI results | `/results` | 4s | `source === "ai"` |

The research pipeline (Exa + GPT) typically completes in **30–90 seconds**. The theater browser automation runs up to **120 seconds**. Poll them independently.

---

## CORS

Allowed origins: `http://localhost:3000`, `http://localhost:7860`

---

## Dev — Reset Between Test Runs

```bash
curl -X POST http://localhost:8000/scan/reset
```

Clears all state: session, research results, theater status, logs.

---

## Running Locally

```bash
pip install -r requirements.txt
playwright install chromium
cp .env.example .env
# add EXA_API_KEY and OPENAI_API_KEY to .env

uvicorn main:app --reload --port 8000

# test trigger with real session data
python trigger.py
# results saved to output.json
```
