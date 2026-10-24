# LMS adapters: how a university login works in Ascora, and how to add one

Code: `services/ml/app/lms/`. Tests: `services/ml/tests/test_round2_lms_mentors_placement.py`.

## What exists, honestly
- The **engine** is complete: adapter contract, auto-discovery, server-side sessions, single-use captcha, lockout, remember-me (AES-GCM), sync and logout endpoints.
- The four adapters (`cu_lko`, `cu_mohali`, `lpu`, `aktu_erp`) run in **demo sandbox mode**: a university-shaped login in front of Ascora's **synthetic** cohort. A roll number from the cohort plus the published demo password (`ASCORA_SANDBOX_PASSWORD`, default `ascora-demo`) opens that student's records. The captcha is self-hosted and generated locally.
- **No real university portal is contacted.** `live_supported` is `false` for every adapter and `GET /lms/universities` says so (`mode: demo_sandbox`, `live_connection: false`). Logging into a real portal with a student's real credentials needs written authorisation from that university and a connector tested against it; neither exists. Nothing in this service scrapes a portal, solves a captcha for a user, or stores a university password.
- Modules the synthetic cohort does not contain (timetable, fees, notices, assignments) are returned as `{"available": false, "reason": ...}`. Nothing is invented.
- "Any LMS" is therefore a **contract**, not a claim: any system that can supply the normalised modules below can be connected by one adapter file, once its operator authorises it.

## Endpoints (no staff token: students are not staff)
| Route | Purpose |
|---|---|
| `GET /lms/universities` | adapters: `id, name, portal_url (reference only), requires_captcha, supported_modules, mode, live_connection, note` |
| `POST /lms/session/init` `{university_id}` | new session: `{session_id, requires_captcha, captcha_image_data_uri \| null, expires_in_sec, mode, notice}` |
| `POST /lms/session/refresh-captcha` `{session_id}` | new challenge; the old one is dead |
| `POST /lms/session/login` `{session_id, university_id, username, password, captcha?, remember_session?}` | success: `{auth_token, student_bundle, last_synced_at, consent_notice, mode, renewal_token?}` |
| `POST /lms/session/sync` (Bearer `auth_token`) | re-fetch every module; `401 {code:"LMS_SESSION_EXPIRED", requires_reauth:true}` when the session is gone |
| `POST /lms/session/renew` `{university_id, renewal_token}` | new session from a remembered one, no password or captcha |
| `POST /lms/session/logout` (Bearer) | destroys the session; idempotent |

Failures: wrong captcha `400 LMS_CAPTCHA_INVALID`, wrong credentials `401 LMS_LOGIN_FAILED` (same message for an unknown roll number and a wrong password), both with a **brand-new** `captcha_image_data_uri` and `session_id`; lockout `429 LMS_LOCKED` with `Retry-After` and `retry_after_sec` (5 failures per username or 20 per client address in 10 minutes); expired or unknown session `401 LMS_SESSION_EXPIRED`.

## Safety properties (all tested)
- A captcha is single use: a wrong password or wrong captcha consumes it. The captcha text is never stored (only a salted HMAC) and is drawn as pixel blocks, not SVG text.
- Passwords are compared and discarded. They are never stored, logged or returned. Upstream cookies would live in `LMSSessionState.upstream` on the server and are wiped at logout.
- The auth token is stored only as a SHA-256 hash; sessions expire (15 minutes before login, 30 after) and the store is bounded (2,000).
- Remember-me: `renewal_token` is `AES-GCM(roll number, university, expiry)` keyed from `ASCORA_TOKEN_SECRET`; it contains no password and is bound to one university. If `cryptography` or the secret is missing the response says so instead of faking it.
- Limits: the lockout counters key on the client address the service sees. Behind a proxy that address can be shared; the per-username limit is the primary guard.

## The normalised bundle
`student_bundle = {university_id, mode, live, last_synced_at, modules:{name: bool}, profile, attendance, marks, timetable, fees, notices, assignments, mentor}`. Every module is `{available: true, ...}` or `{available: false, reason}`. `attendance`: `overall_percent, core_percent, by_month, subjects[{subject, percent, status}]`. `marks`: `cgpa, active_backlogs, semesters[{sem, sgpa, subjects[{subject, internal(/40), end_sem(/60 or null), total}]}]`.

## Add a university in one file
1. Create `services/ml/app/lms/adapters/<id>.py`:
```python
from ..sandbox import SandboxAdapter

class MyUniversity(SandboxAdapter):
    university_id = "my_uni"            # lowercase letters, digits, underscore
    name = "My University (portal name)"
    portal_url = "https://portal.example.edu"
    requires_captcha = True             # False for single sign-on
```
2. That is all: `registry.discover()` finds it; `/lms/universities` lists it; the tests pick it up. No core change.
3. For a **real** connector, subclass `UniversityLMSAdapter` instead, set `live_supported = True`, implement `init_session / get_captcha / login / fetch_*`, and only after (a) written authorisation from the university, (b) a sandbox or test tenant, (c) contract tests with synthetic fixtures, (d) every outbound URL passed through `app/netguard.check_url`. Never ask a student for a password the university has not agreed to receive through your service; prefer the university's official OAuth or an approved export.

## Frontend notes
Show `notice` and `consent_notice` wherever the login form appears, and the `mode` badge ("Demo sandbox") next to any synced data. Show `last_synced_at`. On a failed login, replace the captcha image with the one in the response. Do not label anything "Connected to <university>" while `mode` is `demo_sandbox`.
