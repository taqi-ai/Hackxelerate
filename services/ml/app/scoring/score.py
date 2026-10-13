"""Student Success Score (0-100): transparent weighted sum of six component scores.

Each indicator is turned into a cohort percentile (rank-based, so a few extreme values cannot
distort it), indicators are averaged into a component, and components are combined with the
weights in config.SCORE_WEIGHTS. Feedback/satisfaction is deliberately excluded: an unhappy
student should not get a lower success score."""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

from ..config import BACKLOG_PENALTY, BACKLOG_PENALTY_CAP, NO_PLACEMENT_DATA_SCORE, SCORE_WEIGHTS

# component -> [(indicator, weight within component, higher_is_better)]
COMPONENTS = {
    "academic": [("cgpa", 0.5, True), ("cur_internal_pct", 0.3, True), ("internal_delta", 0.2, True)],
    "placement": [("aptitude", 0.3, True), ("coding", 0.3, True), ("mocks", 0.2, True), ("mock_rating", 0.2, True)],
    "attendance": [("att_overall", 0.5, True), ("att_core", 0.5, True)],
    "lms": [("login_freq", 0.35, True), ("completion_rate", 0.45, True), ("lms_slope", 0.2, True)],
    "skills": [("tech_avg", 0.5, True), ("soft_avg", 0.5, True)],
    "engagement": [("eng_weighted", 1.0, True)],
}
COMPONENT_LABELS = {"academic": "Academic", "placement": "Placement readiness", "attendance": "Attendance",
                    "lms": "LMS activity", "skills": "Skills", "engagement": "Engagement"}


class PercentileRef:
    """Frozen cohort distributions, so what-if changes are scored against the same cohort."""

    def __init__(self, f: pd.DataFrame):
        self.sorted = {c: np.sort(f[c].dropna().to_numpy(dtype=float)) for c in f.columns if f[c].dtype != object}
        self.medians = {c: float(np.median(v)) if len(v) else np.nan for c, v in self.sorted.items()}

    def pct(self, col: str, values: pd.Series) -> pd.Series:
        ref = self.sorted[col]
        v = values.to_numpy(dtype=float)
        lo = np.searchsorted(ref, v, side="left")
        hi = np.searchsorted(ref, v, side="right")
        p = 100 * (lo + hi) / 2 / max(1, len(ref))
        return pd.Series(np.where(np.isnan(v), np.nan, p), index=values.index)


def prepare(f: pd.DataFrame) -> pd.DataFrame:
    x = f.copy()
    x["eng_weighted"] = 3 * x["hackathons"] + 2 * x["certifications"] + x["workshops"] + x["clubs"]
    x["mocks"] = x["mocks"].fillna(0)
    return x


def component_scores(f: pd.DataFrame, ref: PercentileRef) -> pd.DataFrame:
    x = prepare(f)
    out = pd.DataFrame(index=x.index)
    for comp, inds in COMPONENTS.items():
        parts, wsum = 0, 0
        for col, w, hib in inds:
            p = ref.pct(col, x[col])
            if not hib:
                p = 100 - p
            if comp == "placement":
                p = p.where(x["visited_cell"], np.nan)
                if col == "mock_rating":
                    p = p.where(x["mocks"] > 0, 0.0)  # no mock interviews yet -> no rating credit
            parts = parts + w * p.fillna(np.nan)
            wsum += w
        s = parts / wsum
        if comp == "academic":
            # internals not available (missing marks): fall back to CGPA percentile alone
            s = s.fillna(ref.pct("cgpa", x["cgpa"]))
            s = s - np.minimum(BACKLOG_PENALTY * x["backlogs"].fillna(0), BACKLOG_PENALTY_CAP)
        if comp == "placement":
            s = s.where(x["visited_cell"], NO_PLACEMENT_DATA_SCORE)
        out[comp] = s.clip(0, 100).fillna(50.0).round(1)   # missing source -> neutral midpoint, flagged in UI
    return out


def success_score(components: pd.DataFrame, weights: dict[str, float] = SCORE_WEIGHTS) -> pd.Series:
    total = sum(weights.values())
    return (sum(components[c] * w for c, w in weights.items()) / total).round(1)


def sensitivity(components: pd.DataFrame, delta: float = 0.05, top_k: int = 100) -> dict:
    """Shift each weight by +/-5 points (renormalised) and measure how much the ranking moves."""
    base = success_score(components)
    base_top = set(base.nlargest(top_k).index)
    base_bottom = set(base.nsmallest(top_k).index)
    rows = []
    for comp in SCORE_WEIGHTS:
        for sign in (+1, -1):
            w = dict(SCORE_WEIGHTS)
            w[comp] = max(0.0, w[comp] + sign * delta)
            s = success_score(components, w)
            rho = spearmanr(base, s).statistic
            rows.append(dict(component=comp, shift=f"{'+' if sign > 0 else '-'}{int(delta * 100)} pts",
                             spearman=round(float(rho), 4),
                             top_overlap=round(len(base_top & set(s.nlargest(top_k).index)) / top_k, 3),
                             bottom_overlap=round(len(base_bottom & set(s.nsmallest(top_k).index)) / top_k, 3),
                             max_rank_shift=int((base.rank(ascending=False) - s.rank(ascending=False)).abs().max())))
    df = pd.DataFrame(rows)
    return {"scenarios": rows, "min_spearman": float(df.spearman.min()), "mean_bottom_overlap": float(df.bottom_overlap.mean()),
            "top_k": top_k}
