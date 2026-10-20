"""How current each source is: the latest date found inside the data itself, never the upload time.

A source whose export carries no dates (the ERP marks sheet, the placement tracker) is reported as such instead of
being given a made-up date. Ages are measured against the run date, so a re-run of old files shows old data as old.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta

# how old a source may be before the dashboard calls it stale (days); attendance and the LMS change weekly
STALE_AFTER = {"attendance_register": 35, "lms_activity_log": 14, "feedback_forms": 60, "clubs_events": 120,
               "skills_assessment": 200}

_MONTHS = {m: i for i, m in enumerate(("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"), 1)}


def _latest(values) -> date | None:
    ds = [v for v in values if isinstance(v, date)]
    return max(ds) if ds else None


def month_sheet_end(sheet: str) -> date | None:
    """'Oct 2026' -> 2026-10-31 (the register covers the whole month)."""
    try:
        mon, year = str(sheet).split()[:2]
        first = date(int(year), _MONTHS[mon[:3].title()], 1)
    except (ValueError, KeyError):
        return None
    return (first.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)


def entry(source: str, as_of: date | None, basis: str, run_date: date) -> dict:
    if as_of is None:
        return {"as_of": None, "basis": basis, "age_days": None, "stale": None}
    age = (run_date - as_of).days
    limit = STALE_AFTER.get(source)
    return {"as_of": as_of.isoformat(), "basis": basis, "age_days": age,
            "stale": None if limit is None else age > limit, "stale_after_days": limit}


def source_freshness(*, attendance_sheets, lms_dates, club_dates, feedback_dates, skills_exported_at: str | None,
                     erp_max_semester, has_placement: bool, run_date: date) -> dict:
    out: dict[str, dict] = {}
    sheets = [(month_sheet_end(s), s) for s in set(attendance_sheets)]
    sheets = [t for t in sheets if t[0]]
    if sheets:
        end, name = max(sheets)
        # a month sheet holds totals with no per-day dates, so only its first day is certain
        out["attendance_register"] = entry("attendance_register", min(end.replace(day=1), run_date),
                                           f"latest month sheet '{name}' (totals for that month, no day-level dates)", run_date)
    else:
        out["attendance_register"] = entry("attendance_register", None, "no month sheets found", run_date)

    lms = _latest(lms_dates)
    # a week that starts on d covers d..d+6; never claim data from the future
    out["lms_activity_log"] = entry("lms_activity_log", min(lms + timedelta(days=6), run_date) if lms else None,
                                    "latest activity week" if lms else "no dated weeks", run_date)
    clubs = _latest(club_dates)
    out["clubs_events"] = entry("clubs_events", clubs, "latest event date" if clubs else "no dated events", run_date)
    fb = _latest(feedback_dates)
    out["feedback_forms"] = entry("feedback_forms", fb, "latest submission" if fb else "no submission dates", run_date)

    exported = None
    if skills_exported_at:
        try:
            exported = datetime.fromisoformat(skills_exported_at).date()
        except ValueError:
            exported = None
    out["skills_assessment"] = entry("skills_assessment", exported,
                                     "vendor export timestamp" if exported else "no export timestamp", run_date)

    sem = f"semester {int(erp_max_semester)}" if erp_max_semester == erp_max_semester and erp_max_semester else "unknown semester"
    out["erp_academics"] = entry("erp_academics", None, f"ERP export has no dates; latest term is {sem}", run_date)
    if has_placement:
        out["placement_cell"] = entry("placement_cell", None, "placement tracker has no dates", run_date)
    return out
