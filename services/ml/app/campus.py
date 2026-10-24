"""Mentor availability (double-booking guard) and the placement panel.

Storage: a small JSON file next to the model state (this service holds no database key). It mirrors migration 0015, which
holds the same shapes in Postgres with an exclusion constraint; the API is the interim source of truth until a data path to
the database is chosen. Everything seeded is flagged `demo_seed` and refers to the synthetic cohort and to fictional companies.
"""
from __future__ import annotations

import json
import os
import random
import threading
import uuid
from datetime import date, datetime, timedelta

from .config import ARTIFACTS

STORE_FILE = ARTIFACTS / "campus_state.json"
_lock = threading.RLock()

WORK_START, WORK_END = 9 * 60, 17 * 60          # working window used to compute free time
DEFAULT_MAX_WEEKLY_HOURS = 12                     # assumption, adjustable per mentor in the database version
BRANCHES = ["CSE", "CSE-AIML", "CSE-Data Science", "ECE", "ME"]
SLOT_STATUSES = ("booked", "cancelled", "done")


class CampusError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status, self.message = status, message


# ------------------------------------------------------------------------------------------- time helpers
def to_min(hhmm: str) -> int:
    try:
        h, m = hhmm.split(":")
        v = int(h) * 60 + int(m)
    except Exception:
        raise CampusError(422, "Times must be HH:MM")
    if not (0 <= v < 24 * 60) or not (0 <= int(m) < 60):
        raise CampusError(422, "Times must be HH:MM")
    return v


def to_hhmm(v: int) -> str:
    return f"{v // 60:02d}:{v % 60:02d}"


def overlaps(a_start: int, a_end: int, b_start: int, b_end: int) -> bool:
    """Half-open intervals [start, end): back-to-back slots do not overlap."""
    return a_start < b_end and b_start < a_end


def parse_date(s: str) -> date:
    try:
        return date.fromisoformat(s)
    except Exception:
        raise CampusError(422, "Dates must be YYYY-MM-DD")


def monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


# ------------------------------------------------------------------------------------------- store
def _blank() -> dict:
    return {"seed_week": None, "allotments": [], "holidays": [], "drives": [], "applications": []}


def _load() -> dict:
    try:
        return json.loads(STORE_FILE.read_text(encoding="utf-8")) if STORE_FILE.exists() else _blank()
    except (OSError, ValueError):
        return _blank()


def _save(data: dict) -> None:
    tmp = STORE_FILE.with_suffix(".tmp")
    try:
        STORE_FILE.parent.mkdir(parents=True, exist_ok=True)
        tmp.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
        os.replace(tmp, STORE_FILE)
    except OSError:
        raise CampusError(503, "The schedule could not be saved. Try again.")


def mentors_from(state: dict) -> dict[str, dict]:
    return {m["id"]: m for m in (state.get("campus_mentors") or [])}


def students_by_mentor(index: list[dict]) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for s in index:
        if s.get("mentor_id"):
            out.setdefault(s["mentor_id"], []).append(s)
    return out


# ------------------------------------------------------------------------------------------- seeding
FICTIONAL = [("Northwind Systems", "Software Engineer", 6.5, 7.0, 0, ["CSE", "CSE-AIML", "CSE-Data Science"], 50),
             ("Contoso Analytics", "Data Analyst", 5.0, 6.5, 1, ["CSE", "CSE-AIML", "CSE-Data Science", "ECE"], 40),
             ("Fabrikam Robotics", "Embedded Engineer", 7.5, 7.0, 0, ["ECE", "ME"], 0),
             ("Adatum Cloud", "Cloud Associate", 8.0, 7.5, 0, ["CSE", "CSE-AIML"], 60),
             ("Tailspin Motors", "Graduate Engineer Trainee", 4.5, 6.0, 2, ["ME", "ECE"], 0),
             ("Litware Learning", "Associate Developer", 5.5, 6.5, 1, BRANCHES, 30)]


def _seed(data: dict, state: dict, index: list[dict], today: date) -> None:
    wk = monday(today)
    data["allotments"] = [a for a in data["allotments"] if not a.get("demo_seed")]
    data["holidays"] = [h for h in data["holidays"] if not h.get("demo_seed")]
    data["drives"] = [d for d in data["drives"] if not d.get("demo_seed")]
    rng = random.Random(wk.isoformat())
    group = students_by_mentor(index)
    for mid in sorted(mentors_from(state)):
        studs = group.get(mid, [])
        for day in range(5):                                   # Monday to Friday of the current week
            d = wk + timedelta(days=day)
            starts = rng.sample(range(9, 16), k=rng.choice([0, 1, 1, 2, 3]))
            for h in starts:
                if not studs:
                    break
                s = rng.choice(studs)
                data["allotments"].append({"id": str(uuid.uuid4()), "mentor_id": mid, "student_id": s["id"], "batch_label": None, "slot_date": d.isoformat(),
                                           "start_time": to_hhmm(h * 60), "end_time": to_hhmm(h * 60 + 60), "purpose": "Mentor meeting", "status": "booked", "demo_seed": True})
    mids = sorted(mentors_from(state))
    for mid in rng.sample(mids, k=min(3, len(mids))):
        start = wk + timedelta(days=rng.choice([2, 3, 4]))
        end = start + timedelta(days=rng.choice([0, 1]))
        data["allotments"] = [a for a in data["allotments"] if not (a["mentor_id"] == mid and start.isoformat() <= a["slot_date"] <= end.isoformat())]
        data["holidays"].append({"id": str(uuid.uuid4()), "mentor_id": mid, "from_date": start.isoformat(), "to_date": end.isoformat(), "reason": "Planned leave", "demo_seed": True})
    for i, (company, role, lpa, cgpa, backlogs, branches, coding) in enumerate(FICTIONAL):
        when = datetime.combine(today + timedelta(days=[-9, 2, 4, 9, 16, 23][i]), datetime.min.time()).replace(hour=10)
        data["drives"].append({"id": f"drive-{wk.isoformat()}-{i + 1}", "company": company, "role": role, "package_lpa": lpa, "exam_at": when.isoformat(timespec="minutes"),
                               "venue_mode": "Online Assessment" if i % 2 == 0 else "Campus Lab 3",
                               "eligibility": {"min_cgpa": cgpa, "max_active_backlogs": backlogs, "allowed_branches": branches, "min_coding_score": coding}, "demo_seed": True})
    data["seed_week"] = wk.isoformat()


def load(state: dict, index: list[dict], today: date | None = None) -> dict:
    today = today or date.today()
    with _lock:
        data = _load()
        if data.get("seed_week") != monday(today).isoformat() and mentors_from(state):
            _seed(data, state, index, today)
            _save(data)
        return data


# ------------------------------------------------------------------------------------------- mentor availability
def _holiday_for(data: dict, mid: str, d: str):
    return next((h for h in data["holidays"] if h["mentor_id"] == mid and h["from_date"] <= d <= h["to_date"]), None)


def mentor_view(data: dict, mentor: dict, d: str, viewer: dict, group: dict[str, list[dict]]) -> dict:
    mid = mentor["id"]
    hol = _holiday_for(data, mid, d)
    slots = sorted((a for a in data["allotments"] if a["mentor_id"] == mid and a["slot_date"] == d and a["status"] != "cancelled"), key=lambda a: a["start_time"])
    can_see = viewer.get("role") == "admin" or viewer.get("mid") == mid
    status = "ON_HOLIDAY" if hol else "ALLOTTED" if slots else "FREE"
    busy = [(to_min(a["start_time"]), to_min(a["end_time"])) for a in slots]
    free, cur = [], WORK_START
    for s, e in sorted(busy):
        if s > cur:
            free.append({"start_time": to_hhmm(cur), "end_time": to_hhmm(s)})
        cur = max(cur, e)
    if cur < WORK_END and not hol:
        free.append({"start_time": to_hhmm(cur), "end_time": to_hhmm(WORK_END)})
    wk = monday(parse_date(d))
    week_min = sum(to_min(a["end_time"]) - to_min(a["start_time"]) for a in data["allotments"]
                   if a["mentor_id"] == mid and a["status"] != "cancelled" and wk.isoformat() <= a["slot_date"] <= (wk + timedelta(days=6)).isoformat())
    return {"mentor_id": mid, "name": mentor["name"], "department": mentor.get("department"), "status": status, "date": d,
            "slots": [{"id": a["id"], "start_time": a["start_time"], "end_time": a["end_time"], "purpose": a["purpose"],
                       "student_id": a["student_id"] if can_see else None, "batch_label": a["batch_label"] if can_see else None,
                       "with": "student or batch (hidden)" if not can_see else None, "demo_seed": bool(a.get("demo_seed"))} for a in slots],
            "free_windows": [] if hol else free,
            "holiday": None if not hol else {"from_date": hol["from_date"], "to_date": hol["to_date"], "reason": hol["reason"]},
            "weekly_hours_booked": round(week_min / 60, 2), "max_weekly_hours": mentor.get("max_weekly_hours", DEFAULT_MAX_WEEKLY_HOURS),
            "max_weekly_hours_is_assumption": "max_weekly_hours" not in mentor, "students_assigned": len(group.get(mid, []))}


def availability(state: dict, index: list[dict], viewer: dict, d: str | None, status: str | None, search: str | None) -> dict:
    d = (parse_date(d) if d else date.today()).isoformat()
    if status and status.upper() not in ("ALLOTTED", "FREE", "ON_HOLIDAY"):
        raise CampusError(422, "status must be ALLOTTED, FREE or ON_HOLIDAY")
    data = load(state, index)
    group = students_by_mentor(index)
    q = (search or "").strip().lower()[:60]
    rows = []
    for m in mentors_from(state).values():
        if q and q not in m["name"].lower() and q not in (m.get("department") or "").lower() and q not in m["id"].lower():
            continue
        v = mentor_view(data, m, d, viewer, group)
        if status and v["status"] != status.upper():
            continue
        rows.append(v)
    rows.sort(key=lambda r: r["mentor_id"])
    counts = {k: sum(1 for r in rows if r["status"] == k) for k in ("ALLOTTED", "FREE", "ON_HOLIDAY")}
    return {"date": d, "counts": counts, "mentors": rows,
            "note": "Demonstration schedule on the synthetic cohort; entries flagged demo_seed were generated, not read from a timetable system."}


def create_allotment(state: dict, index: list[dict], user: dict, p: dict) -> dict:
    mid, d = p["mentor_id"], parse_date(p["slot_date"])
    mentors = mentors_from(state)
    if mid not in mentors:
        raise CampusError(404, "Unknown mentor")
    if user.get("role") != "admin" and user.get("mid") != mid:
        raise CampusError(403, "You can only schedule your own time")
    s, e = to_min(p["start_time"]), to_min(p["end_time"])
    if e <= s:
        raise CampusError(422, "The end time must be after the start time")
    if e - s > 240:
        raise CampusError(422, "A slot can be at most 4 hours")
    if abs((d - date.today()).days) > 90:
        raise CampusError(422, "The date must be within 90 days of today")
    sid = p.get("student_id")
    if not sid and not p.get("batch_label"):
        raise CampusError(422, "Name a student or a batch")
    if sid:
        stu = next((x for x in index if x["id"] == sid), None)
        if stu is None or (user.get("role") != "admin" and stu.get("mentor_id") != mid):
            raise CampusError(404, "Unknown student")           # same answer for "missing" and "not yours"
    with _lock:
        data = load(state, index)
        if _holiday_for(data, mid, d.isoformat()):
            raise CampusError(409, "Mentor is on holiday during the selected date")
        for a in data["allotments"]:
            if a["mentor_id"] == mid and a["slot_date"] == d.isoformat() and a["status"] != "cancelled" and overlaps(s, e, to_min(a["start_time"]), to_min(a["end_time"])):
                raise CampusError(409, "Mentor is already allotted during this time slot")
        rec = {"id": str(uuid.uuid4()), "mentor_id": mid, "student_id": sid, "batch_label": p.get("batch_label"), "slot_date": d.isoformat(),
               "start_time": to_hhmm(s), "end_time": to_hhmm(e), "purpose": (p.get("purpose") or "Mentor meeting")[:120], "status": "booked", "created_by": user.get("sub")}
        data["allotments"].append(rec)
        _save(data)
        return rec


def create_holiday(state: dict, index: list[dict], user: dict, p: dict) -> dict:
    if user.get("role") != "admin":
        raise CampusError(403, "Only administrators can record a mentor holiday")
    mid = p["mentor_id"]
    a, b = parse_date(p["from_date"]), parse_date(p["to_date"])
    if mid not in mentors_from(state):
        raise CampusError(404, "Unknown mentor")
    if b < a:
        raise CampusError(422, "to_date must not be before from_date")
    if (b - a).days > 60:
        raise CampusError(422, "A holiday can be at most 60 days")
    with _lock:
        data = load(state, index)
        for h in data["holidays"]:
            if h["mentor_id"] == mid and not (b.isoformat() < h["from_date"] or a.isoformat() > h["to_date"]):
                raise CampusError(409, "Mentor already has a holiday overlapping these dates")
        clash = [x for x in data["allotments"] if x["mentor_id"] == mid and x["status"] != "cancelled" and a.isoformat() <= x["slot_date"] <= b.isoformat()]
        if clash:
            raise CampusError(409, f"Mentor has {len(clash)} allotment(s) in this range; cancel or move them first")
        rec = {"id": str(uuid.uuid4()), "mentor_id": mid, "from_date": a.isoformat(), "to_date": b.isoformat(), "reason": (p.get("reason") or "Leave")[:120], "created_by": user.get("sub")}
        data["holidays"].append(rec)
        _save(data)
        return rec


# ------------------------------------------------------------------------------------------- placement
def drive_status(d: dict, today: date | None = None) -> str:
    today = today or date.today()
    when = datetime.fromisoformat(d["exam_at"]).date()
    return "COMPLETED" if when < today else "SCHEDULED" if when <= today + timedelta(days=7) else "UPCOMING"


def eligibility(s: dict, d: dict) -> tuple[bool, list[str]]:
    e, m, why = d["eligibility"], s["metrics"], []
    if s["branch"] not in e["allowed_branches"]:
        why.append(f"branch {s['branch']} is not eligible")
    if m.get("cgpa") is None:
        why.append("CGPA is not on record")
    elif m["cgpa"] < e["min_cgpa"]:
        why.append(f"CGPA {m['cgpa']} is below {e['min_cgpa']}")
    if m.get("backlogs") is not None and m["backlogs"] > e["max_active_backlogs"]:
        why.append(f"{int(m['backlogs'])} active backlog(s), maximum {e['max_active_backlogs']}")
    if e["min_coding_score"]:
        if m.get("coding") is None:
            why.append("coding score is not on record")
        elif m["coding"] < e["min_coding_score"]:
            why.append(f"coding score {m['coding']} is below {e['min_coding_score']}")
    return (not why), why


def _app_status(data: dict, drive_id: str, sid: str, ok: bool) -> str:
    if any(a["drive_id"] == drive_id and a["student_id"] == sid for a in data["applications"]):
        return "APPLIED"
    return "ELIGIBLE" if ok else "NOT_ELIGIBLE"


def drives(state: dict, index: list[dict], scoped: list[dict], status: str | None, q: str | None, student_id: str | None) -> dict:
    data = load(state, index)
    st = status.upper() if status else None
    if st and st not in ("UPCOMING", "SCHEDULED", "COMPLETED"):
        raise CampusError(422, "status must be UPCOMING, SCHEDULED or COMPLETED")
    stu = None
    if student_id:
        stu = next((s for s in scoped if s["id"] == student_id), None)
        if stu is None:
            raise CampusError(404, "Unknown student")
    out = []
    for d in sorted(data["drives"], key=lambda x: x["exam_at"]):
        ds = drive_status(d)
        if (st and ds != st) or (q and q.lower()[:60] not in (d["company"] + " " + d["role"]).lower()):
            continue
        row = {**d, "status": ds}
        if stu:
            ok, why = eligibility(stu, d)
            row["student"] = {"student_id": stu["id"], "status": _app_status(data, d["id"], stu["id"], ok), "reasons": why}
        else:
            row["eligible_in_scope"] = sum(1 for s in scoped if s["intent"] == "placement" and eligibility(s, d)[0])
            row["applied_in_scope"] = sum(1 for a in data["applications"] if a["drive_id"] == d["id"] and any(s["id"] == a["student_id"] for s in scoped))
        out.append(row)
    return {"drives": out, "note": "Fictional companies on the synthetic cohort (demo_seed). Eligibility is computed from the stored CGPA, backlogs, branch and coding score."}


def create_drive(user: dict, p: dict, state: dict, index: list[dict]) -> dict:
    if user.get("role") != "admin":
        raise CampusError(403, "Only administrators can schedule a drive")
    try:
        when = datetime.fromisoformat(p["exam_at"])
    except Exception:
        raise CampusError(422, "exam_at must be an ISO date-time")
    bad = [b for b in p["allowed_branches"] if b not in BRANCHES]
    if bad or not p["allowed_branches"]:
        raise CampusError(422, f"allowed_branches must be a non-empty subset of {BRANCHES}")
    with _lock:
        data = load(state, index)
        rec = {"id": f"drive-{uuid.uuid4().hex[:10]}", "company": p["company"].strip(), "role": p["role"].strip(), "package_lpa": float(p["package_lpa"]),
               "exam_at": when.isoformat(timespec="minutes"), "venue_mode": p["venue_mode"].strip(),
               "eligibility": {"min_cgpa": float(p["min_cgpa"]), "max_active_backlogs": int(p["max_active_backlogs"]), "allowed_branches": list(dict.fromkeys(p["allowed_branches"])),
                               "min_coding_score": float(p["min_coding_score"])}, "created_by": user.get("sub")}
        data["drives"].append(rec)
        _save(data)
        return {**rec, "status": drive_status(rec)}


def apply_to_drive(state: dict, index: list[dict], scoped: list[dict], drive_id: str, student_id: str, user: dict) -> dict:
    with _lock:
        data = load(state, index)
        d = next((x for x in data["drives"] if x["id"] == drive_id), None)
        stu = next((s for s in scoped if s["id"] == student_id), None)
        if d is None or stu is None:
            raise CampusError(404, "Unknown drive or student")
        if drive_status(d) == "COMPLETED":
            raise CampusError(409, "This drive has already taken place")
        ok, why = eligibility(stu, d)
        if not ok:
            raise CampusError(409, "Not eligible: " + "; ".join(why))
        if not any(a["drive_id"] == drive_id and a["student_id"] == student_id for a in data["applications"]):
            data["applications"].append({"drive_id": drive_id, "student_id": student_id, "recorded_by": user.get("sub"), "at": datetime.now().isoformat(timespec="seconds")})
            _save(data)
        return {"drive_id": drive_id, "student_id": student_id, "status": "APPLIED"}


def report360(state: dict, index: list[dict], scoped: list[dict], student_id: str, round2: dict, lms: dict) -> dict:
    stu = next((s for s in scoped if s["id"] == student_id), None)
    if stu is None:
        raise CampusError(404, "Unknown student")
    data = load(state, index)
    m = stu["metrics"]
    matrix = []
    for d in sorted(data["drives"], key=lambda x: x["exam_at"]):
        ok, why = eligibility(stu, d)
        matrix.append({"drive_id": d["id"], "company": d["company"], "role": d["role"], "exam_at": d["exam_at"], "status": drive_status(d),
                       "eligibility": _app_status(data, d["id"], stu["id"], ok), "reasons": why})
    r2 = (round2 or {}).get(student_id) or {}
    rec = (lms or {}).get(student_id) or {}
    return {
        "student": {"student_id": stu["id"], "name": stu["name"], "branch": stu["branch"], "year": stu["year"], "section": stu["section"], "intent": stu["intent"], "mentor": stu.get("mentor_name")},
        "academics": {"cgpa": m.get("cgpa"), "active_backlogs": m.get("backlogs"), "attendance_overall": m.get("att_overall"), "sgpa_by_semester": {str(s["sem"]): s["sgpa"] for s in rec.get("semesters", []) if s["sgpa"] is not None}},
        "skills": {"aptitude": m.get("aptitude"), "coding": m.get("coding"), "mock_interviews": m.get("mocks"), "soft_skills": m.get("soft_avg"), "technical_skills": m.get("tech_avg"),
                   "placement_readiness_score": (stu.get("components") or {}).get("placement")},
        "prediction": {"placement_risk": {"probability": stu["placement_risk_prob"], "level": stu["placement_risk_level"]}, "placement_readiness": r2.get("placement_readiness"),
                       "drivers": [d["text"] for d in stu["shap_placement"][:3]]},
        "drives": matrix,
        "unavailable": {"projects": "not recorded in the synthetic cohort", "resume_url": "not recorded", "certifications_detail": "only a count exists in the source data",
                        "exam_history": "no placement assessment results are recorded", "offers": "no offers are recorded", "mentor_remarks": "kept with interventions in the web database, not in this service"},
        "note": "Synthetic demonstration cohort. Eligibility rules are the drive's own; nothing here is an offer or a guarantee.",
    }
