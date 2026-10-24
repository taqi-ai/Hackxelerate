"""Round 2 outcomes: the four explicit predictions the brief asks for.

1. Semester performance : expected SGPA (regression), SGPA band, pass probability
2. Backlog risk         : the calibrated academic-risk probability (target: end-semester failure or a new backlog)
3. Placement readiness  : 1 - placement risk (placement-track students only) and three benchmark flags
4. Engagement drop      : calibrated probability of a significant fall in engagement after mid-semester

Targets: semester SGPA is the recorded SGPA of each completed semester; the model learns it from that semester's internal
marks and the earlier semesters (all available before the end-semester exam). The engagement-drop target is the
generator's planted post-mid-semester drop-off, and the model sees only data up to the mid-semester week, so it is a
genuine early-warning estimate. All data are synthetic: metrics say the pipeline works, not how it would do at a college.
"""
from __future__ import annotations

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, roc_auc_score
from sklearn.model_selection import GroupKFold

from ..config import MIDSEM_WEEK, RISK_THRESHOLDS
from ..features.build import build_features
from .risk import level, train

BANDS = [(6.0, "Critical"), (7.0, "Watch"), (8.0, "Good")]       # below 6 Critical, 6 to 7 Watch, 7 to 8 Good, 8 and above Strong
PLACEMENT_BENCHMARKS = {"aptitude": 60.0, "coding": 60.0, "mocks": 2}   # illustrative institutional benchmarks (assumption, adjustable)
ENGAGEMENT_FEATURES = ["login_freq", "completion_rate", "lms_slope", "lms_ratio", "zero_weeks_recent", "att_overall", "att_trend",
                       "eng_total", "cgpa", "backlogs", "cur_internal_pct", "internal_delta"]
SEM_FEATURES = ["internal_pct", "internal_min_pct", "prior_sgpa_mean", "prior_sgpa_last", "sem_no"]
FLAG_SHARE = 0.20
SEED = 7


def band(sgpa: float) -> str:
    for edge, name in BANDS:
        if sgpa < edge:
            return name
    return "Strong"


# --------------------------------------------------------------------------------------------- semester performance
def _semester_rows(academic: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for sid, subs, sg, in zip(academic["student_id"], academic["subjects"], academic["sgpa"]):
        if not isinstance(subs, list) or not subs:
            continue
        sg = {int(k): v for k, v in (sg or {}).items() if v is not None}
        for s in sorted({x["sem"] for x in subs}):
            ints = [x["internal"] for x in subs if x["sem"] == s and x["internal"] is not None]
            if not ints:
                continue
            prior = [sg[k] for k in sorted(sg) if k < s]
            rows.append(dict(student_id=sid, sem_no=s, internal_pct=100 * float(np.mean(ints)) / 40, internal_min_pct=100 * float(np.min(ints)) / 40,
                             prior_sgpa_mean=float(np.mean(prior)) if prior else np.nan, prior_sgpa_last=prior[-1] if prior else np.nan,
                             sgpa=sg.get(s, np.nan), completed=s in sg))
    return pd.DataFrame(rows)


def _reg() -> lgb.LGBMRegressor:
    return lgb.LGBMRegressor(n_estimators=250, learning_rate=0.04, num_leaves=7, min_child_samples=30, subsample=0.8, subsample_freq=1,
                             colsample_bytree=0.9, verbose=-1, random_state=SEED)


def semester_model(academic: pd.DataFrame) -> tuple[dict, dict]:
    d = _semester_rows(academic)
    tr = d[d["completed"] & d["sgpa"].notna()].reset_index(drop=True)
    X, y, g = tr[SEM_FEATURES], tr["sgpa"].to_numpy(), tr["student_id"].to_numpy()
    oof = np.zeros(len(tr))
    for a, b in GroupKFold(5).split(X, y, g):                    # grouped by student: nobody is in both train and test
        oof[b] = _reg().fit(X.iloc[a], y[a]).predict(X.iloc[b])
    has_prior = tr["prior_sgpa_last"].notna().to_numpy()
    persist = tr["prior_sgpa_last"].to_numpy()
    rmse = float(np.sqrt(mean_squared_error(y, oof)))
    metrics = {
        "target": "recorded SGPA of each completed semester", "n_rows": int(len(tr)), "n_students": int(tr["student_id"].nunique()),
        "protocol": "5-fold out-of-fold predictions, folds grouped by student",
        "mae": round(float(mean_absolute_error(y, oof)), 3), "rmse": round(rmse, 3), "r2": round(float(r2_score(y, oof)), 3),
        "band_accuracy": round(float(np.mean([band(a) == band(b) for a, b in zip(y, oof)])), 3),
        "baseline_last_semester_sgpa": {"mae": round(float(mean_absolute_error(y[has_prior], persist[has_prior])), 3),
                                        "rmse": round(float(np.sqrt(mean_squared_error(y[has_prior], persist[has_prior]))), 3), "n_rows": int(has_prior.sum())},
        "model_on_same_rows": {"mae": round(float(mean_absolute_error(y[has_prior], oof[has_prior])), 3)},
        "interval_80_halfwidth": round(1.28 * rmse, 2),
    }
    model = _reg().fit(X, y)
    cur = d[~d["completed"]].sort_values("sem_no").groupby("student_id").tail(1).set_index("student_id")
    pred = pd.Series(np.clip(model.predict(cur[SEM_FEATURES]), 0, 10), index=cur.index)
    return pred.to_dict(), metrics


# --------------------------------------------------------------------------------------------- engagement drop
def engagement_model(res, f_now: pd.DataFrame, y_drop: pd.Series, success: pd.Series, silent: pd.Series) -> tuple[pd.Series, dict]:
    f8 = build_features(res.students, res.tables, res.weekly, upto_week=MIDSEM_WEEK)
    X = f8[ENGAGEMENT_FEATURES].astype(float)
    y = y_drop.reindex(X.index).astype(bool)
    m = train("engagement", X, y)
    p = pd.Series(m.predict(X), index=X.index)
    # out-of-fold ranking against the Round 1 Success Score, same flag share, same labels
    yy = y.astype(int).to_numpy()
    oof = np.zeros(len(yy))
    from sklearn.model_selection import StratifiedKFold
    for a, b in StratifiedKFold(5, shuffle=True, random_state=5).split(X, yy):
        oof[b] = lgb.LGBMClassifier(n_estimators=300, learning_rate=0.03, num_leaves=7, min_child_samples=25, subsample=0.8,
                                    subsample_freq=1, colsample_bytree=0.8, verbose=-1, random_state=SEED).fit(X.iloc[a], yy[a]).predict_proba(X.iloc[b])[:, 1]
    k = int(len(yy) * FLAG_SHARE)
    by_model = np.zeros(len(yy), bool)
    by_model[np.argsort(-oof)[:k]] = True
    by_score = np.zeros(len(yy), bool)
    by_score[np.argsort(success.reindex(X.index).to_numpy())[:k]] = True        # lowest Success Score first
    sd = silent.reindex(X.index).fillna(False).to_numpy().astype(bool)

    def rec(flag, mask):
        return round(float(flag[mask].mean()), 3) if mask.any() else None
    metrics = dict(m.metrics)
    metrics["target"] = "post-mid-semester engagement drop-off (generator truth)"
    metrics["features_use_data_up_to_week"] = MIDSEM_WEEK
    metrics["baseline_comparison"] = {
        "protocol": f"flag the top {int(FLAG_SHARE * 100)}% of students; out-of-fold model scores vs lowest Round 1 Success Score",
        "oof_roc_auc_model": round(float(roc_auc_score(yy, oof)), 4),
        "roc_auc_low_success_score": round(float(roc_auc_score(yy, -success.reindex(X.index).to_numpy())), 4),
        "recall_of_drop_off": {"model": rec(by_model, yy == 1), "success_score_threshold": rec(by_score, yy == 1)},
        "recall_of_silent_decliners": {"model": rec(by_model, sd), "success_score_threshold": rec(by_score, sd), "n_silent_decliners": int(sd.sum())},
    }
    return p, metrics


def observed_changes(res) -> pd.DataFrame:
    w = res.weekly
    late = w[w["week"] > 8].groupby("student_id")["logins"].mean()
    mid = w[(w["week"] > 4) & (w["week"] <= 8)].groupby("student_id")["logins"].mean()
    last4 = w[w["week"] > 8].groupby("student_id")["logins"].apply(lambda s: float(np.polyfit(np.arange(len(s)), s.values, 1)[0]) if len(s) >= 3 else 0.0)
    att = res.tables["attendance"].set_index("student_id")["by_month"]
    delta = att.map(lambda d: (d.get("Oct") - d.get("Sep")) if isinstance(d, dict) and d.get("Oct") is not None and d.get("Sep") is not None else np.nan)
    return pd.DataFrame({"lms_change_4w": late - mid, "lms_slope_4w": last4, "attendance_delta_4w": delta})


# --------------------------------------------------------------------------------------------- assemble
def compute(res, f: pd.DataFrame, scores: pd.DataFrame, truth: pd.DataFrame, success: pd.Series) -> tuple[dict, dict]:
    """Return ({student_id: outcomes}, artifacts). `scores` has the stored academic and placement probabilities."""
    sgpa, sem_metrics = semester_model(res.tables["academic"])
    p_drop, eng_metrics = engagement_model(res, f, truth["post_midsem_dropoff"].astype(bool), success, truth["silent_decliner"].astype(bool))
    chg = observed_changes(res)
    out = {}
    for sid in scores.index:
        s = scores.loc[sid]
        e = sgpa.get(sid)
        e = None if e is None else round(float(e), 2)       # band and display use the same rounded value
        pa = float(s["academic_risk_prob"])
        pp = s["placement_risk_prob"]
        on_track = pp is not None and not pd.isna(pp)
        aptitude, coding, mocks = f.at[sid, "aptitude"], f.at[sid, "coding"], f.at[sid, "mocks"]
        pd_ = float(p_drop[sid])
        c = chg.loc[sid] if sid in chg.index else None

        def val(k, nd=2):
            return None if c is None or pd.isna(c[k]) else round(float(c[k]), nd)
        out[sid] = {
            "semester": None if e is None else {
                "expected_sgpa": round(float(e), 2), "band": band(e), "sem_pass_prob": round(1.0 - pa, 4),
                "interval_80": [round(max(0.0, e - sem_metrics["interval_80_halfwidth"]), 2), round(min(10.0, e + sem_metrics["interval_80_halfwidth"]), 2)],
                "basis": "internal marks so far plus earlier semesters; pass probability = 1 - academic risk (no failure and no new backlog)"},
            "backlog": {"probability": round(pa, 4), "level": str(s["academic_risk_level"])},
            "placement_readiness": {
                "on_placement_track": bool(on_track),
                "probability": round(1.0 - float(pp), 4) if on_track else None,
                "benchmarks": {"aptitude_met": None if pd.isna(aptitude) else bool(aptitude >= PLACEMENT_BENCHMARKS["aptitude"]),
                               "coding_met": None if pd.isna(coding) else bool(coding >= PLACEMENT_BENCHMARKS["coding"]),
                               "mock_interview_met": None if pd.isna(mocks) else bool(mocks >= PLACEMENT_BENCHMARKS["mocks"])}},
            "engagement_drop": {"probability": round(pd_, 4), "level": str(level(np.array([pd_]), "engagement")[0]),
                                "lms_change_4w": val("lms_change_4w"), "lms_slope_4w": val("lms_slope_4w", 3), "attendance_delta_4w": val("attendance_delta_4w", 1),
                                "basis": f"model estimate from data up to week {MIDSEM_WEEK}; the 4-week figures are observed changes (weeks 9 to 12)"},
        }
    artifacts = {
        "model_semester": {"metrics": sem_metrics, "features": SEM_FEATURES, "band_edges": BANDS},
        "model_engagement": {"metrics": eng_metrics, "features": ENGAGEMENT_FEATURES},
        "round2_outcomes": {"outcomes": ["semester", "backlog", "placement_readiness", "engagement_drop"],
                            "placement_benchmarks": PLACEMENT_BENCHMARKS, "thresholds": {k: v for k, v in RISK_THRESHOLDS.items()},
                            "notes": ["Synthetic cohort: metrics show the pipeline works, not accuracy at a real college.",
                                      "Backlog risk is the academic-risk model; placement readiness is 1 - placement risk."]},
    }
    return out, artifacts
