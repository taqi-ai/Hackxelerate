"""Standardisation: roll numbers, names, emails, dates, scales, branches."""
from __future__ import annotations

import re
from datetime import date, datetime

import numpy as np
import pandas as pd

BRANCH_CANON = {
    "cse": "CSE", "computer science": "CSE", "cs": "CSE",
    "cse-aiml": "CSE-AIML", "aiml": "CSE-AIML", "cse aiml": "CSE-AIML", "ai&ml": "CSE-AIML", "cse (ai & ml)": "CSE-AIML",
    "cse-data science": "CSE-Data Science", "cse-ds": "CSE-Data Science", "ds": "CSE-Data Science", "data science": "CSE-Data Science",
    "ece": "ECE", "electronics": "ECE", "electronics & communication": "ECE",
    "me": "ME", "mech": "ME", "mechanical": "ME",
}
BRANCH_CODE = {"CSE": "CSE", "CSE-AIML": "AIML", "CSE-Data Science": "DS", "ECE": "ECE", "ME": "ME"}
CODE_BRANCH = {v: k for k, v in BRANCH_CODE.items()}
CODES = "|".join(sorted(CODE_BRANCH, key=len, reverse=True))

# Every roll format seen across the campus systems -> canonical CU{yy}{CODE}{seq:04d}
_ROLL_PATTERNS = [
    re.compile(rf"^CU(?P<yy>\d{{2}})(?P<code>{CODES})(?P<seq>\d{{1,4}})$", re.I),            # CU25AIML0042 (ERP, skills)
    re.compile(rf"^(?P<yy>\d{{2}})-(?P<code>{CODES})-(?P<seq>\d{{1,4}})$", re.I),            # 25-AIML-42 (register)
    re.compile(rf"^20(?P<yy>\d{{2}})/(?P<code>{CODES})/(?P<seq>\d{{1,4}})$", re.I),          # 2025/AIML/042 (placement)
    re.compile(rf"^(?P<yy>\d{{2}})(?P<code>{CODES})(?P<seq>\d{{1,4}})$", re.I),              # 25AIML42 (hand-typed)
]


def normalize_roll(value) -> str | None:
    """Return the canonical roll number, or None if the value is not a recognisable roll."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    s = re.sub(r"\s+", "", str(value)).strip()
    if not s:
        return None
    for pat in _ROLL_PATTERNS:
        m = pat.match(s)
        if m:
            return f"CU{m['yy']}{m['code'].upper()}{int(m['seq']):04d}"
    return None


def normalize_branch(value) -> str | None:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    key = re.sub(r"\s+", " ", str(value).strip().lower())
    return BRANCH_CANON.get(key, str(value).strip())


_HONORIFICS = re.compile(r"^(mr|ms|mrs|dr|prof|shri|smt|kumari)\.?\s+", re.I)


def normalize_name(value) -> str:
    """Case, spacing and punctuation clean-up. Keeps initials as 'A.'"""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return ""
    s = str(value).strip()
    s = _HONORIFICS.sub("", s)
    s = re.sub(r"\s*\.\s*", ". ", s)          # "A.Kumar" -> "A. Kumar"
    s = re.sub(r"\s+", " ", s).strip()
    return " ".join(w if w.endswith(".") and len(w) == 2 else w.capitalize() for w in s.split(" "))


def name_tokens(value: str) -> list[str]:
    return [t for t in re.split(r"[\s.]+", value.lower()) if t]


def normalize_email(value) -> str | None:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    s = str(value).strip().lower()
    return s if "@" in s else None


def email_name_guess(email: str) -> str:
    """'aarav.sharma2@cumail.in' -> 'aarav sharma'; 'a.sharma' -> 'a. sharma'."""
    local = email.split("@", 1)[0]
    local = re.sub(r"\d+$", "", local)
    parts = [p for p in local.split(".") if p]
    if len(parts) >= 2:
        first = parts[0] + ("." if len(parts[0]) == 1 else "")
        return f"{first} {' '.join(parts[1:])}"
    return local


_DATE_FORMATS = ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%b %d, %Y", "%d %b %Y", "%d.%m.%Y")


def parse_date(value) -> date | None:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    if isinstance(value, (datetime, pd.Timestamp)):
        return value.date()
    if isinstance(value, date):
        return value
    s = str(value).strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def to_0_100(values: dict[str, float]) -> tuple[dict[str, float], bool]:
    """Detect 0-10 scaled assessments (all values <= 10) and rescale to 0-100."""
    nums = [v for v in values.values() if v is not None]
    if nums and max(nums) <= 10:
        return {k: (None if v is None else round(v * 10, 1)) for k, v in values.items()}, True
    return values, False


def clip_range(series: pd.Series, lo: float, hi: float) -> tuple[pd.Series, int]:
    """Values outside [lo, hi] are impossible -> set to NaN (later imputed). Returns count fixed."""
    bad = series.notna() & ((series < lo) | (series > hi))
    return series.mask(bad), int(bad.sum())
