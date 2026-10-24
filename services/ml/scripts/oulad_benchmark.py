"""Independent early-warning benchmark on the public Open University Learning Analytics Dataset (OULAD, CC BY 4.0).

Separate from Ascora's synthetic pipeline: nothing here reads data/demo or writes to any Ascora table.

Question: using only the first CUTOFF days of a course presentation, can we flag students who will end the
presentation as Fail or Withdrawn (target = 1) rather than Pass or Distinction (target = 0)?

Protocol (fixed before looking at any test result):
  * unit = (student, module, presentation); students who unregistered on or before the cutoff are excluded,
    because their outcome is already known inside the window
  * features use only events dated <= CUTOFF (VLE clicks, assessments due and submitted by then) plus pre-start
    registration facts; demographic and protected attributes are NOT used (gender, age, disability, region, IMD,
    education), matching Ascora's exclusion of fairness attributes
  * out-of-time split: train on presentations before 2014J, test on 2014J; test students who also appear in
    training are removed so no person is on both sides
  * preprocessing, calibration and the operating threshold are fitted on training data only (grouped 5-fold by
    student); the test set is scored once
Usage: python scripts/oulad_benchmark.py <dir with the OULAD csv files> [out.json]
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
from sklearn.model_selection import GroupKFold, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

CUTOFF = 28            # days since presentation start; events with date <= CUTOFF-1 are used
TEST_PRESENTATION = "2014J"
SEED = 7
KEYS = ["code_module", "code_presentation", "id_student"]
EXCLUDED: dict = {}


def load(d: Path) -> pd.DataFrame:
    info = pd.read_csv(d / "studentInfo.csv", usecols=KEYS + ["final_result", "num_of_prev_attempts", "studied_credits"])
    reg = pd.read_csv(d / "studentRegistration.csv", na_values=["?", ""])
    for c in ("date_registration", "date_unregistration"):
        reg[c] = pd.to_numeric(reg[c], errors="coerce")
    df = info.merge(reg, on=KEYS, how="left")
    # target and exclusions
    df["y"] = df["final_result"].isin(["Fail", "Withdrawn"]).astype(int)
    known_early = df["date_unregistration"].notna() & (df["date_unregistration"] < CUTOFF)
    n0 = len(df)
    df = df[~known_early].copy()
    EXCLUDED["unregistered_before_cutoff"] = int(n0 - len(df))
    EXCLUDED["rows_before_exclusion"] = int(n0)

    # VLE: only rows inside the window, streamed because the file is ~450 MB
    parts = []
    for ch in pd.read_csv(d / "studentVle.csv", usecols=KEYS + ["id_site", "date", "sum_click"], chunksize=2_000_000):
        parts.append(ch[(ch["date"] < CUTOFF)])
    vle = pd.concat(parts, ignore_index=True)
    vle["week"] = (vle["date"].clip(lower=0) // 7).clip(upper=3)
    g = vle.groupby(KEYS)
    agg = pd.DataFrame({
        "clicks_total": g["sum_click"].sum(),
        "active_days": g["date"].nunique(),
        "distinct_sites": g["id_site"].nunique(),
        "first_activity_day": g["date"].min(),
        "last_activity_day": g["date"].max(),
    })
    wk = vle.pivot_table(index=KEYS, columns="week", values="sum_click", aggfunc="sum", fill_value=0)
    wk.columns = [f"clicks_week{int(c) + 1}" for c in wk.columns]
    prestart = vle[vle["date"] < 0].groupby(KEYS)["sum_click"].sum().rename("clicks_before_start")
    df = df.merge(agg.join(wk).join(prestart).reset_index(), on=KEYS, how="left")

    # assessments due and submitted inside the window (assessment dates are the due dates)
    a = pd.read_csv(d / "assessments.csv", na_values=["?", ""])
    a["date"] = pd.to_numeric(a["date"], errors="coerce")
    sa = pd.read_csv(d / "studentAssessment.csv", na_values=["?", ""])
    for c in ("date_submitted", "score"):
        sa[c] = pd.to_numeric(sa[c], errors="coerce")
    due = a[a["date"].notna() & (a["date"] < CUTOFF)][["code_module", "code_presentation", "id_assessment"]]
    due_n = due.groupby(["code_module", "code_presentation"]).size().rename("assessments_due")
    sa = sa.merge(a[["id_assessment", "code_module", "code_presentation"]], on="id_assessment")
    sa = sa[(sa["date_submitted"] < CUTOFF) & sa["id_assessment"].isin(due["id_assessment"])]
    sg = sa.groupby(KEYS).agg(assessments_submitted=("id_assessment", "count"), mean_score=("score", "mean"))
    df = df.merge(sg.reset_index(), on=KEYS, how="left").merge(due_n.reset_index(), on=["code_module", "code_presentation"], how="left")

    cols0 = ["clicks_total", "active_days", "distinct_sites", "clicks_week1", "clicks_week2", "clicks_week3", "clicks_week4",
             "clicks_before_start", "assessments_submitted"]
    for c in cols0:
        if c in df:
            df[c] = df[c].fillna(0)
    df["assessments_due"] = df["assessments_due"].fillna(0)
    df["submitted_share_of_due"] = np.where(df["assessments_due"] > 0, df["assessments_submitted"] / df["assessments_due"].replace(0, np.nan), np.nan)
    # "never seen in the VLE" is information, not a missing value; first/last day and scores stay NaN when unknown
    df["no_vle_activity"] = (df["clicks_total"] == 0).astype(int)
    df["registered_days_before_start"] = -df["date_registration"]
    return df


FEATURES = ["clicks_total", "active_days", "distinct_sites", "clicks_week1", "clicks_week2", "clicks_week3", "clicks_week4",
            "clicks_before_start", "first_activity_day", "last_activity_day", "no_vle_activity", "assessments_due",
            "assessments_submitted", "submitted_share_of_due", "mean_score", "registered_days_before_start",
            "studied_credits", "num_of_prev_attempts"]
LOG_COLS = ["clicks_total", "clicks_week1", "clicks_week2", "clicks_week3", "clicks_week4", "clicks_before_start"]


def matrix(df: pd.DataFrame) -> pd.DataFrame:
    X = df[FEATURES].copy()
    for c in LOG_COLS:
        X[c] = np.log1p(X[c])
    return X


def ece(y, p, bins=10):
    idx = np.minimum((p * bins).astype(int), bins - 1)
    out = 0.0
    for b in range(bins):
        m = idx == b
        if m.any():
            out += m.mean() * abs(y[m].mean() - p[m].mean())
    return float(out)


def bootstrap_auc(y, p, n=1000, seed=SEED):
    rng = np.random.default_rng(seed)
    vals = []
    for _ in range(n):
        i = rng.integers(0, len(y), len(y))
        if y[i].min() == y[i].max():
            continue
        vals.append(roc_auc_score(y[i], p[i]))
    return [float(np.percentile(vals, 2.5)), float(np.percentile(vals, 97.5))]


def operating_point(y, p, flag_share):
    """Flag the highest-scoring `flag_share` of students (threshold taken from the given scores)."""
    thr = float(np.quantile(p, 1 - flag_share))
    return thr


def metrics_at(y, p, thr):
    flag = p >= thr
    tp = int((flag & (y == 1)).sum())
    return {"threshold": round(float(thr), 4), "flagged_share": round(float(flag.mean()), 4),
            "precision": round(tp / max(1, int(flag.sum())), 4), "recall": round(tp / max(1, int((y == 1).sum())), 4)}


def make_raw():
    logit = make_pipeline(_Imputer(), StandardScaler(), LogisticRegression(max_iter=2000, C=0.5))
    lgbm = LGBMClassifier(n_estimators=300, learning_rate=0.03, num_leaves=15, min_child_samples=40, subsample=0.8,
                          subsample_freq=1, colsample_bytree=0.8, random_state=SEED, n_jobs=2, verbose=-1)
    return {"logistic_baseline": logit, "lightgbm_isotonic": lgbm}


class _Imputer:
    """Median imputation fitted on training data only (sklearn-compatible, tiny)."""
    def fit(self, X, y=None):
        self.med_ = X.median(numeric_only=True)
        return self

    def transform(self, X):
        return X.fillna(self.med_).fillna(0)

    def fit_transform(self, X, y=None):
        return self.fit(X).transform(X)

    def get_params(self, deep=True):
        return {}

    def set_params(self, **p):
        return self


def main():
    d = Path(sys.argv[1])
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    t0 = time.time()
    df = load(d)
    X, y, grp = matrix(df), df["y"].to_numpy(), df["id_student"].to_numpy()
    is_test = (df["code_presentation"] == TEST_PRESENTATION).to_numpy()
    train_students = set(df.loc[~is_test, "id_student"])
    overlap = is_test & df["id_student"].isin(train_students).to_numpy()
    test = is_test & ~overlap
    train = ~is_test
    res = {
        "dataset": "Open University Learning Analytics Dataset (OULAD), CC BY 4.0, doi:10.1038/sdata.2017.171",
        "cutoff_days": CUTOFF, "target": "Fail or Withdrawn (1) vs Pass or Distinction (0)",
        "rows_before_exclusion": EXCLUDED["rows_before_exclusion"], "rows_after_exclusions": int(len(df)),
        "excluded_unregistered_before_cutoff": EXCLUDED["unregistered_before_cutoff"],
        "train": {"rows": int(train.sum()), "prevalence": round(float(y[train].mean()), 4), "presentations": sorted(df.loc[train, "code_presentation"].unique().tolist())},
        "test": {"rows": int(test.sum()), "prevalence": round(float(y[test].mean()), 4), "presentation": TEST_PRESENTATION,
                 "removed_students_also_in_training": int(overlap.sum())},
        "features": FEATURES,
    }
    from sklearn.base import clone
    from sklearn.isotonic import IsotonicRegression
    folds = list(GroupKFold(n_splits=5).split(X[train], y[train], grp[train]))
    out_models, fitted = {}, {}
    for name, raw in make_raw().items():
        # out-of-fold training scores (folds grouped by student): used for calibration and for the threshold
        oof = cross_val_predict(clone(raw), X[train], y[train], cv=folds, method="predict_proba")[:, 1]
        iso = IsotonicRegression(out_of_bounds="clip", y_min=0, y_max=1).fit(oof, y[train]) if name == "lightgbm_isotonic" else None
        calib = (lambda v, iso=iso: iso.predict(v)) if iso is not None else (lambda v: v)
        thr = operating_point(y[train], calib(oof), 0.20)
        raw.fit(X[train], y[train])
        fitted[name] = lambda Z, raw=raw, calib=calib: calib(raw.predict_proba(Z)[:, 1])
        pte = fitted[name](X[test])
        yt = y[test]
        out_models[name] = {
            "roc_auc": round(float(roc_auc_score(yt, pte)), 4),
            "roc_auc_95ci_bootstrap": [round(v, 4) for v in bootstrap_auc(yt, pte)],
            "pr_auc": round(float(average_precision_score(yt, pte)), 4),
            "brier": round(float(brier_score_loss(yt, pte)), 4),
            "ece_10bin": round(ece(yt, pte), 4),
            "train_oof_roc_auc": round(float(roc_auc_score(y[train], oof)), 4),
            "threshold_from_train_oof_for_20pct_flag_share": metrics_at(yt, pte, thr),
            "top_20pct_of_test_by_score": metrics_at(yt, pte, operating_point(yt, pte, 0.20)),
        }
    res["prevalence_baseline_pr_auc"] = res["test"]["prevalence"]
    res["models"] = out_models
    # by module, descriptive only
    bm = {}
    pte = fitted["lightgbm_isotonic"](X[test])
    for m, idx in df[test].groupby("code_module").indices.items():
        yy = y[test][idx]
        if len(idx) >= 100 and yy.min() != yy.max():
            bm[m] = {"rows": int(len(idx)), "prevalence": round(float(yy.mean()), 3), "roc_auc": round(float(roc_auc_score(yy, pte[idx])), 3)}
    res["lightgbm_by_module"] = bm
    res["seconds"] = round(time.time() - t0, 1)
    print(json.dumps(res, indent=2))
    if out:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(res, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
