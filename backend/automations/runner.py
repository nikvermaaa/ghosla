import asyncio
from typing import Any

from automations.log_store import append_log
from automations.scripts.platform_scan import run_nobroker, run_99acres, run_magicbricks

SCAN_TIMEOUT = 60   # hard cap — all browsers force-close after this many seconds
STAGGER_DELAY = 5   # seconds between each window opening


class AutomationRunner:
    def __init__(self):
        self.status = "idle"
        self.results = []

    def reset(self):
        self.status = "idle"
        self.results = []

    async def run_all(self, session: dict[str, Any]) -> None:
        """
        Open 3 browser windows in staggered sequence, run agents in parallel,
        then force-close everything after SCAN_TIMEOUT seconds.

        Sequence:
          t=0s  → NoBroker opens
          t=5s  → 99Acres opens
          t=10s → MagicBricks opens
          t=60s → all browsers killed, status = complete

        Args:
            session: Voice session data from Nest.
        """
        self.status = "running"
        append_log("[Runner] Platform scan started")

        async def staggered():
            append_log("[Runner] Opening NoBroker...")
            nobroker_task = asyncio.create_task(run_nobroker(session))

            await asyncio.sleep(STAGGER_DELAY)
            append_log("[Runner] Opening 99Acres...")
            acres_task = asyncio.create_task(run_99acres(session))

            await asyncio.sleep(STAGGER_DELAY)
            append_log("[Runner] Opening MagicBricks...")
            magic_task = asyncio.create_task(run_magicbricks(session))

            # Wait for all 3 to finish naturally
            await asyncio.gather(
                nobroker_task,
                acres_task,
                magic_task,
                return_exceptions=True,
            )

        try:
            await asyncio.wait_for(staggered(), timeout=SCAN_TIMEOUT)
        except asyncio.TimeoutError:
            append_log("[Runner] 60s timeout reached — closing all browsers")
        except Exception as e:
            append_log(f"[Runner] Unexpected error: {e}")
        finally:
            self.status = "complete"
            append_log("[Runner] Platform scan complete")

    async def shutdown(self) -> None:
        pass
