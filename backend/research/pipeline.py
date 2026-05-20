"""
Research Pipeline
Orchestrates the full Exa → GPT flow triggered on session complete.

Flow:
  1. Two Exa deep searches run in parallel (listings + locality)
  2. Both results feed into GPT for structured card generation
  3. Generated cards saved to ResearchStore
  4. /results endpoint reads from store; falls back to hardcoded on error
"""

import asyncio
from typing import Any

from automations.log_store import append_log

from .exa_client import search_locality_data, search_property_listings
from .gpt_generator import generate_listings
from .store import ResearchStore


async def run_research_pipeline(session: dict[str, Any], store: ResearchStore) -> None:
    """
    Full pipeline: parallel Exa searches → GPT card generation → store results.

    Partial failures (one Exa search fails) are tolerated — GPT still runs
    with whatever data is available and fills gaps from general knowledge.
    Full pipeline failure sets store status to 'error'; /results falls back
    to hardcoded listings silently.

    Args:
        session: Voice session data dict from Nest.
        store: ResearchStore instance to persist generated listings.
    """
    store.set_running()
    append_log("[Research] Pipeline started — running Exa searches in parallel")

    try:
        listings_result, locality_result = await asyncio.gather(
            search_property_listings(session),
            search_locality_data(session),
            return_exceptions=True,
        )

        if isinstance(listings_result, Exception):
            append_log(f"[Research] Listings search failed: {listings_result}")
        else:
            count = len(listings_result.get("results", []))
            append_log(f"[Research] Listings search done — {count} results")

        if isinstance(locality_result, Exception):
            append_log(f"[Research] Locality search failed: {locality_result}")
        else:
            count = len(locality_result.get("results", []))
            append_log(f"[Research] Locality search done — {count} results")

        append_log("[Research] Generating property cards with GPT...")
        listings = await generate_listings(session, listings_result, locality_result)

        store.save_results(listings)
        append_log(f"[Research] Pipeline complete — {len(listings)} cards generated")

    except Exception as exc:
        append_log(f"[Research] Pipeline failed: {exc}")
        store.status = "error"
