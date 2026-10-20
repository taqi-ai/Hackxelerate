"""Short-lived signed tokens: the web app (after checking the Supabase session and role) mints one, the browser
sends it to this service. Fails closed: with no secret configured, every protected call is refused.

Token = base64url(json claims) + "." + base64url(HMAC-SHA256(secret, claims)). Claims: sub, role, exp (unix s), inst
(the caller's institution; this service serves exactly one, config.INSTITUTION_ID)."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

from fastapi import Depends, Header, HTTPException

from . import config


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def sign(claims: dict, secret: str | None = None) -> str:
    secret = config.TOKEN_SECRET if secret is None else secret
    payload = _b64(json.dumps(claims, separators=(",", ":")).encode())
    sig = _b64(hmac.new(secret.encode(), payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{sig}"


def verify(token: str, secret: str | None = None, now: float | None = None) -> dict:
    secret = config.TOKEN_SECRET if secret is None else secret
    if not secret:
        raise HTTPException(503, "Service auth is not configured")
    try:
        payload, sig = token.split(".", 1)
        expected = _b64(hmac.new(secret.encode(), payload.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            raise ValueError("bad signature")
        claims = json.loads(_unb64(payload))
    except Exception:
        raise HTTPException(401, "Invalid token")
    if float(claims.get("exp", 0)) < (now if now is not None else time.time()):
        raise HTTPException(401, "Token expired")
    return claims


def current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Sign in required")
    claims = verify(authorization.split(" ", 1)[1].strip())
    # tokens minted before the institution claim existed carry none and mean this service's own institution
    if claims.get("inst") not in (None, config.INSTITUTION_ID):
        raise HTTPException(403, "This analytics service belongs to another institution")
    return claims


def require_admin(user: dict = Depends(current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return user


def require_admin_write(user: dict = Depends(require_admin)) -> dict:
    """Admin actions that change published data (pipeline runs, uploads). The shared demo logins are public,
    so their tokens carry demo=true and may read and simulate but never overwrite the dataset."""
    if user.get("demo"):
        raise HTTPException(403, "Demo accounts can explore but not change published data. Use an institution admin account.")
    return user
