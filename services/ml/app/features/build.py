"""Feature engineering from the unified view.

Only information available *before* the predicted outcome is used (no leakage): past semesters,
current-semester internals (available after mid-sem, week 8), attendance and LMS up to `upto_week`.
Contextual attributes (gender, residence, first-generation, schooling medium, lateral entry) are
NEVER model features; they are used only by the fairness audit."""
from __future__ import annotations

import numpy as np
import pandas as pd

from ..config import CURRENT_WEEK, MIDSEM_WEEK

GATEKEEPERS = {"Mathematics-II", "Data Structures", "Signals & Systems", "Thermodynamics"}

# feature -> (plain-language label, unit, actionable?)
FEATURES: dict[str, tuple[str, str, bool]] = {
    "cgpa": ("CGPA", "", False),
    "backlogs": ("Active backlogs", "", False),
    "sgpa_slope": ("SGPA trend across semesters", "/sem", False),
    "cur_internal_pct": ("Current-semester internal marks", "%", True),
    "internal_delta": ("Internals vs own past average", " pts", True),
    "gatekeeper_pct": ("Score in gatekeeper courses", "%", False),
    "att_overall": ("Overall attendance", "%", True),
    "att_core": ("Core-subject attendance", "%", True),
    "att_trend": ("Attendance change Aug→Oct", " pts", True),
    "login_freq": ("LMS logins per week", "/wk", True),
    "completion_rate": ("Assignment completion", "%", True),
    "lms_slope": ("LMS activity trend", "/wk", True),
    "lms_ratio": ("Recent vs early LMS activity", "x", True),
    "zero_weeks_recent": ("Recent weeks with no LMS login", " wk", True),
    "hackathons": ("Hackathons", "", True),
    "certifications": ("Certifications", "", True),
    "eng_total": ("Co-curricular activities", "", True),
    "aptitude": ("Aptitude score", "", True),
    "coding": ("Coding score", "", True),
    "mocks": ("Mock interviews attended", "", True),
    "mock_rating": ("Mock interview rating", "/5", True),
    "tech_avg": ("Technical skills", "", True),
    "soft_avg": ("Soft skills", "", True),
    "communication": ("Communication", "", True),
    "year": ("Year of study", "", False),
    "cs_family": ("CS-family branch", "", False),
}
ACADEMIC_FEATURES = ["cgpa", "backlogs", "sgpa_slope", "cur_internal_pct", "internal_delta", "gatekeeper_pct",
                     "att_overall", "att_core", "att_trend", "login_freq", "completion_rate", "lms_slope", "lms_ratio",
                     "zero_weeks_recent", "eng_total", "year", "cs_family"]
PLACEMENT_FEATURES = ["cgpa", "backlogs", "aptitude", "coding", "mocks", "mock_rating", "tech_avg", "soft_avg",
                      "communication", "hackathons", "certifications", "eng_total", "completion_rate", "lms_slope",
                      "att_overall", "year", "cs_family"]


def _slope(y) -> float:
    y = np.asarray(y, dtype=float)
    y = y[~np.isnan(y)]
    if len(y) < 3:
        return 0.0
    return float(np.polyfit(np.arange(len(y)), y, 1)[0])


def build_features(students: pd.DataFrame, tables: dict[str, pd.DataFrame], weekly: pd.DataFrame,
                   upto_week: int = CURRENT_WEEK) -> pd.DataFrame:
    f = students[["student_id", "year", "branch"]].copy().set_index("student_id")
    f["cs_family"] = f["branch"].str.startswith("CSE").astype(int)

    # --- academic
    acad = tables["academic"].set_index("student_id")
    f["cgpa"] = acad["cgpa"]
    f["backlogs"] = acad["backlogs"]
    f["sgpa_slope"] = acad["sgpa"].map(lambda d: _slope([d[k] for k in sorted(d, key=int)]) if isinstance(d, dict) and d else 0.0)
    cur, delta, gk = {}, {}, {}
    for sid, subs in acad["subjects"].items():
        if not isinstance(subs, list) or not subs:
            continue
        cur_sem = max(s["sem"] for s in subs)
        now = [s["internal"] for s in subs if s["sem"] == cur_sem and s["internal"] is not None]
        past = [s["internal"] for s in subs if s["sem"] < cur_sem and s["internal"] is not None]
        if upto_week >= MIDSEM_WEEK and now:
            cur[sid] = 100 * np.mean(now) / 40
            if past:
                delta[sid] = cur[sid] - 100 * np.mean(past) / 40
        g = [s["total"] for s in subs if s["subject"] in GATEKEEPERS and s["total"] is not None and s["sem"] < cur_sem]
        if g:
            gk[sid] = float(np.mean(g))
    f["cur_internal_pct"] = pd.Series(cur)
    f["internal_delta"] = pd.Series(delta)
    f["gatekeeper_pct"] = pd.Series(gk)

    # --- attendance (monthly sheets: Aug = wk1-4, Sep = wk5-8, Oct = wk9-12)
    att = tables["attendance"].set_index("student_id")
    months = ["Aug"] + (["Sep"] if upto_week > 4 else []) + (["Oct"] if upto_week > 8 else [])
    bm = att["by_month"].map(lambda d: d if isinstance(d, dict) else {})
    f["att_overall"] = bm.map(lambda d: np.nanmean([d.get(m, np.nan) for m in months]) if any(m in d for m in months) else np.nan)
    f["att_core"] = att["core_pct"] if upto_week >= CURRENT_WEEK else f["att_overall"]
    f["att_trend"] = bm.map(lambda d: (d.get(months[-1], np.nan) - d.get("Aug", np.nan)) if len(months) > 1 else 0.0)

    # --- LMS weekly
    w = weekly[weekly["week"] <= upto_week]
    g = w.groupby("student_id")
    f["login_freq"] = g["logins"].mean()
    f["completion_rate"] = 100 * g["submitted"].sum() / g["due"].sum().clip(lower=1)
    f["lms_slope"] = g["logins"].apply(lambda s: _slope(s.values))
    half = max(2, upto_week // 3)
    early = w[w["week"] <= half].groupby("student_id")["logins"].mean()
    late = w[w["week"] > upto_week - half].groupby("student_id")["logins"].mean()
    f["lms_ratio"] = (late / early.replace(0, np.nan)).clip(upper=3)
    last2 = w[w["week"] > upto_week - 2].groupby("student_id")["logins"]
    f["zero_weeks_recent"] = last2.apply(lambda s: int((s == 0).sum()))

    # --- engagement
    eng = tables["engagement"].set_index("student_id")
    for c in ("hackathons", "clubs", "workshops", "certifications"):
        f[c] = eng[c]
    f["eng_total"] = eng[["hackathons", "clubs", "workshops", "certifications"]].sum(axis=1)

    # --- placement + skills
    pl = tables["placement"].set_index("student_id")
    f["aptitude"], f["coding"], f["mocks"], f["mock_rating"] = pl["aptitude"], pl["coding"], pl["mocks_attended"], pl["mock_rating"]
    f["visited_cell"] = pl["visited_cell"].fillna(False).astype(bool)
    f["intent_declared"] = pl["intent"]
    sk = tables["skills"].set_index("student_id")
    f["tech_avg"], f["soft_avg"] = sk["technical_avg"], sk["soft_avg"]
    f["communication"] = sk["soft"].map(lambda d: d.get("communication") if isinstance(d, dict) else np.nan)
    return f.drop(columns=["branch"])


def weekly_index(weekly: pd.DataFrame) -> dict[str, list[dict]]:
    """A 0-100 weekly engagement index per student for sparklines (logins + submissions)."""
    w = weekly.copy()
    w["sub_rate"] = w["submitted"] / w["due"].clip(lower=1)
    lo, hi = w["logins"].quantile(0.02), w["logins"].quantile(0.98)
    w["idx"] = (50 * ((w["logins"] - lo) / max(1e-9, hi - lo)).clip(0, 1) + 50 * w["sub_rate"].clip(0, 1)).round(1)
    return {sid: [dict(week=int(r.week), value=float(r.idx)) for r in g.sort_values("week").itertuples()]
            for sid, g in w.groupby("student_id")}
