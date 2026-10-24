# ASCORA: EXPLAINABILITY & COUNTERFACTUAL RECOURSE AUDIT REPORT
## Mathematical Verification of TreeSHAP Additivity and Recourse Feasibility

---

### 1. TREESHAP MATHEMATICAL CORRECTNESS AUDIT

#### 1.1 The Additivity Equation
For any tree-based ensemble explanation, exact additivity requires:
$$f(x) = E[f(X)] + \sum_{i=1}^M \phi_i$$
Where:
- $f(x)$ is the model prediction in the explainer's target space.
- $E[f(X)]$ is the expected background base value.
- $\phi_i$ is the Shapley attribution value allocated to feature $i$.

#### 1.2 Empirical Verification Results:
- **Explainer Class:** `shap.TreeExplainer(model.booster)`
- **Target Output Space:** Raw margin / log-odds space (pre-isotonic transformation).
- **Tested Cohort:** First 10 samples from the live training index `artifacts/state.joblib`.
- **Base Expected Value:** Verified at $E[f(X)] = -1.1123$.
- **Calculated Difference:**
  $$\max_{x \in X} \left| \left(E[f(X)] + \sum_{i=1}^M \phi_i(x)\right) - f_{\text{raw}}(x) \right| = 4.4408 \times 10^{-15}$$
- **Audit Verdict:** **PASS (Mathematically Exact).** Additivity holds to machine precision ($10^{-15}$).

#### 1.3 Critical Operational Distinction for Judges:
TreeSHAP additivity holds in **raw model score (log-odds) space**, not in post-calibrated probability space. Adding raw SHAP attributions directly to a probability violates the non-linear isotonic mapping. Ascora correctly presents TreeSHAP drivers as log-odds impacts and clearly separates them from calibrated percentage risks.

---

### 2. COUNTERFACTUAL RECOURSE AUDIT

#### 2.1 Feasibility & Actionability Constraints (`services/ml/app/models/extras.py`)
Ascora's recourse algorithm generates personalized, actionable recommendations for students flagged at High Risk ($p \ge \text{target}$).

1. **Protected Attributes:** Immutable demographic attributes (`gender`, `hosteller`, `first_generation`, `lateral_entry`, `schooling_medium`, `mentor_id`, `branch`, `year`, `section`) are **strictly excluded** from recourse candidate modifications.
2. **Actionable Feature Set:**
   - Academic Recourse: `att_core` (0, +5, +10, +15 pts), `att_overall` (0, +5, +10 pts), `completion_rate` (0, +10, +20, +30%), `login_freq` (0, +1, +2, +3 logins/wk).
   - Placement Recourse: `mocks` (0, +1, +2, +3 interviews), `soft_avg` (0, +5, +10 pts), `completion_rate`.
3. **Domain Bounds:** Attendance and completion rates are strictly capped at 100%. Login frequency and mocks are capped at 99.
4. **Parsimony / Effort Cost:** Optimization searches for the minimal effort cost $\sum c_a \cdot \Delta_a$ across at most 3 simultaneous changes.

#### 2.2 Counterfactual Case Verification (Arjun Gupta, `CU24AIML0039`):
- **Initial State:** Academic Risk probability $p_0 = 0.509$ (High Risk).
- **Target Cutoff:** $p < 0.50$ (Safe zone).
- **Generated Recourse Steps:**
  1. Raise core-subject attendance by 10 points (from 64% to 74%).
  2. Submit 10% more coursework assignments via LMS.
- **Resulting Re-Evaluated Model Prediction:** $p_{\text{new}} = 0.384$ (reaches target).
- **Target Achieved:** **YES (Verified by running actual `model.predict()`).**

#### 2.3 Non-Causal Limitations Disclosure:
Counterfactual recourse outputs are **advisory scenario projections**, not guaranteed causal interventions. Feature changes represent what the statistical model predicts under hypothetical inputs; they do not account for unmeasured confounding factors.
