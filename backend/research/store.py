"""
Research Store
In-memory store for AI-generated property listings from the Exa + GPT pipeline.
Lost on restart — intentional for demo parity with SessionStore.
"""

from typing import Any


class ResearchStore:
    def __init__(self):
        self._results: list[dict[str, Any]] | None = None
        self.status: str = "idle"  # idle | running | complete | error

    def set_running(self) -> None:
        """Mark pipeline as in progress."""
        self.status = "running"

    def save_results(self, results: list[dict[str, Any]]) -> None:
        """Persist generated listings and mark complete."""
        self._results = results
        self.status = "complete"

    def get_results(self) -> list[dict[str, Any]] | None:
        """Return generated listings, or None if not ready."""
        return self._results

    def clear(self) -> None:
        """Reset store — called on /scan/reset."""
        self._results = None
        self.status = "idle"
