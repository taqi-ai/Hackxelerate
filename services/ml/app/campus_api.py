"""Mentor availability, placement panel and Round 2 outcome endpoints. All require a signed staff token; every student list is
scoped by the token exactly like Ask Ascora (admin: institution, mentor: own students via the `mid` claim)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from . import campus, service
from .auth import current_user, require_admin
from .insights.ask_grounded import scope_students
from .ratelimit import limited

router = APIRouter(tags=["campus"])
MAX_ALLOTMENTS, MAX_HOLIDAYS, MAX_DRIVES = 5000, 500, 200


def _call(fn, *a, **k):
    try:
        return fn(*a, **k)
    except campus.CampusError as e:
        raise HTTPException(e.status, e.message)


def _state() -> tuple[dict, list[dict]]:
    return service.STATE, service.STATE.get("ask_index") or []


class AllotmentBody(BaseModel):
    mentor_id: str = Field(..., pattern=r"^M\d{2,3}$")
    student_id: str | None = Field(None, pattern=r"^CU\d{2}[A-Z]{2,4}\d{4}$")
    batch_label: str | None = Field(None, min_length=2, max_length=60)
    slot_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    purpose: str | None = Field(None, max_length=120)


class HolidayBody(BaseModel):
    mentor_id: str = Field(..., pattern=r"^M\d{2,3}$")
    from_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    to_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    reason: str | None = Field(None, max_length=120)


class DriveBody(BaseModel):
    company: str = Field(..., min_length=2, max_length=80)
    role: str = Field(..., min_length=2, max_length=80)
    package_lpa: float = Field(..., ge=0, le=200)
    exam_at: str = Field(..., min_length=10, max_length=25)
    venue_mode: str = Field(..., min_length=2, max_length=60)
    min_cgpa: float = Field(0, ge=0, le=10)
    max_active_backlogs: int = Field(0, ge=0, le=20)
    allowed_branches: list[str] = Field(..., min_length=1, max_length=5)
    min_coding_score: float = Field(0, ge=0, le=100)


class ApplyBody(BaseModel):
    student_id: str = Field(..., pattern=r"^CU\d{2}[A-Z]{2,4}\d{4}$")


@router.get("/mentors/availability", dependencies=[Depends(limited("campus"))])
def mentors_availability(date: str | None = None, status: str | None = None, search: str | None = None, user: dict = Depends(current_user)):
    st, idx = _state()
    return _call(campus.availability, st, idx, user, date, status, search)


@router.post("/mentors/allotments", dependencies=[Depends(limited("campus"))], status_code=201)
def post_allotment(body: AllotmentBody, user: dict = Depends(current_user)):
    st, idx = _state()
    if len(campus.load(st, idx)["allotments"]) >= MAX_ALLOTMENTS:
        raise HTTPException(503, "The schedule is full; ask an administrator to clear old entries")
    return _call(campus.create_allotment, st, idx, user, body.model_dump())


@router.post("/mentors/holidays", dependencies=[Depends(limited("campus"))], status_code=201)
def post_holiday(body: HolidayBody, user: dict = Depends(require_admin)):
    st, idx = _state()
    if len(campus.load(st, idx)["holidays"]) >= MAX_HOLIDAYS:
        raise HTTPException(503, "Too many holiday records")
    return _call(campus.create_holiday, st, idx, user, body.model_dump())


@router.get("/placement/drives", dependencies=[Depends(limited("campus"))])
def placement_drives(status: str | None = None, q: str | None = None, student_id: str | None = None, user: dict = Depends(current_user)):
    st, idx = _state()
    scoped, _ = scope_students(idx, user)
    return _call(campus.drives, st, idx, scoped, status, q, student_id)


@router.post("/placement/drives", dependencies=[Depends(limited("campus"))], status_code=201)
def post_drive(body: DriveBody, user: dict = Depends(require_admin)):
    st, idx = _state()
    if len(campus.load(st, idx)["drives"]) >= MAX_DRIVES:
        raise HTTPException(503, "Too many drives recorded")
    return _call(campus.create_drive, user, body.model_dump(), st, idx)


@router.post("/placement/drives/{drive_id}/applications", dependencies=[Depends(limited("campus"))])
def post_application(drive_id: str, body: ApplyBody, user: dict = Depends(current_user)):
    st, idx = _state()
    scoped, _ = scope_students(idx, user)
    return _call(campus.apply_to_drive, st, idx, scoped, drive_id, body.student_id, user)


@router.get("/placement/report360", dependencies=[Depends(limited("campus"))])
def placement_report(student_id: str, user: dict = Depends(current_user)):
    st, idx = _state()
    if not (student_id.startswith("CU") and 8 <= len(student_id) <= 16):
        raise HTTPException(422, "Invalid student id")
    scoped, _ = scope_students(idx, user)
    return _call(campus.report360, st, idx, scoped, student_id, st.get("round2") or {}, st.get("lms_index") or {})


@router.get("/models/metrics", dependencies=[Depends(limited("campus"))])
def models_metrics(user: dict = Depends(current_user)):
    m = service.STATE.get("model_metrics")
    if not m:
        raise HTTPException(503, "Model metrics are not loaded; run the pipeline once")
    return {"synthetic_cohort": True, "metrics": m,
            "note": "Measured on the synthetic cohort; the outcome labels come from the generator. Not evidence of accuracy at a real college."}


@router.get("/outcomes/student/{student_id}", dependencies=[Depends(limited("campus"))])
def outcomes_student(student_id: str, user: dict = Depends(current_user)):
    idx = service.STATE.get("ask_index") or []
    scoped, _ = scope_students(idx, user)
    if not any(s["id"] == student_id for s in scoped):
        raise HTTPException(404, "Unknown student")
    r2 = (service.STATE.get("round2") or {}).get(student_id)
    if r2 is None:
        raise HTTPException(404, "No Round 2 outcomes stored for this student")
    return {"student_id": student_id, "outcomes": r2, "synthetic_cohort": True}
