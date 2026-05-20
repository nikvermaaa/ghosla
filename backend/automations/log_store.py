"""
Scan Log Store
Shared in-memory log list. All 3 automation scripts append here.
FastAPI serves logs via GET /scan/logs for the frontend proof panel.
"""

from typing import List

scan_log: List[str] = []


def clear_logs():
    scan_log.clear()


def get_logs() -> List[str]:
    return list(scan_log)


def append_log(msg: str) -> None:
    scan_log.append(msg)
