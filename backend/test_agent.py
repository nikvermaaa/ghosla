"""
Standalone test for browser-use agent — no server needed.
Opens a single visible browser and runs the AI agent for one site.

Usage:
    python test_agent.py                 # NoBroker (default)
    python test_agent.py nobroker
    python test_agent.py 99acres
    python test_agent.py magicbricks
"""

import asyncio
import sys

import automations.log_store as log_store

# Patch append_log to also print live to stdout
_original = log_store.append_log

def _loud(msg: str):
    _original(msg)
    print(msg)

log_store.append_log = _loud

from automations.scripts.platform_scan import run_nobroker, run_99acres, run_magicbricks

SESSION = {
    "bhk_type": "2 BHK",
    "locality": "Electronic City",
    "budget_range": "15000-20000",
    "furnishing_type": "semi-furnished",
}

SITES = {
    "nobroker": run_nobroker,
    "99acres": run_99acres,
    "magicbricks": run_magicbricks,
}


async def main():
    site_key = sys.argv[1].lower() if len(sys.argv) > 1 else "nobroker"

    if site_key not in SITES:
        print(f"Unknown site '{site_key}'. Choose: {', '.join(SITES)}")
        sys.exit(1)

    print(f"Launching agent for: {site_key}")
    print(f"Session: {SESSION}\n")

    await SITES[site_key](SESSION)


asyncio.run(main())
