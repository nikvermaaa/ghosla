# Testing Commands

All commands run from `backend/`. Server must be running unless noted.

## Start server

```bash
uvicorn main:app --reload --port 8000
```

---

## Run full theater test (separate terminal)

```bash
python test_theater.py
```

Triggers all 3 browser automations, polls until complete, prints results with match scores.

---

## Individual endpoint tests (curl)

### Health check
```bash
curl http://localhost:8000/health
```
Expected: `{"status":"ok"}`

### Trigger session + automations
```bash
curl -s -X POST http://localhost:8000/session/complete \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mursaleen",
    "locality": "Electronic City",
    "budget_range": "15000-20000",
    "bhk_type": "2 BHK",
    "furnishing_type": "semi-furnished",
    "lifestyle_preference": "balanced",
    "workplace_location": "Electronic City Phase 1",
    "max_commute_time": "15 minutes",
    "user_type": "working professional",
    "primary_priority": "commute",
    "amenities_required": "parking, lift, security",
    "age": "23", "gender": "male", "has_locality": "yes",
    "occupancy_type": "full apartment", "nearby_requirements": "office, metro",
    "priorities": "safety, low traffic", "living_type": "alone",
    "kids": "", "suggested_locality_choice": "",
    "deal_breakers": "noise, no parking"
  }'
```
Expected: `{"status":"started"}`

### Poll theater status
```bash
curl http://localhost:8000/scan/status
```
Expected: `{"status":"idle"}` / `{"status":"running"}` / `{"status":"complete"}`

### Fetch results
```bash
curl http://localhost:8000/results
```
Expected: `{"results":[...3 cards with match_score...]}` — scores sorted descending.

### Reset theater (dev)
```bash
curl -X POST http://localhost:8000/scan/reset
```
Expected: `{"status":"reset"}` — clears session, sets status back to `idle`.

---

## Verify match score logic (no server needed)

```bash
python -c "
from results.engine import compute_results
session = {'bhk_type': '2 BHK', 'furnishing_type': 'semi-furnished', 'budget_range': '15000-20000', 'locality': 'Electronic City', 'lifestyle_preference': 'balanced'}
for r in compute_results(session):
    print(r['match_score'], r['title'])
"
```
