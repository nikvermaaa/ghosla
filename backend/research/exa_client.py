"""
Exa API Client
Two parallel deep searches:
  1. Actual rental listings on NoBroker / 99acres / MagicBricks for the session's locality + budget
  2. Locality intelligence — AQI, commute, amenities, safety, resident reviews
"""

import os
from typing import Any

import httpx

EXA_BASE = "https://api.exa.ai"
SEARCH_TIMEOUT = 60.0  # deep search can take up to 15s; locality search similar


def _get_api_key() -> str:
    key = os.getenv("EXA_API_KEY", "")
    if not key:
        raise RuntimeError("EXA_API_KEY not set in environment")
    return key


def _build_locality(session: dict[str, Any]) -> str:
    """Resolve the best locality string from session fields."""
    return (
        session.get("locality")
        or session.get("suggested_locality_choice")
        or "Electronic City"
    )


async def search_property_listings(session: dict[str, Any]) -> dict:
    """
    Deep search for actual rental listings on Indian property portals.

    Targets NoBroker, 99acres, MagicBricks, Housing for the session's
    locality, BHK type, and budget range.

    Args:
        session: Voice session data dict from Nest.

    Returns:
        Raw Exa API response dict with results and highlights.

    Raises:
        httpx.HTTPStatusError: On API error.
        RuntimeError: If EXA_API_KEY not set.
    """
    locality = _build_locality(session)
    bhk = session.get("bhk_type") or "2BHK"
    budget = session.get("budget_range", "")
    budget_clause = f"budget ₹{budget}" if budget else ""

    query = (
        f"{bhk} flat for rent {locality} Bangalore {budget_clause} "
        "rent price deposit furnishing amenities available"
    )

    payload = {
        "query": query,
        "type": "deep",
        "num_results": 15,
        "contents": {"highlights": True},
        "includeDomains": [
            "nobroker.in",
            "99acres.com",
            "magicbricks.com",
            "housing.com",
            "commonfloor.com",
        ],
    }

    async with httpx.AsyncClient(timeout=SEARCH_TIMEOUT) as client:
        resp = await client.post(
            f"{EXA_BASE}/search",
            headers={"x-api-key": _get_api_key(), "Content-Type": "application/json"},
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()


async def search_locality_data(session: dict[str, Any]) -> dict:
    """
    Deep search for locality intelligence for the session's area.

    Collects: AQI levels, commute data, metro connectivity, nearby amenities,
    water supply issues, safety ratings, resident reviews.

    Args:
        session: Voice session data dict from Nest.

    Returns:
        Raw Exa API response dict with results and highlights.

    Raises:
        httpx.HTTPStatusError: On API error.
        RuntimeError: If EXA_API_KEY not set.
    """
    locality = _build_locality(session)

    query = (
        f"{locality} Bangalore neighborhood 2024 2025 "
        "AQI air quality commute traffic metro connectivity "
        "water supply safety crime resident reviews schools hospital supermarket"
    )

    payload = {
        "query": query,
        "type": "deep",
        "num_results": 15,
        "contents": {"highlights": True},
    }

    async with httpx.AsyncClient(timeout=SEARCH_TIMEOUT) as client:
        resp = await client.post(
            f"{EXA_BASE}/search",
            headers={"x-api-key": _get_api_key(), "Content-Type": "application/json"},
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()
