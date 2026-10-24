"""The contract every university adapter implements, and the normalised records the rest of Ascora consumes.

Adding a university means adding one adapter file under `adapters/` (see docs/LMS_ADAPTERS.md). Nothing else changes.

Honesty rules baked into the contract:
  * `mode` is always reported: "demo_sandbox" (Ascora's synthetic cohort behind a university-shaped login) or "live".
  * A module that the source cannot provide is returned as `available: false` with a reason, never as made-up rows.
  * `live` mode is only ever enabled by an adapter that has written institutional authorisation and a tested connector."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

MODULES = ("profile", "attendance", "marks", "timetable", "fees", "notices", "assignments", "mentor")


class LMSError(Exception):
    """Raised by adapters; `code` is returned to the client, `status` is the HTTP status."""

    def __init__(self, code: str, message: str, status: int = 400):
        super().__init__(message)
        self.code, self.message, self.status = code, message, status


@dataclass
class LMSSessionState:
    """Server-side state of one login attempt. Upstream cookies live in `upstream` and never leave the server."""
    university_id: str
    captcha_digest: str | None = None
    captcha_salt: bytes = b""
    captcha_used: bool = False
    upstream: dict = field(default_factory=dict)
    student_key: str | None = None


@dataclass
class CaptchaPayload:
    image_data_uri: str
    expires_in_sec: int


@dataclass
class AuthResult:
    ok: bool
    student_key: str | None = None
    message: str = ""


class UniversityLMSAdapter(ABC):
    university_id: str
    name: str
    portal_url: str                  # reference only: this service does not contact it unless `live_supported` is true
    requires_captcha: bool
    live_supported: bool = False
    live_note: str = "Live login needs written authorisation from the university and a tested connector. Not attempted."
    supported_modules: tuple[str, ...] = MODULES

    def describe(self) -> dict:
        return {"id": self.university_id, "name": self.name, "portal_url": self.portal_url, "requires_captcha": self.requires_captcha,
                "supported_modules": list(self.supported_modules), "mode": "live" if self.live_supported else "demo_sandbox",
                "live_connection": self.live_supported, "note": None if self.live_supported else self.live_note}

    @abstractmethod
    def init_session(self) -> LMSSessionState: ...

    @abstractmethod
    def get_captcha(self, state: LMSSessionState) -> CaptchaPayload | None: ...

    @abstractmethod
    def login(self, state: LMSSessionState, username: str, password: str, captcha_text: str | None) -> AuthResult: ...

    @abstractmethod
    def fetch_profile(self, state: LMSSessionState) -> dict: ...
    @abstractmethod
    def fetch_attendance(self, state: LMSSessionState) -> dict: ...
    @abstractmethod
    def fetch_marks(self, state: LMSSessionState) -> dict: ...
    @abstractmethod
    def fetch_timetable(self, state: LMSSessionState) -> dict: ...
    @abstractmethod
    def fetch_fees(self, state: LMSSessionState) -> dict: ...
    @abstractmethod
    def fetch_notices(self, state: LMSSessionState) -> dict: ...
    @abstractmethod
    def fetch_assignments(self, state: LMSSessionState) -> dict: ...
    @abstractmethod
    def fetch_mentor(self, state: LMSSessionState) -> dict: ...

    def sync_all(self, state: LMSSessionState, now_iso: str) -> dict:
        """Every module is fetched independently; one failing module degrades to `available: false`, not an error."""
        steps = {"profile": self.fetch_profile, "attendance": self.fetch_attendance, "marks": self.fetch_marks, "timetable": self.fetch_timetable,
                 "fees": self.fetch_fees, "notices": self.fetch_notices, "assignments": self.fetch_assignments, "mentor": self.fetch_mentor}
        out: dict = {"university_id": self.university_id, "mode": "live" if self.live_supported else "demo_sandbox",
                     "live": self.live_supported, "last_synced_at": now_iso, "modules": {}}
        for name, fn in steps.items():
            if name not in self.supported_modules:
                out[name] = {"available": False, "reason": "not offered by this adapter"}
            else:
                try:
                    out[name] = fn(state)
                except LMSError:
                    raise
                except Exception:   # a broken module must not take the whole sync down; the reason is generic, never the exception text
                    out[name] = {"available": False, "reason": "this module could not be read"}
            out["modules"][name] = bool(out[name].get("available", True))
        return out
