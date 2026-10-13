"""Alerts, counterfactual recourse, intent-aware readiness, mentor priority, fairness audit,
early-warning curve and the 'what works' intervention analysis."""
from __future__ import annotations

import itertools

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold

from ..config import RISK_THRESHOLDS
from ..features.build import ACADEMIC_FEATURES, build_features
from .risk import LGB_PARAMS, RiskModel

# --------------------------------------------------------------------------- alerts

def alerts_for(f: pd.DataFrame, comps: pd.DataFrame, score: pd.Series) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for sid, r in f.iterrows():
        a = []
        if r.get("zero_weeks_recent", 0) >= 2:
            a.append(dict(type="lms_silent", severity="high", text="No LMS logins in the last 2 weeks (14+ days silent)"))
        if pd.notna(r.get("lms_ratio")) and r["lms_ratio"] < 0.6 and pd.notna(r.get("internal_delta")) and r["internal_delta"] < -5 \
                and 35 <= score[sid] <= 75:
            a.append(dict(type="silent_decliner", severity="high",
                          text=f"Silent decliner: LMS activity down {100 * (1 - r['lms_ratio']):.0f}% since early semester, "
                               f"internals {r['internal_delta']:+.0f} pts vs own average, while the overall score still looks average"))
        if pd.notna(r.get("att_core")) and r["att_core"] < 65:
            a.append(dict(type="core_attendance", severity="medium",
                          text=f"Core-subject attendance {r['att_core']:.0f}%, below the 65% eligibility comfort zone"))
        if pd.notna(r.get("att_trend")) and r["att_trend"] <= -15:
            a.append(dict(type="attendance_drop", severity="medium",
                          text=f"Attendance fell {abs(r['att_trend']):.0f} pts between August and October"))
        if r.get("backlogs", 0) >= 2:
            a.append(dict(type="backlogs", severity="medium", text=f"{int(r['backlogs'])} active backlogs"))
        if r.get("intent_declared") == "placement" and r.get("year") == 3 and (pd.isna(r.get("mocks")) or r["mocks"] == 0):
            a.append(dict(type="no_mock", severity="medium", text="Final-placement season ahead and no mock interview attended yet"))
        if pd.notna(r.get("completion_rate")) and r["completion_rate"] < 50:
            a.append(dict(type="assignments", severity="medium", text=f"Only {r['completion_rate']:.0f}% of assignments submitted"))
        out[sid] = a
    return out


# --------------------------------------------------------------------------- recourse

ACTION_LEVELS = {  # feature -> candidate increments, effort cost per step, human label
    "att_core": ([0, 5, 10, 15], 1.0, "Raise core-subject attendance by {d:.0f} pts"),
    "att_overall": ([0, 5, 10], 0.8, "Raise overall attendance by {d:.0f} pts"),
    "completion_rate": ([0, 10, 20, 30], 1.0, "Submit {d:.0f}% more assignments"),
    "login_freq": ([0, 1, 2, 3], 0.6, "Log in to the LMS {d:.0f} more time(s) a week"),
    "mocks": ([0, 1, 2, 3], 1.0, "Attend {d:.0f} more mock interview(s)"),
    "soft_avg": ([0, 5, 10], 1.2, "Improve soft-skill assessment by {d:.0f} pts (communication workshop)"),
}
ACADEMIC_ACTIONS = ["att_core", "att_overall", "completion_rate", "login_freq"]
PLACEMENT_ACTIONS = ["mocks", "soft_avg", "completion_rate"]


def recourse(model: RiskModel, X: pd.DataFrame, kind: str) -> dict[str, dict]:
    """Smallest set of actionable changes that moves a student out of High (to below the Medium/High cut).
    Only actionable features are searched; immutable attributes are never touched."""
    acts = ACADEMIC_ACTIONS if kind == "academic" else PLACEMENT_ACTIONS
    target = RISK_THRESHOLDS[kind][1]
    p0 = model.predict(X)
    combos = np.array([c for c in itertools.product(*[range(len(ACTION_LEVELS[a][0])) for a in acts])
                       if sum(1 for v in c if v) <= 3])                                  # at most 3 changes
    deltas = np.array([[ACTION_LEVELS[a][0][lvl] for a, lvl in zip(acts, c)] for c in combos], dtype=float)
    costs = np.array([sum(lvl * ACTION_LEVELS[a][1] for a, lvl in zip(acts, c)) for c in combos])
    cols = [model.features.index(a) for a in acts]
    caps = np.array([100 if a in ("att_core", "att_overall", "completion_rate", "soft_avg") else 99 for a in acts])
    fill = np.array([model.medians.get(a, 0) for a in acts])
    out = {}
    Xf = X[model.features].astype(float)
    for i, sid in enumerate(X.index):
        if p0[i] < target:
            continue
        base = Xf.iloc[i].to_numpy()
        grid = np.repeat(base[None, :], len(combos), axis=0)
        cur = np.where(np.isnan(base[cols]), fill, base[cols])
        grid[:, cols] = np.minimum(cur[None, :] + deltas, caps[None, :])
        probs = model.predict(pd.DataFrame(grid, columns=model.features))
        ok = probs < target
        if ok.any():
            cand = np.where(ok)[0]
            j = cand[np.lexsort((probs[cand], costs[cand]))[0]]        # cheapest, then lowest risk
            reached = True
        else:
            j = int(np.argmin(probs))
            reached = False
        steps = [ACTION_LEVELS[a][2].format(d=ACTION_LEVELS[a][0][lvl]) for a, lvl in zip(acts, combos[j]) if lvl]
        out[sid] = dict(kind=kind, from_prob=round(float(p0[i]), 3), to_prob=round(float(probs[j]), 3), reaches_target=reached,
                        steps=steps, target=target)
    return out


# --------------------------------------------------------------------------- readiness

def readiness(f: pd.DataFrame, comps: pd.DataFrame) -> dict[str, dict]:
    """Goal-specific readiness, so a student preparing for GATE or UPSC is not flagged as 'placement risk'."""
    def pct(s):
        return s.rank(pct=True).mul(100)
    p_cgpa, p_apt, p_tech = pct(f["cgpa"]), pct(f["aptitude"]), pct(f["tech_avg"])
    p_att, p_eng, p_soft = pct(f["att_overall"]), pct(f["eng_total"]), pct(f["soft_avg"])
    p_hack = pct(f["hackathons"])
    out = {}
    for sid, r in f.iterrows():
        intent = r.get("intent_declared") or "undecided"
        if intent == "placement":
            parts = {"Aptitude": p_apt.get(sid), "Coding": comps.at[sid, "placement"], "Soft skills": p_soft.get(sid)}
            gaps = [g for g, ok in (("Attend mock interviews", (r.get("mocks") or 0) >= 2), ("Improve aptitude", (p_apt.get(sid) or 0) > 40),
                                    ("Communication practice", (p_soft.get(sid) or 0) > 40)) if not ok]
        elif intent == "higher_studies":
            parts = {"CGPA": p_cgpa.get(sid), "Quantitative aptitude": p_apt.get(sid), "Technical depth": p_tech.get(sid)}
            gaps = [g for g, ok in (("GATE/GRE quant prep", (p_apt.get(sid) or 0) > 50), ("Keep CGPA above 8", (r.get("cgpa") or 0) >= 8),
                                    ("Research/project exposure", (r.get("hackathons") or 0) + (r.get("certifications") or 0) >= 2)) if not ok]
        elif intent == "govt_exams":
            parts = {"Aptitude": p_apt.get(sid), "Consistency (attendance)": p_att.get(sid), "CGPA": p_cgpa.get(sid)}
            gaps = [g for g, ok in (("Daily aptitude practice", (p_apt.get(sid) or 0) > 50), ("Steady attendance", (p_att.get(sid) or 0) > 40)) if not ok]
        elif intent == "entrepreneurship":
            parts = {"Hackathons & builds": p_hack.get(sid), "Soft skills": p_soft.get(sid), "Co-curricular": p_eng.get(sid)}
            gaps = [g for g, ok in (("Join E-Cell / incubator", (r.get("clubs") or 0) >= 1), ("Ship a project at a hackathon", (r.get("hackathons") or 0) >= 1)) if not ok]
        else:
            parts = {"Exploration (workshops)": pct(f["workshops"]).get(sid), "Skills": comps.at[sid, "skills"], "Aptitude": p_apt.get(sid)}
            gaps = ["Career counselling session to choose a direction"]
        vals = [v for v in parts.values() if v is not None and not np.isnan(v)]
        out[sid] = dict(intent=intent, score=round(float(np.mean(vals)), 1) if vals else None,
                        parts={k: (None if v is None or np.isnan(v) else round(float(v), 1)) for k, v in parts.items()}, gaps=gaps)
    return out


# --------------------------------------------------------------------------- priority

def priority(acad_p: pd.Series, plac_p: pd.Series, alerts: dict, shap_acad: dict) -> pd.Series:
    """Who to meet first: risk x urgency x how fixable the drivers are."""
    pr = {}
    for sid in acad_p.index:
        risk = max(acad_p[sid], 0.8 * (plac_p.get(sid) if pd.notna(plac_p.get(sid)) else 0))
        urgency = 1 + 0.25 * sum(1 for a in alerts.get(sid, []) if a["severity"] == "high") + 0.1 * len(alerts.get(sid, []))
        drivers = shap_acad.get(sid, {}).get("raises", [])
        fix = (sum(1 for d in drivers if d["actionable"]) / len(drivers)) if drivers else 0.5
        pr[sid] = round(float(risk * urgency * (0.6 + 0.4 * fix)), 4)
    return pd.Series(pr)


# --------------------------------------------------------------------------- fairness

GROUPS = {"Residence": ("hosteller", {True: "Hosteller", False: "Day scholar"}),
          "First-generation learner": ("first_generation", {True: "Yes", False: "No"}),
          "Lateral entry": ("lateral_entry", {True: "Yes", False: "No"}),
          "Schooling medium": ("schooling_medium", None),
          "Gender": ("gender", {"F": "Female", "M": "Male"})}


def fairness(students: pd.DataFrame, flag: pd.Series, y: pd.Series, kind: str) -> dict:
    """Flag rates and error rates by group. Sensitive attributes are used ONLY here, never in prediction."""
    s = students.set_index("student_id")
    res = []
    for gname, (col, labels) in GROUPS.items():
        rows = []
        for val, g in s.groupby(col):
            ids = g.index.intersection(flag.index)
            yy, ff = y.reindex(ids), flag.reindex(ids)
            known = yy.notna()
            yk, fk = yy[known].astype(bool), ff[known].astype(bool)
            rows.append(dict(group=(labels or {}).get(val, str(val)), n=int(len(ids)), flag_rate=round(float(ff.mean()), 4),
                             fnr=round(float((~fk[yk]).mean()), 4) if yk.any() else None,
                             fpr=round(float(fk[~yk].mean()), 4) if (~yk).any() else None))
        rates = [r["flag_rate"] for r in rows if r["n"] >= 20]
        ratio = round(min(rates) / max(rates), 3) if rates and max(rates) > 0 else 1.0
        fnrs = [r["fnr"] for r in rows if r["fnr"] is not None and r["n"] >= 20]
        res.append(dict(attribute=gname, groups=rows, flag_rate_ratio=ratio, fnr_gap=round(max(fnrs) - min(fnrs), 3) if fnrs else 0,
                        status="ok" if ratio >= 0.8 and (not fnrs or max(fnrs) - min(fnrs) <= 0.1) else "review"))
    return {"kind": kind, "attributes": res,
            "rule": "Flag-rate ratio >= 0.8 (four-fifths rule) and false-negative-rate gap <= 10 pts; otherwise marked for review.",
            "note": "Sensitive attributes are used only for this audit. They are never model inputs."}


# --------------------------------------------------------------------------- early warning curve

def early_curve(students, tables, weekly, y: pd.Series, weeks=(2, 4, 6, 8, 10, 12), k_frac: float = 0.2) -> list[dict]:
    """How early can we know? Retrain the academic model with only the data available by week w."""
    out = []
    for w in weeks:
        F = build_features(students, tables, weekly, upto_week=w)
        X = F.loc[y.index, ACADEMIC_FEATURES].astype(float)
        yy = y.astype(int).to_numpy()
        oof = np.zeros(len(yy))
        for tr, te in StratifiedKFold(5, shuffle=True, random_state=5).split(X, yy):
            m = lgb.LGBMClassifier(**LGB_PARAMS).fit(X.iloc[tr], yy[tr])
            oof[te] = m.predict_proba(X.iloc[te])[:, 1]
        k = int(len(yy) * k_frac)
        top = np.argsort(-oof)[:k]
        out.append(dict(week=w, roc_auc=round(roc_auc_score(yy, oof), 4),
                        recall_top20=round(float(yy[top].sum() / max(1, yy.sum())), 4),
                        precision_top20=round(float(yy[top].mean()), 4),
                        note="mid-sem internals available" if w >= 8 else "attendance + LMS only"))
    return out


# --------------------------------------------------------------------------- what works

LABELS = {"mentor_meeting": "Mentor meeting", "peer_tutoring": "Peer tutoring", "mock_interview": "Mock interview",
          "counselling_referral": "Counselling referral", "parent_call": "Parent call", "skill_workshop": "Skill workshop"}


def what_works(history: pd.DataFrame) -> dict:
    """Improvement rate for students who got each intervention vs comparable at-risk students who got none."""
    if history is None or history.empty:
        return {"rows": [], "control": None}
    ctrl = history[~history.received]
    c_rate = float(ctrl.improved.mean())
    rows = []
    for t, g in history[history.received].groupby("type"):
        rate = float(g.improved.mean())
        se = np.sqrt(rate * (1 - rate) / len(g) + c_rate * (1 - c_rate) / len(ctrl))
        rows.append(dict(type=t, label=LABELS.get(t, t), n=int(len(g)), improved_rate=round(rate, 3),
                         lift_pts=round(100 * (rate - c_rate), 1), ci95_pts=round(100 * 1.96 * se, 1)))
    rows.sort(key=lambda r: -r["lift_pts"])
    return {"rows": rows, "control": {"n": int(len(ctrl)), "improved_rate": round(c_rate, 3)},
            "note": "Last semester's records. Comparison group: at-risk students who received no intervention. "
                    "Observational, not a randomised trial; small groups have wide intervals."}
