"""Builds the per-student record the sandbox adapters serve, from the pipeline's cleaned tables (no contact details)."""
from __future__ import annotations

import math


def _num(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) or math.isinf(f) else round(f, 2)


def build(res) -> dict:
    students = res.students.set_index("student_id")
    mentors = {m["id"]: m for m in res.mentors.to_dict("records")} if hasattr(res.mentors, "to_dict") else {}
    acad = res.tables["academic"].set_index("student_id")
    att = res.tables["attendance"].set_index("student_id")
    out: dict[str, dict] = {}
    for sid, s in students.iterrows():
        a = acad.loc[sid] if sid in acad.index else None
        t = att.loc[sid] if sid in att.index else None
        sg = {int(k): _num(v) for k, v in ((a["sgpa"] if a is not None else None) or {}).items()}
        subs = (a["subjects"] if a is not None else None) or []
        sems = []
        for sem in sorted({x["sem"] for x in subs}):
            sems.append({"sem": int(sem), "sgpa": sg.get(sem),
                         "subjects": [{"subject": x["subject"], "internal": _num(x["internal"]), "end_sem": _num(x.get("end_sem")), "total": _num(x["total"])}
                                      for x in subs if x["sem"] == sem]})
        bs = (t["by_subject"] if t is not None else None) or {}
        m = mentors.get(s["mentor_id"])
        out[sid] = {
            "profile": {"student_id": sid, "name": s["name"], "branch": s["branch"], "year": int(s["year"]), "section": s["section"]},
            "cgpa": _num(a["cgpa"]) if a is not None else None, "backlogs": int(a["backlogs"]) if a is not None and not math.isnan(float(a["backlogs"])) else None,
            "semesters": sems,
            "attendance": {"overall": _num(t["overall_pct"]) if t is not None else None, "core": _num(t["core_pct"]) if t is not None else None,
                           "by_month": {k: _num(v) for k, v in ((t["by_month"] if t is not None else None) or {}).items()},
                           "subjects": [{"subject": k, "percent": _num(v)} for k, v in bs.items() if _num(v) is not None]},
            "mentor": {"id": m["id"], "name": m["name"], "department": m["department"]} if m else None,
        }
    return out
