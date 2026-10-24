# ML and data validation (re-run 2026-10-24)

Full model card: `engineering/ML_MODEL_CARD.md`. This file records what was re-run in this session.

## Reproduction
Command: `cd services/ml && .venv/Scripts/python scripts/run_full_check.py` (local, ~21 s, frozen synthetic set in `data/demo`). The script retrains and overwrites `artifacts/model_*.joblib`; those tracked files were restored with `git checkout` afterwards, so nothing changed in the repo.

| Metric (held-out 25%) | Result now | Reported baseline |
|---|---|---|
| Academic ROC-AUC | 0.8809 | 0.881 |
| Academic PR-AUC | 0.7292 | 0.729 |
| Academic 5-fold CV ROC-AUC | 0.8697 | 0.870 |
| Academic logistic baseline ROC-AUC | 0.8747 | 0.875 |
| Placement ROC-AUC (n = 499 intent students) | 0.8016 | 0.802 |
| Placement 5-fold CV ROC-AUC | 0.839 | 0.839 |
| Placement logistic baseline ROC-AUC | 0.8063 | 0.806 |
| Precision at high threshold (academic / placement) | 0.706 / 0.765 | 0.71 / 0.76 |

The reported figures reproduce. No evaluation code or expected values were changed.

## Reading the numbers
- Data are synthetic and labels share generator factors with the features, so this is a pipeline check, not evidence of real accuracy.
- The logistic baseline matches LightGBM (academic 0.875 vs 0.881; placement baseline is slightly higher at 0.806 vs 0.802). The boosted model is kept for calibration and TreeSHAP, not for accuracy.
- The split is random, not out-of-time; the test set is 300 (academic) and 125 (placement) rows, so differences of about 0.01 AUC are noise.
- Early-warning curve on the same data: week 2 AUC 0.81, week 8 0.84, week 12 0.86 (attendance and LMS only until mid-semester internals exist).

## Code-level checks done this session
- Exact header synonyms now take precedence over fuzzy matches (a column named "ID" could previously claim the roll-number field before an exact "Roll No"); regression test added; the full pytest suite (100 tests, including model determinism tests) passes.
- Not re-audited here: label construction, calibration fitting, SHAP correctness (covered by the 2026-10-20 leakage audit in the model card), fairness group sizes.

## Open validity risks
Out-of-time validation on real outcomes, per-group calibration, small fairness groups (4 of 10 comparisons marked "review needed"), no confidence intervals on the test-set metrics.
