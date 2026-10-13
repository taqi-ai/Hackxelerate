"""Canonical schemas + synonym dictionary + fuzzy header auto-mapping + source detection."""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from rapidfuzz import fuzz, process

# canonical field -> header synonyms seen in campus systems
SCHEMAS: dict[str, dict[str, list[str]]] = {
    "erp_academics": {
        "roll": ["roll no", "roll number", "enrollment no", "registration no", "student id", "uid"],
        "name": ["student name", "name", "full name"],
        "branch": ["branch", "program", "department", "course"],
        "section": ["section", "sec", "division"],
        "mentor_id": ["mentor id", "mentor", "faculty advisor", "proctor"],
        "gender": ["gender", "sex"],
        "residence": ["residence", "hosteller/day scholar", "hostel"],
        "first_gen": ["first generation learner", "first generation", "first gen"],
        "lateral": ["lateral entry", "lateral"],
        "medium": ["schooling medium", "medium of instruction", "medium"],
        "semester": ["semester", "sem"],
        "subject": ["subject", "course name", "paper"],
        "internal": ["internal (40)", "internal", "internal marks", "ia marks", "sessional"],
        "end_sem": ["end sem (60)", "end sem", "end semester", "external", "ese"],
        "total": ["total (100)", "total", "total marks"],
        "sgpa": ["sgpa", "semester gpa"],
        "cgpa": ["cgpa", "cumulative gpa", "cpi"],
        "backlogs": ["active backlogs", "backlogs", "arrears", "kt"],
        "attendance_pct": ["attendance %", "attendance", "attendance percentage"],
    },
    "attendance_register": {
        "roll": ["roll number", "roll no", "roll", "enrollment no"],
        "subject": ["subject", "course"],
        "held": ["classes held", "held", "total classes", "lectures delivered"],
        "attended": ["classes attended", "attended", "present", "lectures attended"],
        "remarks": ["remarks", "note"],
    },
    "lms_activity_log": {
        "email": ["user_email", "email", "email id", "login id", "username"],
        "program": ["program", "programme", "course", "batch"],
        "week_start": ["week_start", "week", "week starting", "date"],
        "logins": ["logins", "login count", "sessions"],
        "due": ["assignments_due", "assignments due", "due"],
        "submitted": ["assignments_submitted", "assignments submitted", "submitted", "submissions"],
        "minutes": ["minutes_active", "minutes active", "time spent (min)", "active minutes"],
    },
    "clubs_events": {
        "name": ["participant name", "name", "student name", "participant"],
        "branch": ["branch", "department"],
        "year": ["year", "year of study"],
        "event": ["event / activity", "event", "activity", "event name"],
        "type": ["type", "category", "activity type"],
        "date": ["date", "event date"],
    },
    "placement_cell": {
        "roll": ["roll", "roll no", "roll number", "enrollment no"],
        "name": ["name", "student name"],
        "branch": ["branch", "department"],
        "phone": ["contact", "phone", "mobile", "contact no"],
        "aptitude": ["aptitude score", "aptitude", "quant score"],
        "coding": ["coding score", "coding", "programming score"],
        "mocks": ["mock interviews attended", "mock interviews", "mocks attended", "no. of mocks"],
        "mock_rating": ["avg mock rating (1-5)", "mock rating", "avg mock rating", "interview rating"],
        "intent": ["career intent (declared)", "career intent", "career goal", "intent"],
    },
    "feedback_forms": {
        "roll": ["roll_no", "roll no", "roll number", "student id"],
        "course": ["course", "subject"],
        "rating": ["rating", "satisfaction", "overall rating"],
        "comment": ["comment", "comments", "feedback", "remarks"],
        "date": ["submitted_on", "date", "submitted on", "timestamp"],
    },
}
REQUIRED = {
    "erp_academics": {"roll", "name", "subject"},
    "attendance_register": {"roll", "held", "attended"},
    "lms_activity_log": {"email", "logins"},
    "clubs_events": {"name", "event"},
    "placement_cell": {"roll", "aptitude"},
    "feedback_forms": {"rating", "comment"},
}


def _norm(h: str) -> str:
    return re.sub(r"\s+", " ", str(h).strip().lower())


@dataclass
class Mapping:
    source_type: str
    columns: dict[str, str] = field(default_factory=dict)      # raw header -> canonical
    method: dict[str, str] = field(default_factory=dict)       # canonical -> exact|fuzzy(score)
    unmapped: list[str] = field(default_factory=list)
    score: float = 0.0

    def as_dict(self) -> dict:
        return {"source_type": self.source_type, "columns": self.columns, "method": self.method,
                "unmapped": self.unmapped, "score": round(self.score, 2)}


def map_headers(headers: list[str], source_type: str) -> Mapping:
    schema = SCHEMAS[source_type]
    lookup = {syn: canon for canon, syns in schema.items() for syn in syns}
    m = Mapping(source_type=source_type)
    used: set[str] = set()
    for h in headers:
        n = _norm(h)
        if n in lookup and lookup[n] not in used:
            m.columns[h] = lookup[n]
            m.method[lookup[n]] = "exact"
            used.add(lookup[n])
            continue
        best = process.extractOne(n, list(lookup), scorer=fuzz.token_set_ratio)
        if best and best[1] >= 85 and lookup[best[0]] not in used:
            m.columns[h] = lookup[best[0]]
            m.method[lookup[best[0]]] = f"fuzzy({best[1]:.0f})"
            used.add(lookup[best[0]])
        else:
            m.unmapped.append(h)
    req = REQUIRED[source_type]
    m.score = len(req & used) / len(req) + 0.1 * len(used) / len(schema)
    return m


def detect_source(headers: list[str]) -> Mapping:
    """Pick the schema whose required fields are best covered by these headers."""
    candidates = [map_headers(headers, st) for st in SCHEMAS]
    return max(candidates, key=lambda c: c.score)
