# Ascora Student Success Score & Predictive Risk Methodology
**KPMG Challenge 04: Smart Campus Analytics Technical Specification**

*This document defines the mathematical formulation, machine learning architecture, calibration, explainability, and governance policies underlying the Ascora Student Success Score and Dual-Risk Engine.*

---

## 1. Core Principles

The Ascora analytical engine adheres to five foundational engineering principles:

1. **Rank Attention, Never Label People**: The score exists to prioritize mentor bandwidth and intervention resources, not to place deterministic labels on human potential.
2. **Deterministic Percentiles Over Raw Marks**: A 7.5 CGPA in Electrical Engineering represents a different academic position than a 7.5 in Computer Science. All raw indicators are normalized against cohort distributions via rank-based percentiles to prevent branch or batch distortions.
3. **Dual-Risk Disentanglement**: Academic risk and placement risk arise from distinct student dynamics. A student with an 8.8 CGPA but zero coding practice is at severe placement risk, whereas a student with strong coding skills but falling attendance is at academic risk. They are modeled independently.
4. **Missing Data is a Gap, Not a Penalty**: Unobserved data (e.g. an elective placement test not attended by a higher-studies aspirant) is never treated as a score of zero. Gaps are handled through neutral defaults and confidence indicators.
5. **No Demographic Proxies**: Gender, residence, caste, schooling medium, and first-generation college status are strictly excluded from all scoring and predictive feature sets.

---

## 2. Mathematical Definition of the Student Success Score

The **Student Success Score** is a composite metric scaled from **0 to 100**, computed as the credit-weighted sum of six component sub-scores:

$$\text{Success Score} = \sum_{k=1}^{6} w_k \cdot C_k$$

Where:
$$\sum_{k=1}^{6} w_k = 1.00 \quad \text{and} \quad C_k \in [0, 100]$$

### Configured Component Weights (`services/ml/app/config.py`)

| Component ($C_k$) | Weight ($w_k$) | Internal Indicator Composition |
| :--- | :---: | :--- |
| **Academic** | **30%** | CGPA percentile (50%), Current semester internal marks percentile (30%), Semester SGPA momentum vs historical average (20%). *Active backlogs apply an additive penalty: $-8$ points per backlog, capped at $-24$ points.* |
| **Placement Readiness** | **20%** | Quantitative & logical aptitude score (30%), Technical coding test percentile (30%), Mock interview attendance (20%), Faculty mock interview rating (20%). |
| **Attendance** | **15%** | Overall campus attendance percentage (50%), Core/departmental mandatory subject attendance (50%). |
| **LMS Activity** | **15%** | LMS logins per active teaching week (35%), Coursework assignment completion rate (45%), Login frequency trend (20%). |
| **Skills Assessment** | **10%** | Technical domain assessment percentile (50%), Soft skills & communication rating (50%). |
| **Engagement** | **10%** | Weighted extracurricular participation index: Hackathons ($\times 3$), Technical certifications ($\times 2$), Workshops ($\times 1$), Student clubs ($\times 1$). |

### Formula Stability & Sensitivity Analysis

To verify that the score is not an arbitrary artifact of weight tuning, sensitivity analysis was conducted by perturbing every component weight by $\pm 5\%$ across 12 distinct scenarios:
- **Minimum Spearman Rank Correlation**: $r_s = 0.997$ across all 12 scenarios.
- **Cohort Top/Bottom Retention**: On average, **96%** of students identified in the bottom 100 priority tier remain identical across perturbations.

---

## 3. Dual-Risk Machine Learning Models

Rather than using heuristic score thresholds to infer risk, Ascora implements two distinct, calibrated machine learning pipelines:

### 3.1 Academic Risk Model
- **Target Outcome**: Semester failure or acquisition of a new academic backlog in the terminal semester examination.
- **Algorithm**: Calibrated LightGBM classifier with isotonic regression, compared against an L2-regularized logistic regression baseline.
- **Feature Set**: 18 pre-examination indicators including attendance velocity, assignment completion, mid-term test scores, active backlogs, and LMS recency. No forward-looking examination results are included (zero data leakage).
- **Validation Metrics (5-Fold Stratified Cross-Validation on 1,200 Cohort)**:
  - Held-out ROC-AUC: **0.881** (Logistic baseline: 0.875)
  - 5-Fold Cross-Validated AUC: **0.870**
  - Precision at Top 50 ($\text{P}@50$): **0.78** (78% of the top 50 flagged students truly required intervention)
  - High Risk Recall: **65%** at a precision of **71%**

### 3.2 Placement Readiness Risk Model
- **Target Outcome**: Failure to secure campus placement offer prior to the final academic semester.
- **Population Scoping**: Applied strictly to students who declare `placement` as their primary post-graduation intent. Students declaring `higher_studies`, `government_exams`, or `entrepreneurship` are routed to specialized milestone trackers and are not penalized with placement flags.
- **Feature Set**: 14 indicators including coding contest percentiles, mock interview ratings, aptitude benchmarks, technical certifications, and communication assessments.
- **Validation Metrics**:
  - Held-out ROC-AUC: **0.802** (Logistic baseline: 0.806)
  - 5-Fold Cross-Validated AUC: **0.839**
  - Precision at Top 50 ($\text{P}@50$): **0.62**
  - High Risk Recall: **55%** at a precision of **76%**

---

## 4. Local Explainability & Counterfactual Guidance

### 4.1 SHAP Driver Attributions
Every student score and risk flag is decomposed using TreeSHAP into localized feature attributions:
$$\phi_i(x) = \sum_{S \subseteq F \setminus \{i\}} \frac{|S|!(|F| - |S| - 1)!}{|F|!} \left[ f(S \cup \{i\}) - f(S) \right]$$

In the student profile interface (`/students/[id]`), these values are translated into transparent, non-technical explanations:
- *Example Driver*: "Core subject attendance is 61% (cohort median: 78%), raising academic risk by +18 percentage points."
- *Example Asset*: "CGPA is 8.42 (cohort 82nd percentile), lowering academic risk by -14 percentage points."

### 4.2 Actionable Counterfactuals ("What Helps")
The engine computes the minimum perturbation required along actionable indicators to transition a student from High/Medium risk to Low risk:
- *Actionable Indicators*: Core attendance, assignment submissions, mock interviews.
- *Non-Actionable Indicators (Immutable)*: Historical semester backlogs, completed semester CGPA.
- *Prescriptive Output*: "Attending 7 consecutive upcoming core lectures recovers overall attendance to 75% and lowers academic risk below the threshold."

---

## 5. Ethical Governance, Fairness & DPDP Compliance

Ascora incorporates strict algorithmic safeguards aligned with the **Digital Personal Data Protection (DPDP) Act 2023** and IEEE AI ethics principles:

1. **Four-Fifths Disparate Impact Audit**:
   - The predictive flag rates across demographic sub-populations (gender, rural vs urban residence, schooling medium, lateral entry) are audited against the 80% threshold.
   - Any group ratio below 0.80 is flagged for human institutional review in the system audit report (`/fairness`).
2. **Access Scoping & Contact Masking**:
   - Students see only their personal academic projections and schedule.
   - Mentors see only their assigned mentees.
   - Administrators see aggregated institutional health.
   - Email addresses and phone numbers are dynamically masked across all client views (`ma****@cumail.in`, `+91 ******12`).
3. **Audit Logging**:
   - Every view of an individual student record and every intervention modification is persisted to the immutable `public.audit_log` table.
