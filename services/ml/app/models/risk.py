"""Two separate risk models (academic, placement) with calibration, honest metrics and SHAP drivers."""
from __future__ import annotations

import warnings
from dataclasses import dataclass

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
import shap
from sklearn.calibration import CalibratedClassifierCV
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from ..config import ARTIFACTS, RISK_THRESHOLDS
from ..features.build import FEATURES

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

LGB_PARAMS = dict(n_estimators=300, learning_rate=0.03, num_leaves=7, min_child_samples=25, subsample=0.8,
                  subsample_freq=1, colsample_bytree=0.8, reg_lambda=1.0, verbose=-1, random_state=7)


def level(prob: np.ndarray, kind: str) -> np.ndarray:
    med, high = RISK_THRESHOLDS[kind]
    return np.where(prob >= high, "High", np.where(prob >= med, "Medium", "Low"))


def precision_at_k(y: np.ndarray, p: np.ndarray, k: int) -> float:
    k = min(k, len(p))
    idx = np.argsort(-p)[:k]
    return float(np.mean(y[idx]))


@dataclass
class RiskModel:
    kind: str
    features: list[str]
    calibrated: CalibratedClassifierCV
    booster: lgb.LGBMClassifier
    explainer: shap.TreeExplainer
    metrics: dict
    importance: list[dict]
    medians: dict

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        return self.calibrated.predict_proba(X[self.features])[:, 1]

    def shap_values(self, X: pd.DataFrame) -> np.ndarray:
        sv = self.explainer.shap_values(X[self.features])
        return sv[1] if isinstance(sv, list) else sv

    def save(self):
        joblib.dump({k: getattr(self, k) for k in ("kind", "features", "calibrated", "booster", "metrics", "importance", "medians")},
                    ARTIFACTS / f"model_{self.kind}.joblib", compress=3)


def train(kind: str, X: pd.DataFrame, y: pd.Series, k_values=(25, 50, 100)) -> RiskModel:
    X = X.astype(float)
    y = y.astype(int).to_numpy()

    # ---- held-out evaluation (stratified 75/25) -------------------------------------------
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, stratify=y, random_state=11)
    cal = CalibratedClassifierCV(lgb.LGBMClassifier(**LGB_PARAMS), method="isotonic", cv=5).fit(Xtr, ytr)
    p = cal.predict_proba(Xte)[:, 1]
    base = make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), LogisticRegression(max_iter=2000, C=0.5)).fit(Xtr, ytr)
    pb = base.predict_proba(Xte)[:, 1]
    med, high = RISK_THRESHOLDS[kind]
    flagged_high = p >= high
    metrics = {
        "n_train": int(len(ytr)), "n_test": int(len(yte)), "positive_rate": round(float(y.mean()), 4),
        "roc_auc": round(roc_auc_score(yte, p), 4), "pr_auc": round(average_precision_score(yte, p), 4),
        "brier": round(brier_score_loss(yte, p), 4),
        "baseline_logreg": {"roc_auc": round(roc_auc_score(yte, pb), 4), "pr_auc": round(average_precision_score(yte, pb), 4)},
        "recall_at_high": round(float(flagged_high[yte == 1].mean()), 4) if (yte == 1).any() else None,
        "precision_at_high": round(float(yte[flagged_high].mean()), 4) if flagged_high.any() else None,
        "recall_at_medium_or_high": round(float((p >= med)[yte == 1].mean()), 4),
        "precision_at_k": {str(k): round(precision_at_k(yte, p, k), 4) for k in k_values if k <= len(yte)},
        "precision_at_k_baseline": {str(k): round(precision_at_k(yte, pb, k), 4) for k in k_values if k <= len(yte)},
        "thresholds": {"medium": med, "high": high},
    }
    # calibration curve (10 bins)
    bins = np.linspace(0, 1, 11)
    idx = np.digitize(p, bins) - 1
    metrics["calibration"] = [dict(bin=f"{bins[i]:.1f}-{bins[i + 1]:.1f}", predicted=round(float(p[idx == i].mean()), 3),
                                   observed=round(float(yte[idx == i].mean()), 3), n=int((idx == i).sum()))
                              for i in range(10) if (idx == i).sum() >= 5]
    # 5-fold CV AUC on everything (stability)
    aucs = []
    for tr, te in StratifiedKFold(5, shuffle=True, random_state=3).split(X, y):
        m = lgb.LGBMClassifier(**LGB_PARAMS).fit(X.iloc[tr], y[tr])
        aucs.append(roc_auc_score(y[te], m.predict_proba(X.iloc[te])[:, 1]))
    metrics["cv_roc_auc_mean"] = round(float(np.mean(aucs)), 4)
    metrics["cv_roc_auc_std"] = round(float(np.std(aucs)), 4)

    # ---- final models on all labelled data ---------------------------------------------------
    calibrated = CalibratedClassifierCV(lgb.LGBMClassifier(**LGB_PARAMS), method="isotonic", cv=5).fit(X, y)
    booster = lgb.LGBMClassifier(**LGB_PARAMS).fit(X, y)
    explainer = shap.TreeExplainer(booster)
    sv = explainer.shap_values(X)
    sv = sv[1] if isinstance(sv, list) else sv
    imp = np.abs(sv).mean(axis=0)
    importance = sorted([dict(feature=f, label=FEATURES.get(f, (f,))[0], mean_abs_shap=round(float(v), 4))
                         for f, v in zip(X.columns, imp)], key=lambda d: -d["mean_abs_shap"])
    medians = {c: float(X[c].median()) for c in X.columns}
    rm = RiskModel(kind, list(X.columns), calibrated, booster, explainer, metrics, importance, medians)
    rm.save()
    return rm


def _fmt(feature: str, v: float) -> str:
    label, unit, _ = FEATURES.get(feature, (feature, "", False))
    if v is None or np.isnan(v):
        return "missing"
    if feature in ("cs_family",):
        return "yes" if v >= 0.5 else "no"
    if feature in ("backlogs", "mocks", "hackathons", "certifications", "eng_total", "zero_weeks_recent", "year"):
        return f"{int(round(v))}"
    if unit == "%":
        return f"{v:.0f}%"
    if unit == "x":
        return f"{v:.2f}x"
    if unit in ("/wk", "/sem"):
        return f"{v:+.2f}{unit}" if "trend" in label.lower() else f"{v:.1f}{unit}"
    if unit == " pts":
        return f"{v:+.0f} pts"
    if unit == "/5":
        return f"{v:.1f}/5"
    return f"{v:.2f}" if feature == "cgpa" else f"{v:.0f}"


def explain_rows(model: RiskModel, X: pd.DataFrame, top_up: int = 4, top_down: int = 2) -> list[dict]:
    """Per-student drivers in plain language, e.g. 'Core-subject attendance 58% (cohort median 79%) raises risk'."""
    sv = model.shap_values(X)
    Xf = X[model.features].astype(float)
    out = []
    risk_word = "academic risk" if model.kind == "academic" else "placement risk"
    for i in range(len(X)):
        row = []
        order = np.argsort(-np.abs(sv[i]))
        for j in order:
            f = model.features[j]
            val, s = Xf.iat[i, j], sv[i, j]
            if abs(s) < 0.02:
                continue
            label, _, actionable = FEATURES.get(f, (f, "", False))
            row.append(dict(feature=f, label=label, value=None if np.isnan(val) else round(float(val), 3),
                            value_text=_fmt(f, val), median_text=_fmt(f, model.medians.get(f, np.nan)),
                            impact=round(float(s), 4), direction="raises" if s > 0 else "lowers", actionable=actionable,
                            text=f"{label} {_fmt(f, val)} (cohort median {_fmt(f, model.medians.get(f, np.nan))}) "
                                 f"{'raises' if s > 0 else 'lowers'} {risk_word}"))
        ups = [r for r in row if r["impact"] > 0][:top_up]
        downs = [r for r in row if r["impact"] < 0][:top_down]
        out.append({"raises": ups, "lowers": downs})
    return out
