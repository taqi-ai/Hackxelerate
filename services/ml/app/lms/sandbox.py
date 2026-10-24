"""Demo-sandbox base adapter: a university-shaped login in front of Ascora's synthetic cohort.

It is NOT a connection to any real university. A roll number from the synthetic cohort plus the published demo password
(env ASCORA_SANDBOX_PASSWORD, default "ascora-demo") opens that student's records as they exist in Ascora; modules the
synthetic data does not contain are reported as unavailable instead of being invented. A real adapter overrides
`live_supported` and the fetch methods; the contract and everything above it stay identical."""
from __future__ import annotations

import hmac
import os
import secrets

from . import captcha
from .base import AuthResult, CaptchaPayload, LMSError, LMSSessionState, UniversityLMSAdapter

CAPTCHA_TTL_SEC = 300
LOW_ATTENDANCE = 75.0


def sandbox_password() -> str:
    return os.getenv("ASCORA_SANDBOX_PASSWORD", "ascora-demo")


def _index() -> dict:
    from .. import service   # late import: the index lives with the model state
    return service.STATE.get("lms_index") or {}


def get_index() -> dict:
    return _index()


class SandboxAdapter(UniversityLMSAdapter):
    live_supported = False

    # ---- session / auth
    def init_session(self) -> LMSSessionState:
        return LMSSessionState(university_id=self.university_id)

    def get_captcha(self, state: LMSSessionState) -> CaptchaPayload | None:
        if not self.requires_captcha:
            return None
        text = captcha.new_text()
        state.captcha_salt = secrets.token_bytes(16)
        state.captcha_digest = captcha.digest(text, state.captcha_salt)   # the text itself is never stored
        state.captcha_used = False
        return CaptchaPayload(captcha.render(text), CAPTCHA_TTL_SEC)

    def login(self, state: LMSSessionState, username: str, password: str, captcha_text: str | None) -> AuthResult:
        if self.requires_captcha:
            ok = (state.captcha_digest is not None and not state.captcha_used and captcha.matches(captcha_text or "", state.captcha_salt, state.captcha_digest))
            state.captcha_used = True                                       # single use, right or wrong
            state.captcha_digest = None
            if not ok:
                return AuthResult(False, None, "The captcha was wrong or expired. A new one has been issued.")
        key = (username or "").strip().upper()
        index = get_index()
        known = key in index
        good_pw = hmac.compare_digest((password or "").encode(), sandbox_password().encode())
        if not (known and good_pw):                                          # one message for both: no account enumeration
            return AuthResult(False, None, "Invalid roll number or password.")
        state.student_key = key
        return AuthResult(True, key, "")

    # ---- modules
    def _rec(self, state: LMSSessionState) -> dict:
        rec = get_index().get(state.student_key or "")
        if rec is None:
            raise LMSError("LMS_SESSION_EXPIRED", "The session is no longer valid.", 401)
        return rec

    def fetch_profile(self, state):
        p = self._rec(state)["profile"]
        return {"available": True, **p, "source": "Ascora synthetic demonstration cohort"}

    def fetch_attendance(self, state):
        r = self._rec(state)
        subs = [{"subject": s["subject"], "percent": s["percent"], "status": "below 75%" if s["percent"] < LOW_ATTENDANCE else "ok"} for s in r["attendance"]["subjects"]]
        return {"available": True, "overall_percent": r["attendance"]["overall"], "core_percent": r["attendance"]["core"], "by_month": r["attendance"]["by_month"], "subjects": subs}

    def fetch_marks(self, state):
        r = self._rec(state)
        return {"available": True, "cgpa": r["cgpa"], "active_backlogs": r["backlogs"], "semesters": r["semesters"],
                "scale": "internal out of 40, end semester out of 60; end semester is empty for the running semester"}

    def _absent(self, what: str) -> dict:
        return {"available": False, "reason": f"The synthetic demonstration cohort has no {what}; nothing is invented."}

    def fetch_timetable(self, state):
        return self._absent("timetable data")

    def fetch_fees(self, state):
        return self._absent("fee data")

    def fetch_notices(self, state):
        return self._absent("notice data")

    def fetch_assignments(self, state):
        return self._absent("per-assignment data (only weekly submission counts exist)")

    def fetch_mentor(self, state):
        r = self._rec(state)
        m = r["mentor"]
        return {"available": bool(m), **(m or {})} if m else {"available": False, "reason": "no mentor is assigned"}
