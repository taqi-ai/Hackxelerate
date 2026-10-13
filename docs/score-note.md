# Ascora Student Success Score: how it works

*Deliverable 2 of the KPMG challenge. All numbers are from the frozen synthetic demo cohort (1,200 students, seed 42); they are measured, not estimated.*

## What the score is

A single number from 0 to 100 that summarises how well a student is doing across six areas of campus life. It exists to **rank attention**, not to label people. It is never shown to students, and it is always shown next to its breakdown.

## Indicators and how they combine

Every indicator is first converted to a **cohort percentile** (rank-based, so a few extreme values cannot distort it). Indicators are averaged into six components, then combined with fixed weights.

| Component | Weight | Indicators (weight inside the component) |
|---|---|---|
| Academic | 30% | CGPA (50%), current-semester internal marks (30%), internals vs the student's own past average (20%). Each active backlog subtracts 8 points, capped at 24. |
| Placement readiness | 20% | Aptitude (30%), coding (30%), mock interviews attended (20%), mock interview rating (20%) |
| Attendance | 15% | Overall attendance (50%), core-subject attendance (50%) |
| LMS activity | 15% | Logins per week (35%), assignment completion (45%), login trend (20%) |
| Skills | 10% | Technical assessment (50%), soft-skill assessment (50%) |
| Engagement | 10% | Weighted count of hackathons (x3), certifications (x2), workshops, clubs |

`Success Score = 0.30 Academic + 0.20 Placement + 0.15 Attendance + 0.15 LMS + 0.10 Skills + 0.10 Engagement`

The weights live in one file (`services/ml/app/config.py`) so a college can tune them.

## Deliberate choices

- **Feedback is excluded.** An unhappy student must not receive a lower score. Feedback is shown as context only.
- **Missing data is a gap, not a failure.** A student who never visited the placement cell gets a neutral-low readiness of 15 and the UI says "no data". A source with no rows for a student becomes a neutral 50 in that component.
- **Percentiles, not raw marks.** A 7.2 CGPA means different things in different cohorts; position within the cohort is comparable across branches.
- **Two risks, never one blended label.** Academic risk and placement risk are separate models with separate drivers. Placement risk applies only to students whose declared goal is placement; students aiming for higher studies, government exams or entrepreneurship get a goal-specific readiness view instead of a false placement flag.

## Is the score stable?

We shifted every weight by +5 and -5 points (renormalised) and re-ranked all 1,200 students. The lowest rank correlation across the 12 scenarios is **0.997**, and on average **96%** of the bottom 100 students stay the same. The score is not an artefact of the exact weights.

## Risk models (separate from the score)

| | Academic risk | Placement risk |
|---|---|---|
| Outcome | End-semester failure or new backlog | Not placed by final year (placement-track students) |
| Model | Calibrated LightGBM, compared with a logistic baseline | Same |
| Held-out ROC-AUC | 0.881 (baseline 0.875); 5-fold CV 0.870 | 0.802 (baseline 0.806); 5-fold CV 0.839 |
| Precision at top 50 | 0.78 | 0.62 |
| Recall at High threshold | 65% (precision 71%) | 55% (precision 76%) |

On this synthetic data a plain logistic regression is almost as good as the boosted trees. We report that openly; the value of the tree model here is the calibrated probabilities and per-student SHAP explanations, not a large accuracy gain. Precision at k is the honest metric: a mentor can only meet k students a week.

Features use only information available before the outcome (no leakage). Gender, residence, first-generation status, lateral entry and schooling medium are never model inputs; they are used only in the fairness audit.

## Explainability

Every flag shows its top drivers in plain language ("Core-subject attendance 62%, cohort median 78%, raises academic risk") computed with SHAP, and marks which drivers a mentor can act on. The Success Score shows its six component values on every student profile.

## Honest limits

- The data is synthetic and the outcomes were generated from hidden factors we planted, so accuracy figures show the pipeline works, not how it would perform at a real college.
- Fairness audit result: six of ten group checks are within thresholds. Four are marked "review needed": residence (academic risk), lateral entry (academic and placement) and gender (placement). The flag-rate ratios are 0.77 to 0.89 against a 0.80 threshold, and lateral entry is a small group (about 8% of year 3) with wide error bars. They should be investigated before any real use.
- Risk estimates are probabilities from a model, not verdicts. A mentor always decides.
