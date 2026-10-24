"""Compact, privacy-minimal per-student index that Ask Ascora answers from.

Built from the pipeline payload at the end of a run and stored with the model state, so the ML service can ground an
answer in the same stored predictions and TreeSHAP attributions the dashboard shows, without any database access
(this service never holds a database key). Contains no email, phone or fairness-only attribute."""
from __future__ import annotations

import math

KEEP_DRIVERS = 5


def _num(v):
    if v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) or math.isinf(f) else f


def _drivers(shap) -> list[dict]:
    """Strongest risk-RAISING attributions, as stored with the score (None when the model produced none)."""
    if not isinstance(shap, dict):
        return []
    out = []
    for d in (shap.get("raises") or [])[:KEEP_DRIVERS]:
        out.append({"feature": d.get("feature"), "label": d.get("label"), "value_text": d.get("value_text"),
                    "median_text": d.get("median_text"), "impact": _num(d.get("impact")), "actionable": bool(d.get("actionable")),
                    "text": d.get("text")})
    return out


def build(payload: dict) -> list[dict]:
    students = {s["id"]: s for s in payload.get("students", [])}
    mentors = {m["id"]: m for m in payload.get("mentors", [])}
    out = []
    for r in payload.get("student_scores", []):
        s = students.get(r["student_id"])
        if s is None:
            continue
        m = r.get("metrics") or {}
        mentor = mentors.get(s.get("mentor_id")) or {}
        out.append({
            "id": r["student_id"], "name": s.get("name"), "branch": s.get("branch"), "year": s.get("year"),
            "section": s.get("section"), "mentor_id": s.get("mentor_id"), "mentor_name": mentor.get("name"),
            "intent": r.get("intent"), "persona": r.get("persona"), "segment_id": r.get("segment_id"),
            "success_score": _num(r.get("success_score")), "components": r.get("components") or {},
            "academic_risk_prob": _num(r.get("academic_risk_prob")), "academic_risk_level": r.get("academic_risk_level"),
            "placement_risk_prob": _num(r.get("placement_risk_prob")), "placement_risk_level": r.get("placement_risk_level"),
            "priority": _num(r.get("priority")),
            "alerts": [{"type": a.get("type"), "severity": a.get("severity")} for a in (r.get("alerts") or [])],
            "metrics": {k: _num(m.get(k)) for k in ("cgpa", "backlogs", "att_overall", "att_core", "completion_rate", "login_freq",
                                                     "mocks", "aptitude", "coding", "soft_avg", "tech_avg")},
            "readiness": _num((r.get("readiness") or {}).get("score")),
            "shap_academic": _drivers(r.get("shap_academic")), "shap_placement": _drivers(r.get("shap_placement")),
        })
    return out
