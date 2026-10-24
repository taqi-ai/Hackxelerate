# External public-data benchmark: OULAD early warning

An **independent experiment**. It does not validate Ascora's production models (terminal backlog, placement risk), uses none of Ascora's synthetic data, and says nothing about transfer to any Indian institution.

## Source, license, attribution
- Open University Learning Analytics Dataset (OULAD), anonymised, released under **CC BY 4.0** (stated on the [OU Analyse dataset pages](https://research.stem.open.ac.uk/ouanalyse/open-dataset-more/) and in the paper).
- Cite: Kuzilek J., Hlosta M., Zdrahal Z., "Open University Learning Analytics dataset", *Scientific Data* 4:170171 (2017), doi:10.1038/sdata.2017.171.
- Download used: the UCI Machine Learning Repository mirror (DOI 10.24432/C5KK69, also CC BY 4.0), file `open+university+learning+analytics+dataset.zip`, 46.7 MB. The OU's own link (`schools.stem.open.ac.uk/cdn/files/anonymisedData.zip`) returned HTTP 404 on 2026-10-24. The mirror's contents were not compared against the OU original.
- The data are **not committed** (`data/external/` is git-ignored). Only the aggregate result file is in the repo.

## Data
Seven CSV files: `studentInfo`, `studentRegistration`, `studentVle` (about 10.6 M click rows), `vle`, `assessments`, `studentAssessment`, `courses`. 32,593 student-course-presentation rows, 7 modules, presentations 2013B, 2013J, 2014B, 2014J. Fields used: see below. Not used: gender, age band, disability, region, IMD band, highest education (protected or demographic; Ascora also keeps such attributes out of model inputs).

## Experiment
- **Unit:** one (student, module, presentation).
- **Target:** `Fail` or `Withdrawn` = 1; `Pass` or `Distinction` = 0.
- **Observation window:** days 0 to 27 of the presentation (cutoff 28). Pre-start registration and pre-start clicks (negative days) are allowed.
- **Exclusion:** 5,040 rows (15.5%) where the student unregistered before day 28, because their outcome is already known inside the window. These are mostly withdrawals, so this benchmark **excludes the easiest positives** and its prevalence is lower than the raw data's. 27,553 rows remain.
- **Features (18):** VLE clicks total, per week 1-4 and before the start (log1p), active days, distinct sites, first and last activity day, no-activity flag; assessments due by day 27, submitted by day 27, submitted share, mean score on those; days registered before start; studied credits; previous attempts.
- **Leakage controls:** every event is date-filtered to the window; no `final_result`, no later assessments, no unregistration date after the cutoff. Median imputation, scaling, isotonic calibration and the flag threshold are fitted on training data only (calibration on grouped out-of-fold scores).
- **Split (out of time):** train on 2013B, 2013J, 2014B (18,334 rows, prevalence 45.9%); test on 2014J (7,932 rows after removing 1,287 test rows whose student also appears in training; prevalence 38.4%). Training folds are grouped by student.
- **Models:** logistic regression (baseline) and LightGBM with isotonic calibration. No hyperparameter search; settings fixed in the script.

## Results (test set, 2014J; single run, seed 7, 9.5 s)
| | Logistic baseline | LightGBM + isotonic |
|---|---|---|
| ROC-AUC | 0.700 (95% bootstrap CI 0.688 to 0.711) | 0.699 (0.688 to 0.711) |
| PR-AUC (prevalence 0.384) | 0.546 | 0.543 |
| Brier | 0.225 | 0.228 |
| ECE (10 bins) | 0.062 | 0.079 |
| Training out-of-fold ROC-AUC | 0.760 | 0.768 |
| Flag top 20% (threshold from training): precision / recall | 0.62 / 0.32 | 0.62 / 0.34 |

By module (LightGBM, descriptive): ROC-AUC 0.59 (BBB) to 0.78 (CCC); full table in `docs/benchmarks/oulad_results.json`.

## What this shows and does not show
- With four weeks of activity, a standard model ranks at-risk students better than chance (AUC about 0.70) but only modestly; flagging 20% of students finds about a third of Fail/Withdrawn cases at 62% precision.
- The more complex model gives **no gain over logistic regression**, as with Ascora's synthetic data. The out-of-time AUC (0.70) is lower than the in-training out-of-fold AUC (0.76-0.77): performance falls when the presentation changes, and module differences are large.
- Ascora's synthetic-cohort AUCs (0.88 academic, 0.80 placement) are **not comparable** with this 0.70: different target, population, features, split and data origin. Do not present one as a confirmation of the other. The honest reading is that the synthetic cohort is easier than real data.
- Calibration is acceptable but imperfect (ECE 6 to 8 points); probabilities should be treated as unvalidated.
- Not tested: the 28-day cutoff was fixed, not tuned; no other cutoffs, no fairness analysis (demographics were deliberately excluded), no confidence interval for the by-module figures, single seed.

## Reproduce
```bash
mkdir -p data/external/oulad && cd data/external/oulad
curl -L -o oulad.zip "https://archive.ics.uci.edu/static/public/349/open+university+learning+analytics+dataset.zip"
python -I -c "import zipfile; zipfile.ZipFile('oulad.zip').extractall('.')"
cd ../../../services/ml
.venv/Scripts/python scripts/oulad_benchmark.py ../../data/external/oulad ../../docs/benchmarks/oulad_results.json
```
Script: `services/ml/scripts/oulad_benchmark.py` (uses pandas, scikit-learn, LightGBM, all already installed). It does not touch Ascora's database or demo data.

## Interface
Not added. The benchmark is documented here and in the founder handoff only; showing it in the web app would need a separate, clearly labelled section, and no such section exists yet.
