# ASCORA: KPMG 60-SECOND TECHNICAL DEFENSE & CHEATSHEET
## Grounded Machine Learning Defense for KPMG Judges

---

### PART A: 60-SECOND SPOKEN PRESENTATION (TIMED FOR LIVE JUDGING)

> "Judges, traditional student success platforms fail because they treat machine learning as a black box and academic performance as a single composite number.
> 
> Ascora unites 7 disparate university silos into calibrated, multi-outcome LightGBM models.
> 
> We chose LightGBM over deep neural networks because campus tabular data exhibits non-linear threshold effects—like a 65% attendance cutoff—which decision trees capture natively with low inference latency.
> 
> Rather than raw uncalibrated outputs, our models use 5-fold cross-validated isotonic calibration. When Ascora alerts a Dean to an 80% backlog risk, 78% of students in that decile genuinely fail without support.
> 
> For explainability, we compute exact TreeSHAP attributions in margin space with zero reconstruction error. For actionability, our constrained counterfactual recourse searches only actionable features—like mock interviews and LMS logins—while protecting immutable student attributes.
> 
> Compared to Round 1 logistic regression baselines, we maintain strong 0.88 ROC-AUC while lifting Precision@50 to 78%, ensuring faculty mentor time is never squandered on false alarms."

---

### PART B: TECHNICAL DEFENSE CHEATSHEET

#### 1. Mathematical Formulas & Definitions
- **MAE:** $\text{MAE} = \frac{1}{n} \sum |y_i - \hat{y}_i| = 0.542$ SGPA points.
- **RMSE:** $\text{RMSE} = \sqrt{\frac{1}{n} \sum (y_i - \hat{y}_i)^2} = 0.756$ SGPA points.
- **Recall:** $\text{Recall} = \frac{\text{TP}}{\text{TP} + \text{FN}} = 64.9\%$ at high risk threshold ($\ge 0.50$); $78.4\%$ at medium/high threshold ($\ge 0.25$).
- **Precision:** $\text{Precision} = \frac{\text{TP}}{\text{TP} + \text{FP}} = 70.6\%$ at high risk threshold; $88.0\%$ at top-25 alerts.
- **TreeSHAP Additivity:** $f(x) = E[f(X)] + \sum_{i=1}^M \phi_i$. Verified diff: $4.44 \times 10^{-15}$.

#### 2. Key Questions KPMG Judges Will Ask & Defensible Answers

##### Q1: Why did you choose LightGBM instead of Deep Learning or XGBoost?
**Answer:** Campus tabular data contains mixed numerical, categorical, and missing features with sharp domain threshold boundaries (e.g., the 65% mandatory attendance rule and 5.0 SGPA promotion limit). Gradient boosted decision trees consistently outperform deep learning on small-to-medium tabular cohorts ($N=1,200$). LightGBM's leaf-wise tree growth with strict regularization (`num_leaves=7`, `min_child_samples=25`) prevents overfitting and provides microsecond inference for our live interactive simulator.

##### Q2: Does probability calibration improve your model's ROC-AUC?
**Answer:** No, and claiming it does is mathematically incorrect. Isotonic calibration is a strictly monotonic transformation. By definition, monotonic transformations preserve the rank ordering of predictions and therefore leave ROC-AUC unchanged. Calibration improves the **Brier score** (from 0.128 down to 0.116) and reliability, aligning predicted probabilities with empirical event frequencies so the Dean can trust risk percentages.

##### Q3: How do you know TreeSHAP isn't hallucinating explanations?
**Answer:** We mathematically verified exact additivity between the tree booster's margin prediction and the sum of TreeSHAP attributions plus the expected value ($f(x) = E[f(X)] + \sum \phi_i$). The maximum reconstruction residual across our cohort is $4.44 \times 10^{-15}$, proving exact machine-precision consistency. Furthermore, TreeSHAP values are calculated strictly on pre-prediction features, preventing temporal data leakage.

##### Q4: How does your counterfactual engine prevent nonsensical recommendations?
**Answer:** Our recourse algorithm (`services/ml/app/models/extras.py`) enforces strict feasibility constraints:
1. Immutable demographic traits (gender, caste, background, mentor, branch) are masked and never modified.
2. Only 6 actionable behavioral inputs (`att_core`, `att_overall`, `completion_rate`, `login_freq`, `mocks`, `soft_avg`) can be incremented.
3. Feature caps are strictly bounded (e.g., attendance cannot exceed 100%).
4. Parsimony is enforced by bounding changes to at most 3 levers with minimal effort cost.
5. Every candidate recourse is re-evaluated by the actual trained model (`model.predict()`) to confirm risk drops below the target threshold.

##### Q5: Why is your Engagement Drop recall 36.8% instead of 90%?
**Answer:** Because we report real, un-inflated numbers. Out of 106 true silent decliners in the ground-truth cohort, our rule identifies 39 true positives and 24 false positives (61.9% precision). Silent decliners are by definition hard to catch early because their historical grades look average. Rather than loosening thresholds and overwhelming faculty with false positives, our rule targets students with both LMS collapse and internal exam drops, catching 39 students weeks before end-semester exams.

##### Q6: How does Ascora ingest data from portals like CU Lucknow (`student.culko.in`)?
**Answer:** Ascora respects institutional security boundaries and DPDP 2023 compliance. We do not use credential-scraping bots that bypass university WAFs and CAPTCHAs. Instead, Ascora provides:
1. Authorized administrative batch ingestion matching the university's ERP export format.
2. An institutional data & portal dashboard with verified manual import (`apps/web/src/app/(app)/student/connection/page.tsx`) where students can import their validated academic progress with explicit provenance tags.
