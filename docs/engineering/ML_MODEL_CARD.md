# Model card: Ascora academic and placement risk (v1, synthetic)

**Status: PROTOTYPE, NOT VALIDATED ON REAL INSTITUTIONAL OUTCOMES.** Every number below was measured on the generated
evaluation cohort (`data/demo`, seed 42), whose outcome labels were produced by the same generator as the features.
They show the pipeline works end to end; they say nothing about accuracy at a real college.

## Intended use
Rank students for a mentor's attention and explain why. Decision support only: a flag never triggers discipline,
course removal, placement exclusion or disclosure. A human decides every action. Not for students' own view.

## Models
| | Academic risk | Placement risk |
|---|---|---|
| Outcome | end-semester failure or a new backlog | not placed by final year |
| Population | all students (n = 1,200) | placement-intent students only (n = 499); others get "Not applicable" |
| Algorithm | LightGBM, isotonic calibration (5-fold), logistic-regression baseline | same |
| Features (`app/features/build.py`) | CGPA, backlogs, SGPA slope, current internals %, internals vs own average, gatekeeper subject %, attendance (overall, core, trend), LMS logins, completion, LMS slope and ratio, zero-activity weeks, engagement, year, programme family | CGPA, backlogs, aptitude, coding, mocks, mock rating, technical and soft skills, communication, hackathons, certifications, engagement, completion, LMS slope, attendance, year, programme family |
| Excluded on purpose | gender, residence, first-generation, lateral entry, schooling medium (fairness audit only) | same |

## Evaluation (stored in `services/ml/artifacts/model_*.joblib`, reproduced 2026-10-20)
Split: stratified random 75/25 (`random_state=11`), plus 5-fold CV on all labelled rows.

| Metric | Academic | Academic baseline | Placement | Placement baseline |
|---|---|---|---|---|
| Train / test | 900 / 300 | | 374 / 125 | |
| Positive rate | 24.8% | | 37.5% | |
| ROC-AUC (test) | 0.881 | 0.875 | 0.802 | 0.806 |
| PR-AUC (test) | 0.729 | 0.725 | 0.752 | 0.698 |
| Brier | 0.117 | | 0.175 | |
| 5-fold CV ROC-AUC | 0.870 ± 0.016 | | 0.839 ± 0.029 | |
| Precision @25 / @50 / @100 | 0.88 / 0.78 / 0.58 | 0.88 / 0.76 / 0.58 | 0.84 / 0.62 / 0.45 | 0.76 / 0.62 / 0.45 |
| High threshold | 0.50: precision 0.71, recall 0.65 | | 0.60: precision 0.76, recall 0.55 | |
| Medium-or-high recall | 0.78 (from 0.25) | | 0.77 (from 0.35) | |

Reading: the logistic baseline is statistically level with LightGBM on this data. LightGBM is kept for calibrated
probabilities and TreeSHAP explanations, not for an accuracy gain.

Reproduce: `cd services/ml && .venv/Scripts/python scripts/run_full_check.py` (retrains and prints metrics).

## Leakage audit (2026-10-20)
- Prediction time is week 12 of the semester (`CURRENT_WEEK = 12`); every feature is computed from weeks 1 to 12 or
  from earlier semesters. The academic outcome is the end-semester result, which is after week 12: no post-outcome
  features. Placement outcome is end of final year: same.
- Weakness: the split is random, not time-based. A real deployment must validate out-of-time (train on past
  cohorts, test on a later one) before any threshold is trusted.
- Weakness (synthetic only): labels and features come from shared latent factors in the generator, so the task is
  easier than reality. Expect lower real-world performance.

## Explanations
TreeSHAP values are computed from the actual model for each student (`models/risk.py`). They describe the model's
behaviour, not causes. "What helps" counterfactuals are conditional simulations under the model, with the
assumptions shown, never promises.

## Fairness
Flag-rate audit across 10 group comparisons (page `/fairness`): 6 within thresholds, 4 marked "review needed"
(residence for academic risk; lateral entry for both; gender for placement). Groups are small; must be reviewed by the
institution before any real use.

## Before any real pilot (gates)
1. Train only on the institution's authorised historical outcomes; never across institutions.
2. Out-of-time validation; calibration and subgroup errors reported; thresholds set with the institution against
   mentor capacity and the cost of misses.
3. Versioned model artefacts with staged rollout and rollback; drift monitoring once outcomes mature.
4. Sign-off by an institution owner after reviewing the fairness report.
