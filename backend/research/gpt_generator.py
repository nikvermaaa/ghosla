"""
GPT Generator
Takes Exa research results + session data and generates 6 structured property cards.
Temperature is high intentionally — output accuracy is secondary to creative, plausible generation.
For any field not found in research, GPT is instructed to generate realistic Indian values.
"""

import json
import os
from typing import Any

from openai import AsyncOpenAI

MODEL = "gpt-5.4-2026-03-05"
TEMPERATURE = 1.0

# Validated Unsplash image pool — GPT must pick from these to avoid broken URLs
UNSPLASH_POOL = [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80",
    "https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=800&q=80",
]

SYSTEM_PROMPT = """You are an expert Indian real estate data generator for rental properties in Bangalore.

Given property research from NoBroker/99acres/MagicBricks and locality intelligence data, generate exactly 6 rental property cards as JSON.

## Core rules

1. **India-specific** — all values must be realistic for India:
   - Rent in ₹ (integer, no symbol in JSON — just the number)
   - Phone numbers: "+91 XXXXX XXXXX" format (10 digits after +91, first digit 6–9)
   - Addresses: include area, locality, city, pin code (Bangalore pins: 560001–560300)
   - Owner names: common Indian names (South Indian preferred for Bangalore)

2. **Fill every field** — for any field NOT present in research, generate plausible realistic values.
   Never return null, empty string, or placeholder text. Generate it.

3. **Variety** — spread listings across:
   - Different societies/building names
   - Different price points within user's budget ±20%
   - Different floors, facings, furnishing levels
   - Mix of NoBroker, 99acres, MagicBricks, Housing as platforms

4. **Locality accuracy** — keep locality_intel grounded for Bangalore:
   - AQI values: 60–120 for most Bangalore areas (integer)
   - Typical Bangalore water supply issues (tanker dependency, BWSSB cuts)
   - Real metro lines (Yellow Line: Silk Board–Anjanapura, Purple Line: Whitefield–Challaghatta)
   - Realistic commute times for Bangalore traffic

## Scoring rules

- **match_score** (60–97): fit to user's BHK, budget, locality, furnishing. Cap at 97. Never below 60.
- **fraud_score** (0–100): fraud risk. High = suspicious.
  - 60–80: price 30%+ below market, anonymous/unverified owner, vague address
  - 20–40: price reasonable, owner listed but not verified
  - 0–15: reputed society, verified owner, price matches market, detailed address
  - Include 1–2 listings with score 50–75 to make results feel real
- **vibe_score** (0–100): lifestyle quality.
  - 80–100: premium amenities (pool, gym, clubhouse), walkable, cafes/restaurants nearby, active community
  - 50–70: decent amenities, liveable, no standout features
  - 20–40: bare minimum, isolated, no social infrastructure

## Image rule
Use ONLY images from this pool — assign one per listing, no repeats:
""" + "\n".join(f"- {url}" for url in UNSPLASH_POOL) + """

## Output format
Return ONLY a valid JSON object with key "listings" containing an array of exactly 6 cards. No explanation, no markdown."""


LISTING_SCHEMA = """Each listing card must have ALL of these fields:
{
  "id": <integer 1–6>,
  "title": "<BHK> in <Society Name>",
  "society": "<Society Name>",
  "address": "<door/flat no>, <street>, <locality>, Bengaluru <pin>",
  "bhk": "<e.g. 2 BHK>",
  "area_sqft": <integer 700–1500>,
  "floor": "<Nth Floor / N Floors>",
  "total_floors": <integer>,
  "facing": "<East|West|North|South|North-East|South-West|etc.>",
  "age_years": <integer 1–20>,
  "rent": <integer in INR — no ₹ symbol>,
  "maintenance": <integer in INR — no ₹ symbol>,
  "deposit": <integer — typically 2–3x rent>,
  "furnishing": "<unfurnished|semi-furnished|fully-furnished>",
  "furnishing_details": ["<item>", ...],
  "amenities": ["<amenity>", ...],
  "available_from": "<Immediate|N days notice|DD Month YYYY>",
  "preferred_tenants": "<Bachelor|Family|Working Professional|Bachelor/Family>",
  "owner": {
    "name": "<Indian name>",
    "phone": "+91 XXXXX XXXXX",
    "type": "Owner",
    "since": "Listed N days ago",
    "verified": <true|false>
  },
  "platform": "<NoBroker|99acres|MagicBricks|Housing>",
  "platform_color": "<hex — NoBroker:#2563eb, 99acres:#16a34a, MagicBricks:#e63946, Housing:#f97316>",
  "platform_url": "<real search URL for the locality on that platform>",
  "image": "<one URL from the provided pool — no repeats>",
  "tags": ["<tag1>", "<tag2>", ...],
  "locality": "<locality name lowercase>",
  "phase": "<phase or sub-area if applicable, else empty string>",
  "lifestyle": "<balanced|peaceful|premium|community|vibrant>",
  "commute_friendly": <true|false>,
  "nearby": {
    "it_companies": ["<Company Name (X km)>", ...],
    "metro": "<Station Name> (Line) — X km",
    "hospital": "<Hospital Name> — X km",
    "supermarket": "<Store Name> — X km",
    "school": "<School Name> — X km",
    "bus_stop": "<Stop Name> — X km"
  },
  "locality_intel": {
    "overall_rating": <float 3.0–4.8>,
    "summary": "<2–3 honest sentences about the locality>",
    "pros": ["<pro1>", "<pro2>", "<pro3>", "<pro4>", "<pro5>"],
    "red_flags": ["<flag1>", "<flag2>", "<flag3>", "<flag4>", "<flag5>"],
    "aqi": {
      "value": <integer 60–130>,
      "level": "<Good|Moderate|Unhealthy for Sensitive Groups|Unhealthy>",
      "pm25": "<value µg/m³>",
      "pm10": "<value µg/m³>"
    },
    "noise": {
      "level_db": <integer 40–80>,
      "category": "<Low|Low-Moderate|Moderate|Moderate-High|High>",
      "note": "<context — floor, nearby road, etc.>"
    },
    "traffic": {
      "peak_delay": "<description of peak hour delay>",
      "off_peak": "<description of off-peak travel time>"
    },
    "water_supply": {
      "source": "<BWSSB|borewell|tanker|combination>",
      "frequency": "<daily|3 days/week|etc.>",
      "flag": "<issue description or None>"
    },
    "safety": {
      "rating": "<Excellent|Good|Moderate|Poor>",
      "police_station": "<PS Name> — X km"
    },
    "internet": "<ISPs available and typical speeds>",
    "power_backup": "<backup description>"
  },
  "match_score": <integer 60–97>,
  "fraud_score": <integer 0–100>,
  "vibe_score": <integer 0–100>
}"""


def _extract_highlights(exa_response: dict | Exception) -> str:
    """
    Flatten Exa search highlights into readable text for the GPT prompt.
    Returns a placeholder string on error or empty response.

    Args:
        exa_response: Raw Exa API response dict, or an Exception if search failed.

    Returns:
        Formatted string with titles, URLs, and highlight snippets.
    """
    if isinstance(exa_response, Exception) or not exa_response:
        return "Search unavailable — generate from general knowledge."

    results = exa_response.get("results", [])
    if not results:
        return "No results found — generate from general knowledge."

    lines = []
    for result in results[:12]:
        title = result.get("title", "Untitled")
        url = result.get("url", "")
        highlights = result.get("highlights") or []
        lines.append(f"\n[{title}] ({url})")
        for snippet in highlights[:3]:
            lines.append(f"  • {snippet}")

    return "\n".join(lines)


async def generate_listings(
    session: dict[str, Any],
    listings_data: dict | Exception,
    locality_data: dict | Exception,
) -> list[dict]:
    """
    Generate 6 property cards via OpenAI using Exa research as grounding context.

    For any field not present in research, the model is instructed to generate
    realistic Indian values rather than leaving fields empty.

    Args:
        session: Voice session data dict from Nest.
        listings_data: Exa response for property listings, or Exception if search failed.
        locality_data: Exa response for locality research, or Exception if search failed.

    Returns:
        List of 6 property card dicts matching the hardcoded listing schema
        plus fraud_score and vibe_score fields.

    Raises:
        ValueError: If GPT returns unexpected JSON shape.
        json.JSONDecodeError: If GPT response is not valid JSON.
    """
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

    listings_text = _extract_highlights(listings_data)
    locality_text = _extract_highlights(locality_data)

    locality = (
        session.get("locality")
        or session.get("suggested_locality_choice")
        or "Electronic City, Bangalore"
    )

    user_prompt = f"""Generate 6 rental property listing cards as JSON for the following user.

## User requirements (from voice conversation)
{json.dumps(session, indent=2)}

## Property listings research (NoBroker / 99acres / MagicBricks)
Target locality: {locality}
{listings_text}

## Locality intelligence research (AQI, commute, amenities, safety)
{locality_text}

## Card schema — every listing must match this exactly
{LISTING_SCHEMA}

Return a JSON object: {{ "listings": [ ...6 cards... ] }}"""

    response = await client.chat.completions.create(
        model=MODEL,
        temperature=TEMPERATURE,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content
    data = json.loads(raw)

    listings = data.get("listings")
    if not isinstance(listings, list) or len(listings) == 0:
        raise ValueError(
            f"GPT returned unexpected shape — keys: {list(data.keys())}, raw[:200]: {raw[:200]}"
        )

    return listings[:6]
