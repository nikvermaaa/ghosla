"""
In-memory session store.
Holds the data Nest collected during the voice conversation.
"""

from typing import Any


class SessionStore:
    def __init__(self):
        self._data: dict[str, Any] | None = None

    def save(self, data: dict[str, Any]):
        self._data = data

    def get(self) -> dict[str, Any] | None:
        return self._data

    def clear(self):
        self._data = None
