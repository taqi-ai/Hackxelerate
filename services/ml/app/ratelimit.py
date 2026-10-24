"""Per-caller sliding-window limit for the endpoints that cost compute or LLM spend (/ask, /whatif).

In memory and per process: this service runs one worker, so the limit is exact there; with several workers the
effective ceiling is the limit times the worker count, which still bounds abuse. Caller = the token's `sub`."""
from __future__ import annotations

import os
import threading
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException

from .auth import current_user

LIMIT = int(os.getenv("ASCORA_RATE_LIMIT_PER_MIN", "60"))
WINDOW_S = 60.0

_hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)
_lock = threading.Lock()


def _check(bucket: str, caller: str, now: float | None = None) -> None:
    now = time.monotonic() if now is None else now
    with _lock:
        q = _hits[(bucket, caller)]
        while q and q[0] <= now - WINDOW_S:
            q.popleft()
        if len(q) >= LIMIT:
            retry = max(1, int(q[0] + WINDOW_S - now) + 1)
            raise HTTPException(429, "Too many requests. Try again shortly.", headers={"Retry-After": str(retry)})
        q.append(now)


def limited(bucket: str):
    def dep(user: dict = Depends(current_user)) -> dict:
        _check(bucket, str(user.get("sub", "anonymous")))
        return user
    return dep


def reset() -> None:
    with _lock:
        _hits.clear()
