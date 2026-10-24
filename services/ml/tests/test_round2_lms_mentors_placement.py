"""Round 2 backend: LMS adapter engine, mentor availability, placement panel, the four outcomes. Uses the committed stored state
(synthetic cohort) so nothing here depends on a database or the network."""
import base64
import itertools
import logging
import time
from datetime import date, timedelta
from pathlib import Path

import joblib
import pytest
from fastapi.testclient import TestClient

from app import auth, campus, config, service
from app.lms import captcha, registry, session_store as store
from app.lms.base import LMSError
from app.main import app

SECRET = "unit-test-secret-0123456789"
STATE_FILE = Path(__file__).resolve().parents[1] / "artifacts" / "state.joblib"
ROLL = "CU24AIML0039"           # a silent decliner in the frozen cohort
PASSWORD = "ascora-demo"


@pytest.fixture(scope="module")
def state():
    if not STATE_FILE.exists():
        pytest.skip("no stored state")
    s = joblib.load(STATE_FILE)
    if not s.get("lms_index") or not s.get("round2"):
        pytest.skip("stored state predates Round 2; run scripts/publish_demo.py --no-publish")
    return s


@pytest.fixture(autouse=True)
def env(state, monkeypatch, tmp_path):
    for k in ("ask_index", "round2", "lms_index", "campus_mentors", "model_metrics"):
        monkeypatch.setitem(service.STATE, k, state[k])
    monkeypatch.setattr(config, "TOKEN_SECRET", SECRET)
    monkeypatch.setattr(campus, "STORE_FILE", tmp_path / "campus.json")
    store.reset()
    from app import ratelimit
    ratelimit.reset()
    texts = itertools.cycle(["ACEFH", "JKLMN", "PRTUX", "YA2C3", "4E5F6"])
    monkeypatch.setattr(captcha, "new_text", lambda: next(texts))
    yield
    store.reset()


@pytest.fixture
def client():
    return TestClient(app)


def tok(role="admin", **claims):
    return {"Authorization": "Bearer " + auth.sign({"sub": "u1", "role": role, "exp": time.time() + 600, **claims}, SECRET)}


# =============================================================================== LMS adapters
def test_four_adapters_are_discovered_and_described(client):
    ids = set(registry.discover())
    assert ids == {"cu_lko", "cu_mohali", "lpu", "aktu_erp"}
    body = client.get("/lms/universities").json()["universities"]
    by = {u["id"]: u for u in body}
    assert by["aktu_erp"]["requires_captcha"] is False and by["lpu"]["requires_captcha"] is True
    for u in body:                                            # honesty: no adapter claims a live connection
        assert u["mode"] == "demo_sandbox" and u["live_connection"] is False and u["note"]
        assert set(u["supported_modules"]) >= {"profile", "attendance", "marks", "timetable", "fees", "notices", "assignments", "mentor"}


def init(client, uid="cu_lko"):
    r = client.post("/lms/session/init", json={"university_id": uid})
    assert r.status_code == 200, r.text
    return r.json()


def login(client, sid, captcha_text="ACEFH", user=ROLL, pw=PASSWORD, uid="cu_lko", **extra):
    return client.post("/lms/session/login", json={"session_id": sid, "university_id": uid, "username": user, "password": pw, "captcha": captcha_text, **extra})


def test_captcha_is_an_image_without_the_answer_in_the_markup(client):
    j = init(client)
    assert j["requires_captcha"] and j["captcha_image_data_uri"].startswith("data:image/svg+xml;base64,")
    svg = base64.b64decode(j["captcha_image_data_uri"].split(",", 1)[1]).decode()
    assert "<text" not in svg and "ACEFH" not in svg and "<rect" in svg
    assert j["mode"] == "demo_sandbox" and "Never enter a real university password" in j["notice"]


def test_successful_login_returns_a_complete_honest_bundle(client):
    j = init(client)
    r = login(client, j["session_id"])
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["auth_token"] and b["last_synced_at"] and b["consent_notice"] and b["mode"] == "demo_sandbox"
    sb = b["student_bundle"]
    assert sb["live"] is False and sb["university_id"] == "cu_lko"
    assert sb["profile"]["student_id"] == ROLL and sb["profile"]["name"] == "Arjun Gupta"
    assert sb["attendance"]["subjects"] and all("percent" in s for s in sb["attendance"]["subjects"])
    assert sb["marks"]["semesters"] and sb["marks"]["cgpa"] is not None
    assert sb["mentor"]["available"] is True and sb["mentor"]["id"]
    for module in ("timetable", "fees", "notices", "assignments"):     # not in the synthetic data: reported, never invented
        assert sb[module]["available"] is False and sb[module]["reason"]
    assert sb["modules"]["marks"] is True and sb["modules"]["fees"] is False
    assert PASSWORD not in r.text and '"password"' not in r.text          # the value is never echoed and no field carries one


def test_wrong_captcha_is_rejected_and_a_new_one_issued_and_old_text_is_dead(client):
    j = init(client)
    r = login(client, j["session_id"], captcha_text="WRONG")
    assert r.status_code == 400 and r.json()["code"] == "LMS_CAPTCHA_INVALID"
    assert r.json()["captcha_image_data_uri"] and r.json()["captcha_image_data_uri"] != j["captcha_image_data_uri"]
    again = login(client, j["session_id"], captcha_text="ACEFH")          # the first challenge's text, now invalid
    assert again.status_code == 400
    fresh = login(client, j["session_id"], captcha_text="PRTUX")          # third challenge in the patched cycle
    assert fresh.status_code == 200


def test_captcha_is_single_use_even_when_the_password_is_wrong(client):
    j = init(client)
    bad = login(client, j["session_id"], pw="not-the-password")
    assert bad.status_code == 401 and bad.json()["code"] == "LMS_LOGIN_FAILED" and bad.json()["captcha_image_data_uri"]
    assert login(client, j["session_id"], captcha_text="ACEFH").status_code == 400   # the consumed challenge cannot be replayed


def test_refresh_captcha_invalidates_the_old_one(client):
    j = init(client)
    r = client.post("/lms/session/refresh-captcha", json={"session_id": j["session_id"]})
    assert r.status_code == 200 and r.json()["captcha_image_data_uri"] != j["captcha_image_data_uri"]
    assert login(client, j["session_id"], captcha_text="ACEFH").status_code == 400
    assert login(client, j["session_id"], captcha_text="PRTUX").status_code == 200


def test_unknown_roll_and_wrong_password_give_the_same_message(client, monkeypatch):
    monkeypatch.setattr(captcha, "new_text", lambda: "ACEFH")
    a = login(client, init(client)["session_id"], user="CU24ZZZ9999")
    b = login(client, init(client)["session_id"], pw="nope")
    assert a.status_code == b.status_code == 401 and a.json()["message"] == b.json()["message"]


def test_lockout_after_five_failures_blocks_even_correct_credentials(client):
    for i in range(5):
        j = init(client)
        r = login(client, j["session_id"], pw="bad")
    assert r.status_code == 429 and r.json()["code"] == "LMS_LOCKED" and r.headers["Retry-After"].isdigit()
    j = init(client)
    locked = login(client, j["session_id"], captcha_text="ACEFH")
    assert locked.status_code == 429 and "Try again in" in locked.json()["message"]
    store.reset()
    assert login(client, init(client)["session_id"]).status_code != 429          # counters cleared with the store


def test_lockout_is_per_username(client):
    for _ in range(5):
        login(client, init(client)["session_id"], pw="bad")
    other = login(client, init(client)["session_id"], user="CU24AIML0001")
    assert other.status_code != 429


def test_passwords_and_captcha_text_never_reach_the_logs(client, caplog):
    caplog.set_level(logging.DEBUG)
    secret_pw = "S3cretPassw0rd!"
    login(client, init(client)["session_id"], pw=secret_pw, captcha_text="LEAKME")
    j = init(client)
    login(client, j["session_id"])
    text = "\n".join(r.getMessage() for r in caplog.records)
    assert secret_pw not in text and "LEAKME" not in text and PASSWORD not in text


def test_sync_refreshes_and_expiry_requires_reauth(client):
    j = init(client)
    tokenv = login(client, j["session_id"]).json()["auth_token"]
    h = {"Authorization": f"Bearer {tokenv}"}
    s1 = client.post("/lms/session/sync", headers=h)
    assert s1.status_code == 200 and s1.json()["student_bundle"]["profile"]["student_id"] == ROLL
    assert client.post("/lms/session/sync").status_code == 401
    assert client.post("/lms/session/sync", headers={"Authorization": "Bearer nope"}).json() == {"code": "LMS_SESSION_EXPIRED", "requires_reauth": True, "message": "The session has expired. Sign in again."}
    for e in list(store._sessions.values()):
        e.expires = time.time() - 1                                  # simulate the session timing out
    gone = client.post("/lms/session/sync", headers=h)
    assert gone.status_code == 401 and gone.json()["requires_reauth"] is True


def test_logout_destroys_the_session(client):
    tokenv = login(client, init(client)["session_id"]).json()["auth_token"]
    h = {"Authorization": f"Bearer {tokenv}"}
    assert client.post("/lms/session/logout", headers=h).json() == {"ok": True}
    assert client.post("/lms/session/sync", headers=h).status_code == 401
    assert not store._sessions and not store._by_token
    assert client.post("/lms/session/logout", headers=h).status_code == 200      # idempotent


def test_remember_session_issues_an_encrypted_token_without_the_password(client):
    r = login(client, init(client)["session_id"], remember_session=True).json()
    rt = r["renewal_token"]
    assert PASSWORD not in rt and ROLL not in rt
    renewed = client.post("/lms/session/renew", json={"university_id": "cu_lko", "renewal_token": rt})
    assert renewed.status_code == 200 and renewed.json()["student_bundle"]["profile"]["student_id"] == ROLL
    bad = client.post("/lms/session/renew", json={"university_id": "cu_lko", "renewal_token": rt[:-4] + "AAAA"})
    assert bad.status_code == 401 and bad.json()["code"] == "LMS_RENEWAL_INVALID"
    other = client.post("/lms/session/renew", json={"university_id": "lpu", "renewal_token": rt})
    assert other.status_code == 401


def test_no_captcha_adapter_logs_in_directly(client):
    j = init(client, "aktu_erp")
    assert j["requires_captcha"] is False and j["captcha_image_data_uri"] is None
    r = login(client, j["session_id"], uid="aktu_erp", captcha_text=None)
    assert r.status_code == 200 and r.json()["student_bundle"]["university_id"] == "aktu_erp"


@pytest.mark.parametrize("body,code", [({"university_id": "nope"}, 404), ({"university_id": "BAD ID"}, 422), ({}, 422)])
def test_init_validation(client, body, code):
    assert client.post("/lms/session/init", json=body).status_code == code


def test_login_input_is_bounded_and_session_must_match(client):
    j = init(client)
    assert client.post("/lms/session/login", json={"session_id": j["session_id"], "university_id": "cu_lko", "username": "x" * 80, "password": "p", "captcha": "A"}).status_code == 422
    assert login(client, j["session_id"], uid="lpu").status_code == 400
    assert login(client, "x" * 30).status_code == 401


def test_a_failing_module_degrades_without_failing_the_sync(client, monkeypatch):
    a = registry.get("cu_lko")
    monkeypatch.setattr(type(a), "fetch_fees", lambda self, st: (_ for _ in ()).throw(RuntimeError("boom with secret internals")))
    monkeypatch.setattr(type(a), "fetch_marks", lambda self, st: (_ for _ in ()).throw(RuntimeError("boom")))
    sb = login(client, init(client)["session_id"]).json()["student_bundle"]
    assert sb["marks"] == {"available": False, "reason": "this module could not be read"} and "secret internals" not in str(sb)
    assert sb["attendance"]["available"] is True


def test_session_store_is_bounded(client):
    for _ in range(store.MAX_SESSIONS + 50):
        store.create(registry.get("lpu").init_session())
    assert len(store._sessions) <= store.MAX_SESSIONS


# =============================================================================== mentor availability
TODAY = date.today().isoformat()


def a_mentor(state):
    m = state["campus_mentors"][0]
    studs = [s for s in state["ask_index"] if s["mentor_id"] == m["id"]]
    return m["id"], studs[0]["id"]


def free_slot(client, mid, day):
    for h in range(9, 17):
        r = client.post("/mentors/allotments", headers=tok("admin"), json={"mentor_id": mid, "batch_label": "probe", "slot_date": day, "start_time": f"{h:02d}:00", "end_time": f"{h:02d}:30"})
        if r.status_code == 201:
            return h, r
    return None, None


def test_availability_lists_every_mentor_with_a_live_status(client, state):
    r = client.get("/mentors/availability", headers=tok("admin")).json()
    assert len(r["mentors"]) == len(state["campus_mentors"]) == 21
    assert sum(r["counts"].values()) == 21 and {m["status"] for m in r["mentors"]} <= {"ALLOTTED", "FREE", "ON_HOLIDAY"}
    assert client.get("/mentors/availability").status_code == 401


def test_availability_filters(client):
    h = tok("admin")
    allotted = client.get("/mentors/availability", headers=h, params={"status": "allotted"}).json()
    assert all(m["status"] == "ALLOTTED" for m in allotted["mentors"])
    assert client.get("/mentors/availability", headers=h, params={"status": "bogus"}).status_code == 422
    one = client.get("/mentors/availability", headers=h, params={"search": "M03"}).json()["mentors"]
    assert [m["mentor_id"] for m in one] == ["M03"]
    assert client.get("/mentors/availability", headers=h, params={"date": "2026-13-45"}).status_code == 422


def test_double_booking_is_rejected_with_409_and_back_to_back_is_allowed(client, state):
    mid, sid = a_mentor(state)
    day = (date.today() + timedelta(days=20)).isoformat()                 # outside the seeded week: starts empty
    h = tok("admin")
    mk = lambda s, e: client.post("/mentors/allotments", headers=h, json={"mentor_id": mid, "student_id": sid, "slot_date": day, "start_time": s, "end_time": e})
    assert mk("10:00", "11:00").status_code == 201
    r = mk("10:30", "11:30")
    assert r.status_code == 409 and r.json()["detail"] == "Mentor is already allotted during this time slot"
    assert mk("09:00", "10:30").status_code == 409
    assert mk("10:15", "10:45").status_code == 409                          # fully inside
    assert mk("11:00", "12:00").status_code == 201                          # back to back is not an overlap
    assert mk("09:00", "10:00").status_code == 201


def test_allotment_validation(client, state):
    mid, sid = a_mentor(state)
    h = tok("admin")
    day = (date.today() + timedelta(days=21)).isoformat()
    base = {"mentor_id": mid, "student_id": sid, "slot_date": day, "start_time": "10:00", "end_time": "11:00"}
    assert client.post("/mentors/allotments", headers=h, json={**base, "end_time": "10:00"}).status_code == 422
    assert client.post("/mentors/allotments", headers=h, json={**base, "end_time": "16:00"}).status_code == 422          # over 4 hours
    assert client.post("/mentors/allotments", headers=h, json={**base, "start_time": "25:00", "end_time": "26:00"}).status_code == 422
    assert client.post("/mentors/allotments", headers=h, json={**base, "student_id": None}).status_code == 422             # nobody named
    assert client.post("/mentors/allotments", headers=h, json={**base, "mentor_id": "M99"}).status_code == 404
    assert client.post("/mentors/allotments", headers=h, json={**base, "slot_date": "2031-01-01"}).status_code == 422
    assert client.post("/mentors/allotments", json=base).status_code == 401


def test_a_mentor_can_only_book_their_own_time_and_students(client, state):
    mid, sid = a_mentor(state)
    other = next(m["id"] for m in state["campus_mentors"] if m["id"] != mid)
    day = (date.today() + timedelta(days=22)).isoformat()
    body = {"mentor_id": mid, "student_id": sid, "slot_date": day, "start_time": "10:00", "end_time": "11:00"}
    assert client.post("/mentors/allotments", headers=tok("mentor", mid=other), json=body).status_code == 403
    assert client.post("/mentors/allotments", headers=tok("mentor", mid=mid), json=body).status_code == 201
    foreign = next(s["id"] for s in state["ask_index"] if s["mentor_id"] != mid)
    assert client.post("/mentors/allotments", headers=tok("mentor", mid=mid), json={**body, "student_id": foreign, "start_time": "12:00", "end_time": "13:00"}).status_code == 404


def test_holiday_blocks_allotments_and_is_admin_only(client, state):
    mid, sid = a_mentor(state)
    day = date.today() + timedelta(days=30)
    hol = {"mentor_id": mid, "from_date": day.isoformat(), "to_date": (day + timedelta(days=2)).isoformat(), "reason": "Conference"}
    assert client.post("/mentors/holidays", headers=tok("mentor", mid=mid), json=hol).status_code == 403
    assert client.post("/mentors/holidays", headers=tok("admin"), json=hol).status_code == 201
    book = {"mentor_id": mid, "student_id": sid, "slot_date": (day + timedelta(days=1)).isoformat(), "start_time": "10:00", "end_time": "11:00"}
    r = client.post("/mentors/allotments", headers=tok("admin"), json=book)
    assert r.status_code == 409 and r.json()["detail"] == "Mentor is on holiday during the selected date"
    day_view = client.get("/mentors/availability", headers=tok("admin"), params={"date": book["slot_date"], "search": mid}).json()["mentors"][0]
    assert day_view["status"] == "ON_HOLIDAY" and day_view["free_windows"] == [] and day_view["holiday"]["reason"] == "Conference"
    assert client.post("/mentors/holidays", headers=tok("admin"), json={**hol, "from_date": (day + timedelta(days=1)).isoformat()}).status_code == 409   # overlapping holiday
    assert client.post("/mentors/holidays", headers=tok("admin"), json={**hol, "from_date": hol["to_date"], "to_date": hol["from_date"]}).status_code == 422


def test_holiday_cannot_cover_an_existing_allotment(client, state):
    mid, sid = a_mentor(state)
    day = date.today() + timedelta(days=40)
    assert client.post("/mentors/allotments", headers=tok("admin"), json={"mentor_id": mid, "student_id": sid, "slot_date": day.isoformat(), "start_time": "10:00", "end_time": "11:00"}).status_code == 201
    r = client.post("/mentors/holidays", headers=tok("admin"), json={"mentor_id": mid, "from_date": day.isoformat(), "to_date": day.isoformat()})
    assert r.status_code == 409 and "allotment" in r.json()["detail"]
    assert client.post("/mentors/holidays", headers=tok("admin"), json={"mentor_id": mid, "from_date": "2026-12-05", "to_date": "2026-12-01"}).status_code == 422


def test_booked_slot_shows_as_allotted_and_hides_the_student_from_other_mentors(client, state):
    mid, sid = a_mentor(state)
    other = next(m["id"] for m in state["campus_mentors"] if m["id"] != mid)
    day = (date.today() + timedelta(days=23)).isoformat()
    client.post("/mentors/allotments", headers=tok("admin"), json={"mentor_id": mid, "student_id": sid, "slot_date": day, "start_time": "10:00", "end_time": "11:00"})
    q = {"date": day, "search": mid}
    own = client.get("/mentors/availability", headers=tok("mentor", mid=mid), params=q).json()["mentors"][0]
    seen = client.get("/mentors/availability", headers=tok("mentor", mid=other), params=q).json()["mentors"][0]
    assert own["status"] == seen["status"] == "ALLOTTED"
    assert own["slots"][0]["student_id"] == sid and seen["slots"][0]["student_id"] is None
    assert {"start_time": "09:00", "end_time": "10:00"} in own["free_windows"]


def test_schedule_persists_to_disk(client, state):
    mid, sid = a_mentor(state)
    day = (date.today() + timedelta(days=24)).isoformat()
    client.post("/mentors/allotments", headers=tok("admin"), json={"mentor_id": mid, "student_id": sid, "slot_date": day, "start_time": "14:00", "end_time": "15:00"})
    data = campus._load()
    assert any(a["slot_date"] == day and a["mentor_id"] == mid for a in data["allotments"])
    assert not any(a for a in data["allotments"] if a.get("demo_seed") is False)


def test_seeded_week_has_no_overlaps_and_covers_the_current_window(client, state):
    data = campus.load(state, state["ask_index"])
    seen = {}
    for a in data["allotments"]:
        for b in seen.get((a["mentor_id"], a["slot_date"]), []):
            assert not campus.overlaps(campus.to_min(a["start_time"]), campus.to_min(a["end_time"]), campus.to_min(b[0]), campus.to_min(b[1]))
        seen.setdefault((a["mentor_id"], a["slot_date"]), []).append((a["start_time"], a["end_time"]))
    for h in data["holidays"]:
        assert not any(a["mentor_id"] == h["mentor_id"] and h["from_date"] <= a["slot_date"] <= h["to_date"] for a in data["allotments"])
    assert data["seed_week"] == campus.monday(date.today()).isoformat() and data["allotments"] and data["holidays"]


# =============================================================================== placement panel
def test_drives_list_with_status_and_eligibility_counts(client):
    r = client.get("/placement/drives", headers=tok("admin")).json()["drives"]
    assert len(r) == 6 and {d["status"] for d in r} == {"COMPLETED", "SCHEDULED", "UPCOMING"}
    for d in r:
        assert set(d["eligibility"]) == {"min_cgpa", "max_active_backlogs", "allowed_branches", "min_coding_score"} and d["venue_mode"] and d["package_lpa"] > 0
        assert d["eligible_in_scope"] >= 0
    assert [d["status"] for d in client.get("/placement/drives", headers=tok("admin"), params={"status": "completed"}).json()["drives"]] == ["COMPLETED"]
    assert client.get("/placement/drives", headers=tok("admin"), params={"status": "x"}).status_code == 422
    assert client.get("/placement/drives").status_code == 401


def test_per_student_eligibility_matches_the_rules(client, state):
    s = next(x for x in state["ask_index"] if x["intent"] == "placement")
    rows = client.get("/placement/drives", headers=tok("admin"), params={"student_id": s["id"]}).json()["drives"]
    for d in rows:
        ok, _ = campus.eligibility(s, d)
        assert d["student"]["status"] == ("ELIGIBLE" if ok else "NOT_ELIGIBLE")
        assert (not ok) == bool(d["student"]["reasons"])


def test_drive_scheduling_is_admin_only_and_validated(client):
    body = {"company": "Example Works", "role": "Analyst", "package_lpa": 7.2, "exam_at": (date.today() + timedelta(days=5)).isoformat() + "T10:00", "venue_mode": "Online Assessment",
            "min_cgpa": 6.5, "max_active_backlogs": 1, "allowed_branches": ["CSE", "ECE"], "min_coding_score": 40}
    assert client.post("/placement/drives", headers=tok("mentor", mid="M01"), json=body).status_code == 403
    r = client.post("/placement/drives", headers=tok("admin"), json=body)
    assert r.status_code == 201 and r.json()["status"] == "SCHEDULED"
    assert client.post("/placement/drives", headers=tok("admin"), json={**body, "allowed_branches": ["Law"]}).status_code == 422
    assert client.post("/placement/drives", headers=tok("admin"), json={**body, "exam_at": "tomorrow"}).status_code == 422
    assert client.post("/placement/drives", headers=tok("admin"), json={**body, "min_cgpa": 11}).status_code == 422
    assert any(d["company"] == "Example Works" for d in client.get("/placement/drives", headers=tok("admin")).json()["drives"])


def test_application_is_idempotent_and_requires_eligibility(client, state):
    drives = client.get("/placement/drives", headers=tok("admin"), params={"status": "upcoming"}).json()["drives"]
    d = drives[0]
    elig = next(s for s in state["ask_index"] if campus.eligibility(s, d)[0])
    inelig = next(s for s in state["ask_index"] if not campus.eligibility(s, d)[0])
    r1 = client.post(f"/placement/drives/{d['id']}/applications", headers=tok("admin"), json={"student_id": elig["id"]})
    r2 = client.post(f"/placement/drives/{d['id']}/applications", headers=tok("admin"), json={"student_id": elig["id"]})
    assert r1.status_code == r2.status_code == 200 and r1.json()["status"] == "APPLIED"
    assert len([a for a in campus._load()["applications"] if a["student_id"] == elig["id"] and a["drive_id"] == d["id"]]) == 1
    assert client.get("/placement/drives", headers=tok("admin"), params={"student_id": elig["id"]}).json()["drives"][0]["student"]["status"] in ("APPLIED", "ELIGIBLE", "NOT_ELIGIBLE")
    assert client.post(f"/placement/drives/{d['id']}/applications", headers=tok("admin"), json={"student_id": inelig["id"]}).status_code == 409
    assert client.post("/placement/drives/nope/applications", headers=tok("admin"), json={"student_id": elig["id"]}).status_code == 404
    done = client.get("/placement/drives", headers=tok("admin"), params={"status": "completed"}).json()["drives"][0]
    assert client.post(f"/placement/drives/{done['id']}/applications", headers=tok("admin"), json={"student_id": elig["id"]}).status_code == 409


def test_report360_joins_the_sources_and_names_what_is_missing(client, state):
    s = next(x for x in state["ask_index"] if x["intent"] == "placement" and x["placement_risk_level"] != "N/A")
    r = client.get("/placement/report360", headers=tok("admin"), params={"student_id": s["id"]})
    assert r.status_code == 200
    j = r.json()
    assert j["student"]["student_id"] == s["id"] and j["academics"]["cgpa"] == s["metrics"]["cgpa"] and j["academics"]["sgpa_by_semester"]
    assert j["skills"]["coding"] == s["metrics"]["coding"] and j["prediction"]["placement_readiness"]["on_placement_track"] is True
    assert len(j["drives"]) == 6 and all(d["eligibility"] in ("ELIGIBLE", "NOT_ELIGIBLE", "APPLIED") for d in j["drives"])
    assert set(j["unavailable"]) >= {"projects", "resume_url", "exam_history", "offers", "mentor_remarks"}
    assert "email" not in r.text.lower() and "phone" not in r.text.lower()


def test_report360_is_scoped_to_the_mentors_students(client, state):
    mine = next(s for s in state["ask_index"] if s["mentor_id"] == "M03")
    other = next(s for s in state["ask_index"] if s["mentor_id"] != "M03")
    h = tok("mentor", mid="M03")
    assert client.get("/placement/report360", headers=h, params={"student_id": mine["id"]}).status_code == 200
    assert client.get("/placement/report360", headers=h, params={"student_id": other["id"]}).status_code == 404
    assert client.get("/placement/report360", headers=tok("mentor"), params={"student_id": mine["id"]}).status_code == 404     # no scope claim
    assert client.get("/placement/report360", headers=h, params={"student_id": "x"}).status_code == 422


# =============================================================================== the four outcomes
def test_all_four_outcomes_exist_for_every_student(state):
    r2, idx = state["round2"], state["ask_index"]
    assert len(r2) == len(idx) == 1200
    for s in idx:
        o = r2[s["id"]]
        assert set(o) == {"semester", "backlog", "placement_readiness", "engagement_drop"}
        assert o["backlog"]["probability"] == s["academic_risk_prob"]                               # mapped, not recomputed
        if o["semester"] is not None:
            sem = o["semester"]
            assert 0 <= sem["expected_sgpa"] <= 10 and sem["band"] == campus_band(sem["expected_sgpa"])
            assert sem["interval_80"][0] <= sem["expected_sgpa"] <= sem["interval_80"][1]
            assert round(sem["sem_pass_prob"] + s["academic_risk_prob"], 4) == 1.0
        pr = o["placement_readiness"]
        if s["placement_risk_level"] == "N/A":
            assert pr["probability"] is None and pr["on_placement_track"] is False
        else:
            assert pr["probability"] == round(1 - s["placement_risk_prob"], 4)
        ed = o["engagement_drop"]
        assert 0 <= ed["probability"] <= 1 and ed["level"] in ("Low", "Medium", "High")


def campus_band(v):
    from app.models.round2 import band
    return band(v)


def test_every_current_semester_has_an_expected_sgpa(state):
    missing = [sid for sid, o in state["round2"].items() if o["semester"] is None]
    assert len(missing) < 12            # a student with no internal marks on record cannot be predicted: reported as null, not guessed


def test_benchmarks_follow_the_documented_thresholds(state):
    from app.models.round2 import PLACEMENT_BENCHMARKS
    idx = {s["id"]: s for s in state["ask_index"]}
    for sid, o in state["round2"].items():
        b, m = o["placement_readiness"]["benchmarks"], idx[sid]["metrics"]
        if m["coding"] is not None:
            assert b["coding_met"] == (m["coding"] >= PLACEMENT_BENCHMARKS["coding"])
        else:
            assert b["coding_met"] is None


def test_model_metrics_are_real_and_include_the_baseline_comparison(state):
    m = state["model_metrics"]
    sem, eng = m["model_semester"], m["model_engagement"]
    assert sem["mae"] < sem["baseline_last_semester_sgpa"]["mae"] and sem["protocol"].endswith("grouped by student")
    assert 0.5 < eng["roc_auc"] <= 1 and eng["features_use_data_up_to_week"] == 8
    bc = eng["baseline_comparison"]
    assert bc["recall_of_silent_decliners"]["n_silent_decliners"] > 50
    assert bc["recall_of_silent_decliners"]["model"] > bc["recall_of_silent_decliners"]["success_score_threshold"]
    assert bc["oof_roc_auc_model"] > bc["roc_auc_low_success_score"]
    assert 0.5 < m["model_academic"]["roc_auc"] < 1 and 0.5 < m["model_placement"]["roc_auc"] < 1


def test_silent_decliner_is_flagged_for_engagement_drop(state):
    drops = sorted(o["engagement_drop"]["probability"] for o in state["round2"].values())
    assert state["round2"][ROLL]["engagement_drop"]["probability"] > drops[len(drops) // 2]


def test_outcome_endpoints_are_scoped_and_authenticated(client, state):
    mine = next(s for s in state["ask_index"] if s["mentor_id"] == "M03")["id"]
    other = next(s for s in state["ask_index"] if s["mentor_id"] != "M03")["id"]
    assert client.get(f"/outcomes/student/{mine}").status_code == 401
    assert client.get(f"/outcomes/student/{mine}", headers=tok("mentor", mid="M03")).json()["outcomes"]["backlog"]
    assert client.get(f"/outcomes/student/{other}", headers=tok("mentor", mid="M03")).status_code == 404
    assert client.get(f"/outcomes/student/{other}", headers=tok("admin")).status_code == 200
    mm = client.get("/models/metrics", headers=tok("mentor", mid="M03")).json()
    assert mm["synthetic_cohort"] is True and set(mm["metrics"]) == {"model_academic", "model_placement", "model_semester", "model_engagement"}
    assert client.get("/models/metrics").status_code == 401
