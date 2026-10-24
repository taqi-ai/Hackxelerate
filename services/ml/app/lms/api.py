"""HTTP surface of the LMS engine. Public routes (students are not staff): bounded input, lockout, single-use captcha."""
from __future__ import annotations

import time
from datetime import datetime, timezone

from fastapi import APIRouter, Header, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from . import registry, session_store as store
from .base import LMSError

router = APIRouter(prefix="/lms", tags=["lms"])

CONSENT_NOTICE = ("Demo sandbox. No university system was contacted. Your roll number and password were compared inside this service and not stored; "
                  "only the synthetic Ascora record for that roll number is shown. Never enter a real university password here.")
_init_hits: dict[str, list[float]] = {}


def _ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _err(e: LMSError, **extra) -> JSONResponse:
    body = {"code": e.code, "message": e.message, **extra}
    headers = {"Retry-After": str(extra["retry_after_sec"])} if "retry_after_sec" in extra else None
    return JSONResponse(body, status_code=e.status, headers=headers)


def _adapter(uid: str):
    a = registry.get(uid)
    if a is None:
        raise LMSError("LMS_UNKNOWN_UNIVERSITY", "That university is not supported.", 404)
    return a


def _fresh_challenge(entry, adapter) -> dict:
    cap = adapter.get_captcha(entry.state)
    return {"session_id": entry.id, "university_id": adapter.university_id, "requires_captcha": adapter.requires_captcha,
            "captcha_image_data_uri": cap.image_data_uri if cap else None, "expires_in_sec": cap.expires_in_sec if cap else store.PRE_LOGIN_TTL}


class InitBody(BaseModel):
    university_id: str = Field(..., min_length=2, max_length=40, pattern=r"^[a-z0-9_]+$")


class RefreshBody(BaseModel):
    session_id: str = Field(..., min_length=20, max_length=80)


class LoginBody(BaseModel):
    session_id: str = Field(..., min_length=20, max_length=80)
    university_id: str = Field(..., min_length=2, max_length=40, pattern=r"^[a-z0-9_]+$")
    username: str = Field(..., min_length=3, max_length=40)
    password: str = Field(..., min_length=1, max_length=128)
    captcha: str | None = Field(None, max_length=12)
    remember_session: bool = False


class RenewBody(BaseModel):
    university_id: str = Field(..., min_length=2, max_length=40, pattern=r"^[a-z0-9_]+$")
    renewal_token: str = Field(..., min_length=20, max_length=600)


@router.get("/universities")
def universities():
    return {"universities": [a.describe() for a in registry.discover().values()]}


@router.post("/session/init")
def init(body: InitBody, request: Request):
    ip, now = _ip(request), time.time()
    hits = [t for t in _init_hits.get(ip, []) if t > now - 600]
    if len(hits) >= 40:
        return _err(LMSError("LMS_RATE_LIMITED", "Too many sessions started. Try again shortly.", 429), retry_after_sec=60)
    _init_hits[ip] = hits + [now]
    if len(_init_hits) > 20000:
        _init_hits.clear()
    try:
        a = _adapter(body.university_id)
    except LMSError as e:
        return _err(e)
    entry = store.create(a.init_session())
    return {**_fresh_challenge(entry, a), "mode": "live" if a.live_supported else "demo_sandbox", "notice": None if a.live_supported else CONSENT_NOTICE}


@router.post("/session/refresh-captcha")
def refresh(body: RefreshBody):
    try:
        e = store.get(body.session_id)
        a = _adapter(e.state.university_id)
    except LMSError as err:
        return _err(err)
    return _fresh_challenge(e, a)


@router.post("/session/login")
def login(body: LoginBody, request: Request):
    ip = _ip(request)
    try:
        store.check_lockout(body.username, ip)
        e = store.get(body.session_id)
        if e.state.university_id != body.university_id:
            raise LMSError("LMS_SESSION_MISMATCH", "The session belongs to a different university.", 400)
        a = _adapter(body.university_id)
    except LMSError as err:
        return _err(err, **({"retry_after_sec": int(err.message.split(" in ")[-1].split()[0])} if err.code == "LMS_LOCKED" else {}))
    res = a.login(e.state, body.username, body.password, body.captcha)
    if not res.ok:
        store.record_failure(body.username, ip)
        remaining = store.lockout_remaining(body.username)
        captcha_failed = "captcha" in res.message.lower()
        out = {"code": "LMS_CAPTCHA_INVALID" if captcha_failed else "LMS_LOGIN_FAILED", "message": res.message, **_fresh_challenge(e, a)}
        if remaining:
            return JSONResponse({"code": "LMS_LOCKED", "message": f"Too many failed attempts. Try again in {remaining} seconds.", "retry_after_sec": remaining},
                                status_code=429, headers={"Retry-After": str(remaining)})
        return JSONResponse(out, status_code=400 if captcha_failed else 401)
    store.clear_failures(body.username)
    now = _now_iso()
    try:
        bundle = a.sync_all(e.state, now)
    except LMSError as err:
        return _err(err)
    token = store.promote(e, bundle, now)
    out = {"auth_token": token, "student_bundle": bundle, "last_synced_at": now, "consent_notice": CONSENT_NOTICE, "mode": bundle["mode"]}
    if body.remember_session:
        try:
            out["renewal_token"] = store.seal_renewal(a.university_id, e.state.student_key or "")
        except LMSError as err:
            out["renewal_unavailable"] = err.message
    return out


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise LMSError("LMS_SESSION_EXPIRED", "Sign in required.", 401)
    return authorization.split(" ", 1)[1].strip()


@router.post("/session/sync")
def sync(authorization: str | None = Header(default=None)):
    try:
        e = store.by_token(_bearer(authorization))
        a = _adapter(e.state.university_id)
        now = _now_iso()
        e.bundle = a.sync_all(e.state, now)
        e.last_synced_at = now
        store.touch(e)
        return {"student_bundle": e.bundle, "last_synced_at": now, "mode": e.bundle["mode"]}
    except LMSError as err:
        if err.code == "LMS_SESSION_EXPIRED":
            return JSONResponse({"code": "LMS_SESSION_EXPIRED", "requires_reauth": True, "message": err.message}, status_code=401)
        return _err(err)


@router.post("/session/logout")
def logout(authorization: str | None = Header(default=None)):
    try:
        store.destroy(store.by_token(_bearer(authorization)))
    except LMSError:
        pass                                  # logging out an unknown session is not an error
    return {"ok": True}


@router.post("/session/renew")
def renew(body: RenewBody):
    try:
        a = _adapter(body.university_id)
        key = store.open_renewal(body.renewal_token, a.university_id)
        e = store.create(a.init_session())
        e.state.student_key = key
        now = _now_iso()
        bundle = a.sync_all(e.state, now)
        return {"auth_token": store.promote(e, bundle, now), "student_bundle": bundle, "last_synced_at": now, "mode": bundle["mode"]}
    except LMSError as err:
        return _err(err)
