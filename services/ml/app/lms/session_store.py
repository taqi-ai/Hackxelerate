"""Server-side sessions for the LMS login flow.

Sessions are held in memory (this service runs one worker), keyed by an opaque `secrets.token_urlsafe(32)` id. Upstream
cookies and passwords never leave the server; passwords are never stored at all. The auth token handed to the client is
stored only as a SHA-256 hash. Lockout counters bound failed attempts per username and per client address."""
from __future__ import annotations

import base64
import hashlib
import json
import secrets
import threading
import time
from collections import deque
from dataclasses import dataclass, field

from .. import config
from .base import LMSError, LMSSessionState

PRE_LOGIN_TTL = 900
AUTH_TTL = 1800
RENEWAL_TTL = 7 * 24 * 3600
MAX_SESSIONS = 2000
MAX_FAILS_PER_USER = 5
MAX_FAILS_PER_IP = 20
WINDOW = 600.0


@dataclass
class Entry:
    id: str
    state: LMSSessionState
    expires: float
    authed: bool = False
    token_hash: str | None = None
    bundle: dict | None = None
    last_synced_at: str | None = None


_lock = threading.Lock()
_sessions: dict[str, Entry] = {}
_by_token: dict[str, str] = {}
_fails: dict[str, deque] = {}


def _now() -> float:
    return time.time()


def _purge(now: float) -> None:
    for sid in [k for k, e in _sessions.items() if e.expires <= now]:
        _drop(sid)
    while len(_sessions) > MAX_SESSIONS:                       # bound memory: oldest first
        _drop(next(iter(_sessions)))


def _drop(sid: str) -> None:
    e = _sessions.pop(sid, None)
    if e and e.token_hash:
        _by_token.pop(e.token_hash, None)


def create(state: LMSSessionState) -> Entry:
    with _lock:
        e = Entry(id=secrets.token_urlsafe(32), state=state, expires=_now() + PRE_LOGIN_TTL)
        _sessions[e.id] = e
        _purge(_now())                     # after inserting, so the bound holds exactly
        return e


def get(session_id: str) -> Entry:
    with _lock:
        _purge(_now())
        e = _sessions.get(session_id or "")
        if e is None:
            raise LMSError("LMS_SESSION_EXPIRED", "The session has expired. Start again.", 401)
        return e


def promote(e: Entry, bundle: dict, last_synced_at: str) -> str:
    """Mark the session signed in and return the client's auth token (only its hash is kept)."""
    token = secrets.token_urlsafe(32)
    with _lock:
        if e.token_hash:
            _by_token.pop(e.token_hash, None)
        e.token_hash = hashlib.sha256(token.encode()).hexdigest()
        _by_token[e.token_hash] = e.id
        e.authed, e.bundle, e.last_synced_at, e.expires = True, bundle, last_synced_at, _now() + AUTH_TTL
    return token


def by_token(token: str) -> Entry:
    h = hashlib.sha256((token or "").encode()).hexdigest()
    with _lock:
        _purge(_now())
        sid = _by_token.get(h)
        e = _sessions.get(sid or "")
        if e is None or not e.authed:
            raise LMSError("LMS_SESSION_EXPIRED", "The session has expired. Sign in again.", 401)
        return e


def touch(e: Entry) -> None:
    with _lock:
        e.expires = _now() + AUTH_TTL


def destroy(e: Entry) -> None:
    with _lock:
        e.state.upstream.clear()
        e.state.captcha_digest, e.state.captcha_salt = None, b""
        e.bundle = None
        _drop(e.id)


def reset() -> None:
    with _lock:
        _sessions.clear()
        _by_token.clear()
        _fails.clear()


# ------------------------------------------------------------------------------------------- lockout guard
def _recent(key: str, now: float) -> deque:
    q = _fails.setdefault(key, deque())
    while q and q[0] <= now - WINDOW:
        q.popleft()
    return q


def check_lockout(username: str, ip: str) -> None:
    now = _now()
    with _lock:
        for key, limit in ((f"u:{username.strip().upper()}", MAX_FAILS_PER_USER), (f"ip:{ip}", MAX_FAILS_PER_IP)):
            q = _recent(key, now)
            if len(q) >= limit:
                retry = max(1, int(q[0] + WINDOW - now) + 1)
                raise LMSError("LMS_LOCKED", f"Too many failed attempts. Try again in {retry} seconds.", 429)
        if len(_fails) > 20000:                                   # bound the counters themselves
            _fails.clear()


def record_failure(username: str, ip: str) -> None:
    now = _now()
    with _lock:
        _recent(f"u:{username.strip().upper()}", now).append(now)
        _recent(f"ip:{ip}", now).append(now)


def clear_failures(username: str) -> None:
    with _lock:
        _fails.pop(f"u:{username.strip().upper()}", None)


def lockout_remaining(username: str) -> int:
    now = _now()
    with _lock:
        q = _recent(f"u:{username.strip().upper()}", now)
        return max(0, int(q[0] + WINDOW - now) + 1) if len(q) >= MAX_FAILS_PER_USER else 0


# ------------------------------------------------------------------------------------------- renewal token (AES-GCM)
def _key() -> bytes:
    if not config.TOKEN_SECRET:
        raise LMSError("LMS_UNAVAILABLE", "Remembering a session is not configured on this service.", 503)
    return hashlib.sha256(b"ascora-lms-renewal|" + config.TOKEN_SECRET.encode()).digest()


def seal_renewal(university_id: str, student_key: str) -> str:
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    except ImportError:
        raise LMSError("LMS_UNAVAILABLE", "Remembering a session is not available on this service.", 503)
    nonce = secrets.token_bytes(12)
    body = json.dumps({"u": university_id, "k": student_key, "exp": int(_now()) + RENEWAL_TTL}).encode()
    return base64.urlsafe_b64encode(nonce + AESGCM(_key()).encrypt(nonce, body, b"ascora-lms-renewal")).decode().rstrip("=")


def open_renewal(token: str, university_id: str) -> str:
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        raw = base64.urlsafe_b64decode(token + "=" * (-len(token) % 4))
        data = json.loads(AESGCM(_key()).decrypt(raw[:12], raw[12:], b"ascora-lms-renewal"))
    except LMSError:
        raise
    except Exception:
        raise LMSError("LMS_RENEWAL_INVALID", "The saved session is not valid. Sign in again.", 401)
    if data.get("u") != university_id or float(data.get("exp", 0)) < _now():
        raise LMSError("LMS_RENEWAL_INVALID", "The saved session has expired. Sign in again.", 401)
    return data["k"]
