"""Phase 3: features -> Success Score -> risk models + SHAP -> segments -> alerts, recourse,
readiness, priority -> fairness, early-warning curve, what-works -> insights."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from .config import RISK_THRESHOLDS, SCORE_WEIGHTS
from .features.build import ACADEMIC_FEATURES, FEATURES, PLACEMENT_FEATURES, build_features, weekly_index
from .insights import auto as auto_insights
from .insights.llm import polish_insight
from .models import extras, round2, segments as seg
from .models.risk import explain_rows, level, train
from .pipeline import PipelineResult, StepLog
from .scoring.score import COMPONENT_LABELS, COMPONENTS, PercentileRef, component_scores, sensitivity, success_score


@dataclass
class Intelligence:
    features: pd.DataFrame
    components: pd.DataFrame
    scores: pd.DataFrame          # one row per student -> student_scores table
    segments: pd.DataFrame
    insights: list[dict]
    artifacts: dict[str, dict]
    ref: PercentileRef
    models: dict
    round2: dict | None = None     # per-student Round 2 outcomes (kept with the model state, not a database column)


def load_labels(truth_dir: Path) -> tuple[pd.Series, pd.Series]:
    """Outcome labels. In the demo they come from the generator's hidden truth; in production they would be
    last batch's end-semester results and final placement records."""
    t = pd.read_parquet(truth_dir / "_truth.parquet").set_index("student_id")
    return t["end_sem_fail_or_backlog"].astype(bool), (~t["placed_by_final_year"].astype("boolean"))


def run_intelligence(res: PipelineResult, log: StepLog, truth_dir: Path) -> Intelligence:
    # ---------------------------------------------------------------- features
    log.start("features")
    f = build_features(res.students, res.tables, res.weekly)
    log.done("features", students=len(f), features=len([c for c in f.columns if c in FEATURES]),
             missing_share={c: round(float(f[c].isna().mean()), 3) for c in ("cur_internal_pct", "gatekeeper_pct", "aptitude", "tech_avg", "login_freq")})

    # ---------------------------------------------------------------- score
    log.start("score")
    ref = PercentileRef(_score_frame(f))
    comps = component_scores(f, ref)
    score = success_score(comps)
    sens = sensitivity(comps)
    log.done("score", mean=round(float(score.mean()), 1), median=round(float(score.median()), 1),
             min_spearman_under_weight_shifts=round(sens["min_spearman"], 3))

    # ---------------------------------------------------------------- models
    log.start("models")
    y_acad, y_unplaced = load_labels(truth_dir)
    y_acad = y_acad.reindex(f.index)
    Xa = f[ACADEMIC_FEATURES]
    m_acad = train("academic", Xa, y_acad)
    p_acad = pd.Series(m_acad.predict(Xa), index=f.index)

    placement_track = f["intent_declared"] == "placement"
    yp = y_unplaced.reindex(f.index)
    train_mask = placement_track & yp.notna()
    Xp = f[PLACEMENT_FEATURES]
    m_plac = train("placement", Xp[train_mask], yp[train_mask].astype(bool))
    p_plac = pd.Series(np.nan, index=f.index)
    p_plac[placement_track] = m_plac.predict(Xp[placement_track])

    shap_a = dict(zip(f.index, explain_rows(m_acad, Xa)))
    pt_idx = f.index[placement_track]
    shap_p = dict(zip(pt_idx, explain_rows(m_plac, Xp.loc[pt_idx])))
    log.done("models", academic_auc=m_acad.metrics["roc_auc"], academic_baseline_auc=m_acad.metrics["baseline_logreg"]["roc_auc"],
             placement_auc=m_plac.metrics["roc_auc"], placement_baseline_auc=m_plac.metrics["baseline_logreg"]["roc_auc"],
             placement_track_students=int(placement_track.sum()))

    # ---------------------------------------------------------------- segments
    log.start("segments")
    seg_frame = comps.join(f[["lms_slope", "att_trend", "internal_delta"]])
    labels, seg_df, seg_meta = seg.segment(seg_frame)
    log.done("segments", k=seg_meta["k"], silhouette=seg_meta["silhouette"], personas=seg_df.set_index("persona")["size"].to_dict())

    # ---------------------------------------------------------------- per-student extras
    alerts = extras.alerts_for(f, comps, score)
    rec_a = extras.recourse(m_acad, Xa, "academic")
    rec_p = extras.recourse(m_plac, Xp.loc[pt_idx], "placement")
    ready = extras.readiness(f, comps)
    prio = extras.priority(p_acad, p_plac, alerts, shap_a)
    trend = weekly_index(res.weekly)
    persona_by_id = seg_df.set_index("id")["persona"]

    rows = []
    for sid in f.index:
        pa, pp = p_acad[sid], p_plac[sid]
        rows.append(dict(
            student_id=sid, success_score=float(score[sid]),
            components={c: float(comps.at[sid, c]) for c in comps.columns},
            academic_risk_prob=round(float(pa), 4), academic_risk_level=str(level(np.array([pa]), "academic")[0]),
            placement_risk_prob=None if np.isnan(pp) else round(float(pp), 4),
            placement_risk_level="N/A" if np.isnan(pp) else str(level(np.array([pp]), "placement")[0]),
            intent=f.at[sid, "intent_declared"] or "undecided",
            segment_id=int(labels[sid]), persona=persona_by_id[int(labels[sid])],
            shap_academic=shap_a.get(sid), shap_placement=shap_p.get(sid), alerts=alerts.get(sid, []),
            trend=trend.get(sid, []), recourse={k: v for k, v in (("academic", rec_a.get(sid)), ("placement", rec_p.get(sid))) if v},
            readiness=ready.get(sid), priority=float(prio[sid]),
            metrics={k: (None if pd.isna(f.at[sid, k]) else round(float(f.at[sid, k]), 2))
                     for k in ("cgpa", "backlogs", "att_overall", "att_core", "completion_rate", "login_freq", "mocks", "aptitude", "coding", "soft_avg", "tech_avg")}))
    scores = pd.DataFrame(rows).set_index("student_id", drop=False)

    # ---------------------------------------------------------------- insights + artifacts
    log.start("insights")
    ins = auto_insights.compute(f, comps, scores, res.students, res.tables, y_acad)
    for i in ins:
        i["body"] = polish_insight(i["title"], i["body"])
    fair_a = extras.fairness(res.students, scores["academic_risk_level"] == "High", y_acad, "academic")
    fair_p = extras.fairness(res.students[res.students.student_id.isin(pt_idx)],
                             scores.loc[pt_idx, "placement_risk_level"] == "High", yp.reindex(pt_idx), "placement")
    curve = extras.early_curve(res.students, res.tables, res.weekly, y_acad)
    hist_path = truth_dir / "_intervention_history.csv"
    ww = extras.what_works(pd.read_csv(hist_path) if hist_path.exists() else None)
    log.done("insights", count=len(ins), early_curve_week8_auc=next((c["roc_auc"] for c in curve if c["week"] == 8), None))

    truth = pd.read_parquet(truth_dir / "_truth.parquet").set_index("student_id")
    r2_students, r2_artifacts = round2.compute(res, f, scores, truth, score)   # no pipeline step of its own: the UI lists 12 steps

    cohort = _cohort_stats(f, comps, scores, res)
    artifacts = {
        "model_academic": dict(metrics=m_acad.metrics, importance=m_acad.importance, features=m_acad.features,
                               card=model_card("academic", m_acad.metrics, len(Xa))),
        "model_placement": dict(metrics=m_plac.metrics, importance=m_plac.importance, features=m_plac.features,
                                card=model_card("placement", m_plac.metrics, int(train_mask.sum()))),
        "score_formula": dict(weights=SCORE_WEIGHTS, components={k: [dict(indicator=i, weight=w, label=FEATURES.get(i, (i,))[0])
                                                                      for i, w, _ in v] for k, v in COMPONENTS.items()},
                              labels=COMPONENT_LABELS, thresholds=RISK_THRESHOLDS,
                              notes=["Each indicator is a cohort percentile (rank-based, robust to outliers).",
                                     "Backlogs subtract 8 points each from the Academic component (max 24).",
                                     "Feedback and satisfaction are excluded: an unhappy student must not get a lower score.",
                                     "Students who never visited the placement cell get a readiness of 15 (no evidence yet), shown as a data gap."]),
        "sensitivity": sens,
        "fairness_academic": fair_a, "fairness_placement": fair_p,
        "early_curve": {"points": curve, "k_frac": 0.2},
        "what_works": ww,
        "segmentation": seg_meta,
        "cohort": cohort,
        **r2_artifacts,
    }
    return Intelligence(features=f, components=comps, scores=scores, segments=seg_df, insights=ins, artifacts=artifacts,
                        ref=ref, models={"academic": m_acad, "placement": m_plac}, round2=r2_students)


def _score_frame(f: pd.DataFrame) -> pd.DataFrame:
    x = f.copy()
    x["eng_weighted"] = 3 * x["hackathons"] + 2 * x["certifications"] + x["workshops"] + x["clubs"]
    x["mocks"] = x["mocks"].fillna(0)
    return x.select_dtypes(exclude=[object])


def _cohort_stats(f, comps, scores, res: PipelineResult) -> dict:
    s = res.students.set_index("student_id").join(scores[["success_score", "academic_risk_level", "placement_risk_level"]])
    by_branch = s.groupby("branch").agg(n=("success_score", "size"), avg_score=("success_score", "mean"),
                                        high_acad=("academic_risk_level", lambda x: int((x == "High").sum())),
                                        high_plac=("placement_risk_level", lambda x: int((x == "High").sum()))).round(1)
    by_section = s.groupby(["branch", "year", "section"]).agg(n=("success_score", "size"), avg_score=("success_score", "mean"),
                                                              high_acad=("academic_risk_level", lambda x: int((x == "High").sum()))).round(1)
    hist = np.histogram(scores["success_score"], bins=range(0, 105, 5))[0].tolist()
    wk = res.weekly.groupby("week").agg(logins=("logins", "mean"), submitted=("submitted", "sum"), due=("due", "sum")).reset_index()
    wk["completion"] = (100 * wk["submitted"] / wk["due"]).round(1)
    att = res.tables["attendance"]["by_month"].apply(pd.Series)
    return dict(
        students=int(len(s)), mentors=int(res.mentors.shape[0]),
        avg_score=round(float(scores["success_score"].mean()), 1),
        high_academic=int((scores["academic_risk_level"] == "High").sum()),
        medium_academic=int((scores["academic_risk_level"] == "Medium").sum()),
        high_placement=int((scores["placement_risk_level"] == "High").sum()),
        placement_track=int((scores["placement_risk_level"] != "N/A").sum()),
        score_histogram=dict(bins=list(range(0, 100, 5)), counts=hist),
        by_branch=[dict(branch=b, **r) for b, r in by_branch.to_dict(orient="index").items()],
        by_section=[dict(branch=k[0], year=int(k[1]), section=k[2], **r) for k, r in by_section.to_dict(orient="index").items()],
        weekly=[dict(week=int(r.week), logins=round(float(r.logins), 2), completion=float(r.completion)) for r in wk.itertuples()],
        attendance_by_month={m: round(float(att[m].mean()), 1) for m in ("Aug", "Sep", "Oct") if m in att},
        intents=scores["intent"].value_counts().to_dict(),
        components_avg={c: round(float(comps[c].mean()), 1) for c in comps.columns},
    )


def model_card(kind: str, m: dict, n: int) -> str:
    target = ("end-semester failure or new backlog this semester" if kind == "academic"
              else "not placed by the end of final year (placement-intent students only)")
    return f"""# Model card: {kind} risk

**Predicts:** probability of {target}.
**Model:** LightGBM gradient-boosted trees, isotonic-calibrated (5-fold), compared against a logistic-regression baseline.
**Training data:** {n} synthetic students (Ascora generator, seed 42). Features use only information available before the outcome
(past semesters, current internals after mid-sem, attendance and LMS activity up to week 12, placement-cell and skills records).
**Not used as features:** gender, residence, first-generation status, lateral entry, schooling medium (audited separately for fairness).

## Held-out performance (25% stratified test set)
| Metric | LightGBM | Logistic baseline |
|---|---|---|
| ROC-AUC | {m['roc_auc']} | {m['baseline_logreg']['roc_auc']} |
| PR-AUC | {m['pr_auc']} | {m['baseline_logreg']['pr_auc']} |
| Precision@50 | {m['precision_at_k'].get('50')} | {m['precision_at_k_baseline'].get('50')} |

5-fold CV ROC-AUC: {m['cv_roc_auc_mean']} ± {m['cv_roc_auc_std']}. Brier score: {m['brier']}.
Recall at the High threshold ({m['thresholds']['high']}): {m['recall_at_high']}; at Medium or above ({m['thresholds']['medium']}): {m['recall_at_medium_or_high']}.

## Intended use
Prioritising mentor attention and support (tutoring, mock interviews, counselling referrals). A human always decides.

## Prohibited uses
Disciplinary action, admission or scholarship decisions, inferring mental health, showing risk labels to students,
or any automated decision without a mentor's review.

## Limitations
Trained on synthetic data; real deployment needs re-training on the college's own historical outcomes, a fresh fairness
audit, and periodic monitoring for drift. Precision@k is the honest metric: mentors can meet only k students a week.
"""
