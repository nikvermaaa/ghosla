"""
Results Engine
Fallback property cards — loaded from output.json at startup.
match_score is recomputed dynamically per session.
fraud_score and vibe_score are preserved as-is from the JSON.
"""

import json
import os
from typing import Any

# ── Load fallback listings from output.json ───────────────────────────────────
_OUTPUT_JSON = os.path.join(os.path.dirname(__file__), "..", "output.json")

def _load_fallback() -> list[dict]:
    try:
        with open(_OUTPUT_JSON, "r") as f:
            return json.load(f).get("results", [])
    except Exception:
        return []

HARDCODED_LISTINGS = _load_fallback()


def compute_match_score(listing: dict, session: dict[str, Any]) -> int:
    """
    Computes a match % by checking how many session fields align with listing.
    Capped at 97 — 100% looks fake.

    Args:
        listing: Property card dict.
        session: Voice session data dict from Nest.

    Returns:
        Integer match score 60–97.
    """
    score = 60  # base

    bhk = session.get("bhk_type", "").lower()
    if bhk and bhk in listing["bhk"].lower():
        score += 10

    furnishing = session.get("furnishing_type", "").lower()
    if furnishing and furnishing in listing["furnishing"].lower():
        score += 8

    budget = session.get("budget_range", "")
    if budget:
        try:
            budget_clean = budget.replace("k", "000").replace(",", "").replace(" ", "")
            if "-" in budget_clean:
                low, high = budget_clean.split("-")
                if int(low) <= listing["rent"] <= int(high):
                    score += 10
            elif int(budget_clean) >= listing["rent"]:
                score += 10
        except Exception:
            pass

    lifestyle = session.get("lifestyle_preference", "").lower()
    if lifestyle and listing.get("lifestyle", "") in lifestyle:
        score += 7

    locality_input = session.get("locality", session.get("suggested_locality_choice", "")).lower()
    listing_locality = listing.get("locality", "").lower()
    if locality_input and any(word in listing_locality for word in locality_input.split()):
        score += 8

    phase_input = locality_input
    listing_phase = listing.get("phase", "").lower()
    if "phase 1" in phase_input and "phase 1" in listing_phase:
        score += 5
    elif "phase 2" in phase_input and "phase 2" in listing_phase:
        score += 5

    return min(score, 97)


def compute_results(session: dict[str, Any]) -> list[dict]:
    """
    Returns fallback listings sorted by match score descending.

    Args:
        session: Voice session data dict from Nest.

    Returns:
        List of property card dicts with match_score computed for this session.
    """
    results = []
    for listing in HARDCODED_LISTINGS:
        card = listing.copy()
        card["match_score"] = compute_match_score(listing, session)
        results.append(card)
    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results


def get_automation_results(runner) -> list[dict]:
    """
    Returns live listings collected by the automation runner.

    Args:
        runner: AutomationRunner instance.

    Returns:
        List of live-scraped property card dicts, or empty list.
    """
    if runner and getattr(runner, "results", None):
        return list(runner.results)
    return []
