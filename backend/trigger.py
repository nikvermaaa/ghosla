"""
Real API test trigger — Mohammed Mursaleen's actual session data.
Posts to /session/complete, polls /results until AI pipeline completes,
saves final output to output.json.
"""

import json
import time
import urllib.request

BASE = "http://localhost:8000"

SESSION = {
    "name": "Mohammed Mursaleen",
    "age": "28",
    "gender": "male",
    "locality": "Electronic City",
    "suggested_locality_choice": "Electronic City Phase 1 or Phase 2",
    "budget_range": "20000-25000",
    "bhk_type": "2 BHK",
    "furnishing_type": "fully-furnished",
    "lifestyle_preference": "active healthy fitness-focused",
    "workplace_location": "Electronic City",
    "max_commute_time": "30 minutes",
    "amenities_required": "gym swimming pool jogging track",
    "deal_breakers": "high AQI poor air quality no gym far from office",
    "priorities": "gym access low AQI short commute to Electronic City",
    "user_type": "working professional",
    "living_type": "bachelor",
    "primary_priority": "health and fitness infrastructure",
    "nearby_requirements": "gym hospital pharmacy supermarket",
    "occupancy_type": "single",
    "kids": "no",
    "has_locality": "yes",
}

POLL_INTERVAL = 5   # seconds between /results polls
TIMEOUT = 180       # give up after 3 minutes


def post(path: str, body: dict) -> dict:
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())


def get(path: str) -> dict:
    with urllib.request.urlopen(f"{BASE}{path}") as res:
        return json.loads(res.read())


def main():
    # 1. Kick off session
    print("→ POST /session/complete")
    resp = post("/session/complete", SESSION)
    print(f"  {resp}")

    # 2. Poll /results until source == "ai" or timeout
    print(f"\n→ Polling /results every {POLL_INTERVAL}s (timeout {TIMEOUT}s)...")
    start = time.time()
    result_data = None

    while time.time() - start < TIMEOUT:
        elapsed = int(time.time() - start)
        try:
            data = get("/results")
            source = data.get("source", "unknown")
            count = len(data.get("results", []))
            print(f"  [{elapsed}s] source={source}  cards={count}")

            if source == "ai":
                result_data = data
                break
        except Exception as exc:
            print(f"  [{elapsed}s] poll error: {exc}")

        time.sleep(POLL_INTERVAL)

    if result_data is None:
        print("\n✗ Timeout — fetching whatever is available")
        result_data = get("/results")

    # 3. Save to output.json
    with open("output.json", "w") as f:
        json.dump(result_data, f, indent=2, ensure_ascii=False)

    source = result_data.get("source", "unknown")
    count = len(result_data.get("results", []))
    print(f"\n✓ Saved {count} cards (source={source}) → output.json")

    # 4. Quick summary print
    for card in result_data.get("results", []):
        title = card.get("title", "?")
        rent = card.get("rent", "?")
        match = card.get("match_score", "?")
        fraud = card.get("fraud_score", "?")
        vibe = card.get("vibe_score", "?")
        print(f"  • {title}  ₹{rent}/mo  match={match}  fraud={fraud}  vibe={vibe}")


if __name__ == "__main__":
    main()
