"""Evidence-grounded Ask Ascora.

Pipeline: question -> validated Query (LLM proposal or deterministic rules; never SQL) -> intent (rules only, the model
cannot choose it) -> filter the caller's students from the stored index -> aggregates, stored predictions, stored
TreeSHAP attributions -> playbook-based recommendation -> answer text built from the numbers. Nothing is written
anywhere, and a recommendation is never reported as dispatched.

Scope: admins see the whole institution this service serves; mentors see only students whose mentor_id equals the
`mid` claim in their signed token. A mentor token without `mid` sees nothing (fail closed)."""
from __future__ import annotations

import re
from collections import Counter, defaultdict

from ..config import CURRENT_WEEK, RISK_THRESHOLDS
from .ask import Query, llm_parse, rule_parse
from .llm import provider

CONTRACT = "ask-grounded/1"
ROSTER_MAX = 50
DRIVER_STUDENTS_MAX = 10
GOOD_CGPA_DEFAULT = 7.5          # "good CGPA" when the question names no number
LOW_READINESS_DEFAULT = 40.0     # "low employability" = placement-readiness component at or below this (0-100 cohort percentile)
ID_RE = re.compile(r"\bCU\d{2}[A-Z]{2,4}\d{4}\b")
DEPARTMENTS = {"CSE": ["CSE", "CSE-AIML", "CSE-Data Science"], "ECE": ["ECE"], "ME": ["ME"]}

# driver feature -> (existing intervention type, owner role). Same mapping the app already uses for suggestions.
PLAYBOOK = {
    "mocks": ("mock_interview", "Training and Placement Cell"), "mock_rating": ("mock_interview", "Training and Placement Cell"),
    "aptitude": ("mock_interview", "Training and Placement Cell"), "coding": ("mock_interview", "Training and Placement Cell"),
    "soft_avg": ("skill_workshop", "Training and Placement Cell"), "communication": ("skill_workshop", "Training and Placement Cell"),
    "tech_avg": ("skill_workshop", "Training and Placement Cell"), "certifications": ("skill_workshop", "Training and Placement Cell"),
    "hackathons": ("skill_workshop", "Training and Placement Cell"),
    "cur_internal_pct": ("peer_tutoring", "Faculty Mentor"), "internal_delta": ("peer_tutoring", "Faculty Mentor"),
    "gatekeeper_pct": ("peer_tutoring", "Faculty Mentor"), "backlogs": ("peer_tutoring", "Faculty Mentor"),
    "cgpa": ("peer_tutoring", "Faculty Mentor"), "sgpa_slope": ("peer_tutoring", "Faculty Mentor"),
}
DEFAULT_PLAY = ("mentor_meeting", "Faculty Mentor")
NOT_DRIVERS = {"year", "cs_family"}   # structural attributes: never recommend an action on them
ACTION_TEXT = {
    "mock_interview": "Schedule a mock-interview series and a coding/aptitude practice plan",
    "skill_workshop": "Enrol in a communication and technical skill workshop",
    "peer_tutoring": "Arrange peer tutoring in the weakest subjects and review the backlog plan",
    "mentor_meeting": "Hold a mentor check-in this week to review attendance, LMS activity and workload",
    "counselling_referral": "Offer a counselling conversation (with the student's consent)",
}


# ------------------------------------------------------------------------------------------- scope

def scope_students(index: list[dict], user: dict) -> tuple[list[dict], dict]:
    role = user.get("role")
    if role == "admin":
        return index, {"role": "admin", "scope": "institution", "available": True}
    if role == "mentor":
        mid = user.get("mid")
        if not mid:
            return [], {"role": "mentor", "scope": "mentor", "available": False}
        return [s for s in index if s.get("mentor_id") == mid], {"role": "mentor", "scope": "mentor", "available": True}
    return [], {"role": str(role), "scope": "none", "available": False}


# ------------------------------------------------------------------------------------------- intent and filters

def detect_intent(question: str, ids: list[str], has_filters: bool) -> str:
    t = question.lower()
    dept_words = ("department", "dept", "branch")
    if ids:
        return "student_lookup"
    if ("intervention" in t or "prioriti" in t or "what should we do" in t or "what action" in t) and (
            any(w in t for w in dept_words) or any(k in t for k in ("cse", "ece", "mechanical", "computer science"))):
        return "department_intervention"
    if "cgpa" in t and any(w in t for w in ("employab", "readiness", "placement-ready", "placement ready")):
        return "cgpa_vs_employability"
    if any(w in t for w in ("factor", "driv", "why", "reason", "cause")) and any(w in t for w in ("placement", "readiness", "employab")):
        return "placement_drivers"
    if any(w in t for w in ("at risk", "at-risk", "most risk", "struggl", "failing", "high risk", "risk")):
        return "at_risk_students"
    if has_filters:
        return "student_filter"
    return "unrecognised"


def _department_branches(question: str) -> list[str]:
    t = f" {question.lower()} "
    if "cse" in t or "computer science" in t:
        return DEPARTMENTS["CSE"]
    if " ece" in t or "electronics" in t:
        return DEPARTMENTS["ECE"]
    if " me " in t or "mechanical" in t:
        return DEPARTMENTS["ME"]
    return []


def plan_filters(question: str, q: Query, intent: str) -> tuple[Query, dict]:
    """Intent-specific defaults on top of the parsed filter. Returns the query and the extra (non-schema) conditions."""
    f = q.filters
    extra: dict = {}
    if intent == "student_lookup":
        q.filters = f = type(f)()      # the named student is the whole condition; stray words must not add filters
    elif intent == "at_risk_students" and not (f.academic_risk or f.placement_risk):
        f.academic_risk = ["High"]
        q.sort_by = "academic_risk_prob"
    elif intent == "placement_drivers":
        f.placement_risk = f.placement_risk or ["Medium", "High"]
        f.intent = f.intent or ["placement"]
        q.sort_by = "placement_risk_prob"
    elif intent == "cgpa_vs_employability":
        f.cgpa_min = f.cgpa_min if f.cgpa_min is not None else GOOD_CGPA_DEFAULT
        f.readiness_max = f.readiness_max if f.readiness_max is not None else LOW_READINESS_DEFAULT
        q.sort_by = "cgpa"
    elif intent == "department_intervention":
        br = _department_branches(question) or f.branch
        f.branch = br or None
        extra["any_risk"] = ["Medium", "High"]
        q.sort_by = "priority"
    q.limit = min(q.limit, ROSTER_MAX)
    return q, extra


def _applied(f, extra: dict) -> dict:
    d = {k: v for k, v in f.model_dump().items() if v not in (None, [], {})}
    if extra:
        d["any_risk_level"] = extra["any_risk"] if "any_risk" in extra else None
        d = {k: v for k, v in d.items() if v is not None}
    return d


def matches(s: dict, f, extra: dict, ids: list[str]) -> bool:
    if ids and s["id"] not in ids:
        return False
    m = s["metrics"]
    if f.branch and s["branch"] not in f.branch:
        return False
    if f.year and s["year"] not in f.year:
        return False
    if f.section and s["section"] not in f.section:
        return False
    if f.academic_risk and s["academic_risk_level"] not in f.academic_risk:
        return False
    if f.placement_risk and s["placement_risk_level"] not in f.placement_risk:
        return False
    if f.persona and s["persona"] not in f.persona:
        return False
    if f.intent and s["intent"] not in f.intent:
        return False
    if f.alert and not any(a["type"] in f.alert for a in s["alerts"]):
        return False
    if f.score_min is not None and (s["success_score"] is None or s["success_score"] < f.score_min):
        return False
    if f.score_max is not None and (s["success_score"] is None or s["success_score"] > f.score_max):
        return False
    if f.cgpa_min is not None and (m.get("cgpa") is None or m["cgpa"] < f.cgpa_min):
        return False
    if f.cgpa_max is not None and (m.get("cgpa") is None or m["cgpa"] >= f.cgpa_max):
        return False
    if f.attendance_max is not None and (m.get("att_core") is None or m["att_core"] >= f.attendance_max):
        return False
    if f.attendance_min is not None and (m.get("att_core") is None or m["att_core"] < f.attendance_min):
        return False
    if f.mocks_max is not None and (m.get("mocks") or 0) > f.mocks_max:
        return False
    if f.readiness_max is not None:
        r = (s.get("components") or {}).get("placement")
        if r is None or r > f.readiness_max:   # missing readiness is a data gap, never counted as "low"
            return False
    if extra.get("any_risk") and not (s["academic_risk_level"] in extra["any_risk"] or s["placement_risk_level"] in extra["any_risk"]):
        return False
    return True


# ------------------------------------------------------------------------------------------- aggregates

def pct(p) -> str:
    return "n/a" if p is None else ">99%" if p >= 0.995 else f"{p:.0%}"


def _mean(xs):
    xs = [x for x in xs if x is not None]
    return round(sum(xs) / len(xs), 2) if xs else None


def cohort_summary(rows: list[dict]) -> dict:
    n = len(rows)
    if not n:
        return {"count": 0}
    return {
        "count": n,
        "mean_success_score": _mean(r["success_score"] for r in rows),
        "mean_cgpa": _mean(r["metrics"].get("cgpa") for r in rows),
        "mean_attendance": _mean(r["metrics"].get("att_overall") for r in rows),
        "mean_core_attendance": _mean(r["metrics"].get("att_core") for r in rows),
        "high_risk_share": round(sum(1 for r in rows if r["academic_risk_level"] == "High" or r["placement_risk_level"] == "High") / n, 3),
        "mean_placement_readiness": _mean((r.get("components") or {}).get("placement") for r in rows),
        "academic_risk_levels": dict(Counter(r["academic_risk_level"] for r in rows)),
        "placement_risk_levels": dict(Counter(r["placement_risk_level"] for r in rows)),
        "by_branch": dict(Counter(r["branch"] for r in rows)),
        "top_personas": [{"persona": p, "count": c} for p, c in Counter(r["persona"] for r in rows).most_common(4)],
        "alert_counts": dict(Counter(a["type"] for r in rows for a in r["alerts"]).most_common(5)),
        "with_stored_explanations": sum(1 for r in rows if r["shap_academic"] or r["shap_placement"]),
    }


def top_driver(r: dict, dimension: str) -> dict | None:
    """Strongest stored risk-raising attribution, preferring one a person can act on; None when none is stored."""
    ds = [d for d in r["shap_placement" if dimension == "placement" else "shap_academic"] if d["feature"] not in NOT_DRIVERS and d["impact"]]
    if not ds:
        return None
    d = next((x for x in ds if x["actionable"]), ds[0])
    return {k: d[k] for k in ("feature", "label", "impact", "text", "actionable")}


def roster(rows: list[dict], q: Query, dimension: str = "academic") -> list[dict]:
    key = {"success_score": "success_score", "academic_risk_prob": "academic_risk_prob", "placement_risk_prob": "placement_risk_prob",
           "priority": "priority", "cgpa": None, "att_overall": None}[q.sort_by]
    def val(r):
        v = r["metrics"].get(q.sort_by) if key is None else r.get(key)
        return -1 if v is None else v
    ordered = sorted(rows, key=lambda r: (val(r), r["id"]), reverse=q.sort_dir == "desc")
    out = []
    for r in ordered[: q.limit]:
        td = top_driver(r, dimension)
        itype = PLAYBOOK.get(td["feature"], DEFAULT_PLAY)[0] if td else None
        out.append({
            "student_id": r["id"], "name": r["name"], "branch": r["branch"], "year": r["year"], "section": r["section"],
            "persona": r["persona"], "success_score": r["success_score"], "cgpa": r["metrics"].get("cgpa"),
            "placement_readiness": (r.get("components") or {}).get("placement"),
            "academic_risk": {"probability": r["academic_risk_prob"], "level": r["academic_risk_level"]},
            "placement_risk": None if r["placement_risk_level"] == "N/A" else {"probability": r["placement_risk_prob"], "level": r["placement_risk_level"]},
            "priority": r["priority"], "alerts": [a["type"] for a in r["alerts"]], "mentor": r.get("mentor_name"),
            "attendance": r["metrics"].get("att_overall"), "att_core": r["metrics"].get("att_core"), "backlogs": r["metrics"].get("backlogs"),
            "top_driver": td, "suggested_action": ACTION_TEXT[itype] if itype else None,
        })
    return out


# ------------------------------------------------------------------------------------------- evidence

def driver_evidence(rows: list[dict], dimension: str) -> dict:
    """Cohort-level view of the stored attributions (how many matched students each driver raises risk for, and by how
    much on average), plus per-student detail for the first few. Nothing here is recomputed or invented."""
    key = "shap_academic" if dimension == "academic" else "shap_placement"
    agg: dict[str, dict] = defaultdict(lambda: {"n": 0, "impact": 0.0, "label": None, "actionable": False})
    for r in rows:
        for d in r[key]:
            if d["feature"] in NOT_DRIVERS or d["impact"] is None:
                continue
            a = agg[d["feature"]]
            a["n"] += 1
            a["impact"] += d["impact"]
            a["label"] = d["label"]
            a["actionable"] = a["actionable"] or d["actionable"]
    top = sorted(agg.items(), key=lambda kv: -kv[1]["impact"])[:5]
    return {
        "dimension": dimension,
        "cohort_top_drivers": [{"feature": f, "label": a["label"], "students_affected": a["n"], "mean_impact": round(a["impact"] / a["n"], 3),
                                "total_impact": round(a["impact"], 3), "actionable": a["actionable"]} for f, a in top],
    }


def student_drivers(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows[:DRIVER_STUDENTS_MAX]:
        out.append({"student_id": r["id"],
                    "academic": [{k: d[k] for k in ("feature", "label", "value_text", "median_text", "impact", "actionable", "text")} for d in r["shap_academic"][:3]],
                    "placement": [] if r["placement_risk_level"] == "N/A" else
                    [{k: d[k] for k in ("feature", "label", "value_text", "median_text", "impact", "actionable", "text")} for d in r["shap_placement"][:3]]})
    return out


READINESS_METRICS = {"aptitude": "Aptitude score", "coding": "Coding score", "soft_avg": "Soft skills", "tech_avg": "Technical skills"}


def _median(xs):
    xs = sorted(x for x in xs if x is not None)
    if not xs:
        return None
    m = len(xs) // 2
    return xs[m] if len(xs) % 2 else (xs[m - 1] + xs[m]) / 2


def readiness_gaps(rows: list[dict], pool: list[dict]) -> list[dict]:
    """Measured gaps of the matched students against the institution median (a cohort comparison, not a model attribution)."""
    out = []
    for key, label in READINESS_METRICS.items():
        mine, base = _median(r["metrics"].get(key) for r in rows), _median(r["metrics"].get(key) for r in pool)
        if mine is None or not base:
            continue
        out.append({"feature": key, "label": label, "cohort_median": round(mine, 1), "institution_median": round(base, 1),
                    "relative_gap": round((base - mine) / base, 3)})
    with_mock = [r["metrics"].get("mocks") for r in rows if r["metrics"].get("mocks") is not None]
    if with_mock:
        zero = sum(1 for v in with_mock if v == 0)
        out.append({"feature": "mocks", "label": "Mock interviews attended", "cohort_median": _median(with_mock),
                    "institution_median": _median(r["metrics"].get("mocks") for r in pool), "relative_gap": round(zero / len(with_mock), 3),
                    "note": f"{zero} of {len(with_mock)} students with a placement-cell record have attended none; {len(rows) - len(with_mock)} have no record, which is a data gap and not counted as zero"})
    return sorted(out, key=lambda g: -g["relative_gap"])


def _priority(high_share: float) -> tuple[str, str]:
    if high_share >= 0.40:
        return "P0 Critical", f"{high_share:.0%} of the matched students are High risk on this dimension (rule: P0 at 40% or more)"
    if high_share >= 0.15:
        return "P1 High", f"{high_share:.0%} of the matched students are High risk on this dimension (rule: P1 at 15% to 40%)"
    return "P2 Watch", f"{high_share:.0%} of the matched students are High risk on this dimension (rule: P2 below 15%)"


def recommend(rows: list[dict], drivers_a: dict, drivers_p: dict, intent: str, target: str, gaps: list[dict] | None = None) -> dict | None:
    if not rows:
        return None
    if intent == "cgpa_vs_employability" and gaps:
        top = gaps[0]
        itype, owner = PLAYBOOK.get(top["feature"], DEFAULT_PLAY)
        very_low = sum(1 for r in rows if (r.get("components") or {}).get("placement") is not None and r["components"]["placement"] <= 25)
        pr, pr_reason = _priority(very_low / len(rows))
        return {
            "target": target, "target_count": len(rows), "dimension": "placement",
            "action": ACTION_TEXT[itype], "intervention_type": itype, "driver_feature": top["feature"],
            "reason": (f"Largest measured readiness gap: {top['label']} ({top['note']})" if "note" in top else
                       f"Largest measured readiness gap: {top['label']} (cohort median {top['cohort_median']} against an institution median of {top['institution_median']})")
                      + "; this is a cohort comparison, not a model attribution",
            "owner": owner, "priority": pr, "priority_reason": pr_reason.replace("High risk on this dimension", "at readiness 25 or below"),
            "segment_playbook": {"persona": Counter(r["persona"] for r in rows).most_common(1)[0][0], "note": "Segment playbook text is shown on the Segments page"},
            "workflow": {"system": "Ascora interventions", "how": "Create it from Mission Control or the student profile; the type above is an existing intervention type",
                         "status": "recommended only: nothing has been created or dispatched"},
            "expected_impact": "Unvalidated: no measured recovery lift is available for this recommendation",
        }
    use_placement = intent in ("placement_drivers", "cgpa_vs_employability")
    dim = "placement" if use_placement else "academic"
    chosen = drivers_p if use_placement else drivers_a
    cands = [d for d in chosen["cohort_top_drivers"] if d["actionable"]] or chosen["cohort_top_drivers"]
    persona = Counter(r["persona"] for r in rows).most_common(1)[0][0]
    if cands:
        top = cands[0]
        itype, owner = PLAYBOOK.get(top["feature"], DEFAULT_PLAY)
        reason = f"{top['label']} raises {dim} risk for {top['students_affected']} of {len(rows)} matched students (mean TreeSHAP impact {top['mean_impact']})"
        driver_feature = top["feature"]
    else:
        itype, owner = DEFAULT_PLAY
        reason = "No stored driver explanation is available for these students, so a mentor review is the safe default"
        driver_feature = None
    persona_share = Counter(r["persona"] for r in rows)[persona] / len(rows)
    if persona == "Disengaged" and not use_placement and persona_share >= 0.5:
        itype, owner = "counselling_referral", "Student Counsellor"
        reason += f"; {persona_share:.0%} of them are in the '{persona}' segment (counselling playbook)"
    if dim == "placement":
        high = sum(1 for r in rows if r["placement_risk_level"] == "High")
    else:
        high = sum(1 for r in rows if r["academic_risk_level"] == "High")
    pr, pr_reason = _priority(high / len(rows))
    return {
        "target": target, "target_count": len(rows), "dimension": dim,
        "action": ACTION_TEXT[itype], "intervention_type": itype, "driver_feature": driver_feature, "reason": reason,
        "owner": owner, "priority": pr, "priority_reason": pr_reason,
        "segment_playbook": {"persona": persona, "note": "Segment playbook text is shown on the Segments page"},
        "workflow": {"system": "Ascora interventions", "how": "Create it from Mission Control or the student profile; the type above is an existing intervention type",
                     "status": "recommended only: nothing has been created or dispatched"},
        "expected_impact": "Unvalidated: no measured recovery lift is available for this recommendation",
    }


# ------------------------------------------------------------------------------------------- answer

def _answer(intent: str, n: int, summary: dict, rec: dict | None, d_a: dict, d_p: dict, scope: dict, q: Query, rows: list[dict]) -> str:
    if not scope["available"]:
        return "Your account is not linked to a mentor group, so there are no students to analyse. Ask an administrator."
    if intent == "unrecognised":
        return ("I could not map that question to a supported analysis. Try: 'Which students are most at risk this semester?', "
                "'What factors are driving poor placement readiness?', 'Show me students with good CGPA but low employability', "
                "or 'What intervention should we prioritize for the CSE department?'")
    if n == 0:
        return "No students match those conditions in the data you can access. Try loosening a limit."
    lv = summary["academic_risk_levels"]
    if intent == "at_risk_students":
        top = rows[0]
        return (f"{n} students match (week-{CURRENT_WEEK} snapshot of this synthetic cohort). Academic risk: {lv.get('High', 0)} High, {lv.get('Medium', 0)} Medium. "
                f"Highest probability: {top['name']} ({pct(top['academic_risk_prob'])}). "
                + (f"Suggested first action: {rec['action'].lower()} ({rec['owner']}, {rec['priority']})." if rec else ""))
    if intent == "placement_drivers":
        td = d_p["cohort_top_drivers"][:3]
        names = ", ".join(f"{x['label']} ({x['students_affected']} students)" for x in td) or "no stored explanations"
        return f"{n} placement-track students are at Medium or High placement risk. Strongest drivers in the stored explanations: {names}."
    if intent == "cgpa_vs_employability":
        return (f"{n} students have CGPA at or above {q.filters.cgpa_min} but a placement-readiness score of {q.filters.readiness_max:.0f} or lower "
                f"(mean readiness {summary['mean_placement_readiness']}, mean CGPA {summary['mean_cgpa']}). "
                + (f"Largest measured gap against the institution median: {rec['driver_feature'] and rec['reason'].split(': ',1)[1].split(' (')[0]}." if rec else ""))
    if intent == "department_intervention":
        return (f"{n} students in the selected department are at Medium or High risk. "
                + (f"Recommended priority: {rec['action'].lower()} for {rec['target']} ({rec['owner']}, {rec['priority']}). Reason: {rec['reason']}." if rec else ""))
    if intent == "student_lookup":
        r = rows[0]
        plc = "not on the placement track" if r["placement_risk_level"] == "N/A" else f"{r['placement_risk_level']} ({pct(r['placement_risk_prob'])})"
        return f"{r['name']}: academic risk {r['academic_risk_level']} ({pct(r['academic_risk_prob'])}), placement risk {plc}, segment '{r['persona']}'."
    return f"{n} students match: {q.explanation}."


def limitations(scope: dict, intent: str, summary: dict, n: int, extra_notes: list[str]) -> list[str]:
    out = [
        "All students are a synthetic demonstration cohort; probabilities are calibrated on synthetic outcomes and are unvalidated for real deployment.",
        f"Predictions are a week-{CURRENT_WEEK} snapshot of the semester, not a live feed.",
        "Driver evidence is TreeSHAP attribution of the model's behaviour; it describes what the model used, not what caused an outcome.",
        "Recommendations are suggestions for a human decision. Nothing has been created, assigned or sent.",
    ]
    if not scope["available"]:
        out.append("Your account carries no mentor scope, so no student data was returned.")
    if n and summary.get("with_stored_explanations", 0) < n:
        out.append(f"Stored explanations are missing for {n - summary['with_stored_explanations']} of {n} matched students; they are left out, not estimated.")
    if intent == "cgpa_vs_employability":
        out.append(f"'Good CGPA' defaults to {GOOD_CGPA_DEFAULT} and 'low employability' to a placement-readiness component of {LOW_READINESS_DEFAULT:.0f} or below (aptitude, coding, mock interviews, mock rating); both are adjustable in the question.")
    if intent == "department_intervention":
        out.append("A department means every branch in its family (for example CSE, CSE-AIML and CSE-Data Science); expected impact is unvalidated.")
    out.extend(extra_notes)
    return out


# ------------------------------------------------------------------------------------------- entry point

def answer(question: str, user: dict, index: list[dict] | None) -> dict:
    question = (question or "").strip()
    ids = sorted(set(ID_RE.findall(question.upper())))[:5]
    q = rule_parse(question)
    engine = "rules"
    has_filters = bool({k for k, v in q.filters.model_dump().items() if v not in (None, [])})
    intent = detect_intent(question, ids, has_filters)
    if intent in ("student_filter", "unrecognised"):
        # free-form question: the language model may propose a filter (validated against the closed schema), never an intent
        try:
            proposed = llm_parse(question)
        except Exception:   # any provider failure (outage, rate limit, bad output) falls back to the deterministic parser
            proposed = None
        if proposed is not None and {k for k, v in proposed.filters.model_dump().items() if v not in (None, [])}:
            q, engine, intent = proposed, provider(), "student_filter"
    q, extra = plan_filters(question, q, intent)

    base_out = {"question": question, "engine": engine, "query": q.model_dump(mode="json"), "intent": intent, "contract_version": CONTRACT}
    notes: list[str] = []
    if index is None:
        return {**base_out, "answer": "The analytics service has no stored student index yet. Run the pipeline once to build it.", "applied_filters": _applied(q.filters, extra),
                "matched_count": 0, "cohort_summary": {"count": 0}, "matched_students": [], "prediction_evidence": None,
                "driver_evidence": None, "recommended_intervention": None, "scope": {"available": False},
                "limitations": ["Stored per-student predictions are not loaded in this service, so the answer cannot be grounded."]}
    pool, scope = scope_students(index, user)
    if intent == "unrecognised":
        rows: list[dict] = []
    else:
        rows = [s for s in pool if matches(s, q.filters, extra, ids)]
    summary = cohort_summary(rows)
    dim = "placement" if intent in ("placement_drivers", "cgpa_vs_employability") else "academic"
    ordered_ids = {r["student_id"]: i for i, r in enumerate(roster(rows, q, dim))}
    ordered_rows = sorted([r for r in rows if r["id"] in ordered_ids], key=lambda r: ordered_ids[r["id"]])
    d_a, d_p = driver_evidence(rows, "academic"), driver_evidence(rows, "placement")
    target = f"{len(rows)} matched students" + (f" in {', '.join(q.filters.branch)}" if q.filters.branch else "")
    gaps = readiness_gaps(rows, pool) if rows and intent == "cgpa_vs_employability" else []
    rec = recommend(rows, d_a, d_p, intent, target, gaps) if intent != "unrecognised" else None
    return {
        **base_out,
        "answer": _answer(intent, len(rows), summary, rec, d_a, d_p, scope, q, ordered_rows),
        "applied_filters": _applied(q.filters, extra),
        "matched_count": len(rows),
        "cohort_summary": summary,
        "matched_students": roster(rows, q, dim),
        "prediction_evidence": None if not rows else {
            "academic": {"meaning": "Calibrated probability of end-semester failure or a new backlog", "levels": {"medium_from": RISK_THRESHOLDS["academic"][0], "high_from": RISK_THRESHOLDS["academic"][1]},
                         "mean_probability": _mean(r["academic_risk_prob"] for r in rows)},
            "placement": {"meaning": "Calibrated probability of not being placed by final year (placement-track students only)", "levels": {"medium_from": RISK_THRESHOLDS["placement"][0], "high_from": RISK_THRESHOLDS["placement"][1]},
                          "mean_probability": _mean(r["placement_risk_prob"] for r in rows)},
            "model": "LightGBM with isotonic calibration, trained and evaluated on the synthetic cohort",
        },
        "driver_evidence": None if not rows else {
            "method": "TreeSHAP attributions stored with each student's score",
            "provenance": "Computed by the pipeline from the same calibrated models that produce the probabilities; not recomputed or edited here",
            "academic": d_a, "placement": d_p, "students": student_drivers(ordered_rows),
            **({"readiness_gaps": gaps} if gaps else {}),
        },
        "recommended_intervention": rec,
        "scope": scope,
        "limitations": limitations(scope, intent, summary, len(rows), notes),
    }
