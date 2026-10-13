"""Ask Ascora: plain-English question -> validated structured filter JSON (never SQL).

Gemini (if configured) proposes the filter; pydantic validates it against a closed schema. Without an
API key, or if the model fails validation, a deterministic keyword parser handles common questions."""
from __future__ import annotations

import json
import re
from typing import Literal

from pydantic import BaseModel, Field, ValidationError

from .llm import generate

Risk = Literal["Low", "Medium", "High"]
BRANCHES = ["CSE", "CSE-AIML", "CSE-Data Science", "ECE", "ME"]
PERSONAS = ["All-round strong", "High academics, low placement readiness", "Silent decliners", "Engaged but academically slipping",
            "Engaged but not placement-ready", "Backlog cluster", "Disengaged", "Steady middle"]
INTENTS = ["placement", "higher_studies", "govt_exams", "entrepreneurship", "undecided"]
ALERTS = ["lms_silent", "silent_decliner", "core_attendance", "attendance_drop", "backlogs", "no_mock", "assignments"]
SORTABLE = ["success_score", "academic_risk_prob", "placement_risk_prob", "priority", "cgpa", "att_overall"]


class Filter(BaseModel):
    branch: list[str] | None = None
    year: list[int] | None = None
    section: list[str] | None = None
    academic_risk: list[Risk] | None = None
    placement_risk: list[Risk] | None = None
    persona: list[str] | None = None
    intent: list[str] | None = None
    alert: list[str] | None = None
    score_min: float | None = Field(None, ge=0, le=100)
    score_max: float | None = Field(None, ge=0, le=100)
    cgpa_min: float | None = Field(None, ge=0, le=10)
    cgpa_max: float | None = Field(None, ge=0, le=10)
    attendance_max: float | None = Field(None, ge=0, le=100)
    attendance_min: float | None = Field(None, ge=0, le=100)
    mocks_max: int | None = Field(None, ge=0)


class Query(BaseModel):
    filters: Filter = Filter()
    sort_by: Literal["success_score", "academic_risk_prob", "placement_risk_prob", "priority", "cgpa", "att_overall"] = "priority"
    sort_dir: Literal["asc", "desc"] = "desc"
    limit: int = Field(50, ge=1, le=500)
    group_by: Literal["branch", "year", "section", "persona", "intent", "none"] = "none"
    explanation: str = ""

    def validated(self) -> "Query":
        f = self.filters
        f.branch = [b for b in (f.branch or []) if b in BRANCHES] or None
        f.persona = [p for p in (f.persona or []) if p in PERSONAS] or None
        f.intent = [i for i in (f.intent or []) if i in INTENTS] or None
        f.alert = [a for a in (f.alert or []) if a in ALERTS] or None
        return self


SCHEMA_HINT = json.dumps(Query.model_json_schema())[:3500]


def llm_parse(q: str) -> Query | None:
    prompt = ("Convert the question into a JSON object for a student-analytics filter. Output ONLY JSON matching this schema, "
              f"no prose.\nAllowed branch values: {BRANCHES}. Personas: {PERSONAS}. Intents: {INTENTS}. Alert types: {ALERTS}.\n"
              f"Schema: {SCHEMA_HINT}\nQuestion: {q}")
    out = generate(prompt)
    if not out:
        return None
    m = re.search(r"\{.*\}", out, re.S)
    if not m:
        return None
    try:
        return Query.model_validate_json(m.group(0)).validated()
    except ValidationError:
        return None


def rule_parse(q: str) -> Query:
    t = q.lower()
    f = Filter()
    expl = []
    br = []
    for b, keys in (("CSE-AIML", ["aiml", "ai&ml", "ai ml"]), ("CSE-Data Science", ["data science", " ds "]),
                    ("ECE", ["ece", "electronics"]), ("ME", [" me ", "mechanical", "mech"]), ("CSE", [" cse", "computer science"])):
        if any(k in f" {t} " for k in keys):
            br.append(b)
    if br:
        f.branch = br
        expl.append("branch " + ", ".join(br))
    yr = re.findall(r"(\d)(?:nd|rd|th)?[\s-]*year|year\s*(\d)", t)
    years = sorted({int(a or b) for a, b in yr if (a or b) in ("2", "3")})
    if years:
        f.year = years
        expl.append("year " + ", ".join(map(str, years)))
    sec = re.findall(r"section\s*([a-d])\b", t)
    if sec:
        f.section = [s.upper() for s in sec]
    if "placement" in t and any(w in t for w in ("risk", "unplaced", "not ready", "struggl")):
        f.placement_risk = ["High"] if "medium" not in t else ["Medium", "High"]
        expl.append("high placement risk")
    elif any(w in t for w in ("at risk", "at-risk", "academic risk", "failing", "fail", "struggling", "high risk")):
        f.academic_risk = ["High"] if "medium" not in t else ["Medium", "High"]
        expl.append("high academic risk")
    for p in PERSONAS:
        if p.lower() in t or (p == "Silent decliners" and "decliner" in t) or (p == "Disengaged" and "disengaged" in t):
            f.persona = [p]
            expl.append(f"persona '{p}'")
    if "no mock" in t or "without mock" in t or "zero mock" in t:
        f.mocks_max = 0
        expl.append("no mock interviews")
    m = re.search(r"cgpa\s*(?:above|over|>|>=|more than)\s*(\d+(?:\.\d+)?)", t)
    if m:
        f.cgpa_min = float(m.group(1))
        expl.append(f"CGPA ≥ {m.group(1)}")
    m = re.search(r"cgpa\s*(?:below|under|<|less than)\s*(\d+(?:\.\d+)?)", t)
    if m:
        f.cgpa_max = float(m.group(1))
        expl.append(f"CGPA < {m.group(1)}")
    m = re.search(r"attendance\s*(?:below|under|<|less than)\s*(\d+)", t)
    if m:
        f.attendance_max = float(m.group(1))
        expl.append(f"attendance < {m.group(1)}%")
    if "silent" in t and "lms" in t:
        f.alert = ["lms_silent"]
    if "higher stud" in t or "gate" in t or "ms abroad" in t:
        f.intent = ["higher_studies"]
    group = "branch" if "by branch" in t else "section" if "by section" in t else "persona" if "by segment" in t or "by persona" in t else "none"
    sort = "placement_risk_prob" if f.placement_risk else "academic_risk_prob" if f.academic_risk else "priority"
    m = re.search(r"top\s*(\d+)", t)
    return Query(filters=f, sort_by=sort, limit=int(m.group(1)) if m else 50, group_by=group,
                 explanation="Showing students with " + ("; ".join(expl) if expl else "no specific filter (all students, by priority)"))


def ask(question: str) -> dict:
    q = llm_parse(question)
    engine = "gemini" if q else "rules"
    if q is None:
        q = rule_parse(question)
    return {"question": question, "engine": engine, "query": json.loads(q.model_dump_json())}
