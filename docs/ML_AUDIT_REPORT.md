# ASCORA: MACHINE LEARNING & ARCHITECTURE AUDIT REPORT
## KPMG in India HacXlerate 2026 Challenge 04

---

### EXECUTIVE SUMMARY
This audit provides an end-to-end technical verification of the Machine Learning subsystem, pipeline data flow, prediction serving, and explainability mechanisms within Ascora (`services/ml`). Every finding is grounded in the actual codebase, serialized joblib artifacts, synthetic dataset truth files, and executing test suites.

---

### 1. ARCHITECTURE & PREDICTION DATA FLOW
Ascora operates an decoupled institutional AI architecture comprising:
1. **Frontend / UI Layer (`apps/web`):** Next.js 15 App Router running React 19, Tailwind CSS, and shadcn/ui. Connects to Supabase via Row-Level Security (RLS) policies and communicates with the ML Service via signed HMAC tokens (`/api/ml-token`). Features an offline demo fallback (`demo-data/snapshot.json`).
2. **ML Backend Service (`services/ml`):** Python 3.11 FastAPI service orchestrating data ingestion, entity resolution, feature engineering, LightGBM model inference, TreeSHAP attribution, KMeans clustering, counterfactual recourse, and automated insight generation.
3. **Database & Storage (`supabase`):** PostgreSQL database with RLS partitioned across roles (`admin`, `mentor`, `student`).

#### Prediction Lineage Flow:
```
Raw Campus Silos (7 Sources)
       │
       ▼
[pipeline.py]: Ingest -> Standardize -> Entity Resolution -> Conflict Resolution
       │
       ▼
[clean/resolve.py & features/build.py]: 17 Engineering Features (Core Attendance, LMS Ratio, etc.)
       │
       ▼
[intelligence.py]:
  ├── Scoring: Success Score Percentile Combination (weights locked)
  ├── Models: LightGBM Academic & Placement Classifiers with Isotonic Calibration
  ├── Explainability: TreeSHAP (Margin space exact additivity)
  ├── Counterfactuals: Actionable Multi-step Feasible Recourse Grid Search
  └── Segments: KMeans (k=6) Behavioral Personas
       │
       ▼
[service.py]: Serialized to `artifacts/state.joblib` & Published to Supabase / `snapshot.json`
       │
       ▼
[apps/web/data.ts & ask-grounded.py]: Serves Dashboard, Student 360, & Copilot Answers
```

---

### 2. ML COMPONENT INVENTORY & VERIFICATION STATUS

| Component | File / Module | Current Implementation Status | Test & Execution Evidence | Risk & Limitations |
|---|---|---|---|---|
| **Backlog Risk Model** | `services/ml/app/models/risk.py` | **VERIFIED** | LightGBM Classifier (300 estimators, isotonic calibration). Held-out test ROC-AUC: 0.8809, Recall@High: 64.86%, Recall@MedOrHigh: 78.38%. | Requires internal marks and gatekeeper scores at inference time. |
| **Placement Readiness Model** | `services/ml/app/models/risk.py` | **VERIFIED** | LightGBM Classifier trained strictly on placement-intent cohort. Held-out test ROC-AUC: 0.8016, Brier score: 0.1749. | Students without declared placement intent are marked N/A to prevent bias. |
| **TreeSHAP Explainability** | `services/ml/app/models/risk.py` | **VERIFIED** | `shap.TreeExplainer` on raw booster. Exact additivity verified: max difference from raw score = $4.44 \times 10^{-15}$. | Additivity holds in raw margin/log-odds space, not post-isotonic calibrated probability space. |
| **Counterfactual Recourse** | `services/ml/app/models/extras.py` | **VERIFIED** | Bounded grid search across 6 actionable features (`att_core`, `mocks`, etc.). Immutable attributes protected. | Advisory suggestions; does not establish causal guarantees. |
| **Probability Calibration** | `services/ml/app/models/risk.py` | **VERIFIED** | `CalibratedClassifierCV(method='isotonic', cv=5)` fitted strictly on training fold. 10-bin calibration table reported. | Monotonic transform preserves ranking but requires >= 5 samples per bin. |
| **Engagement Drop Alert** | `services/ml/app/models/extras.py` | **VERIFIED** | Deterministic multi-condition alert rule (`lms_ratio < 0.6`, `internal_delta < -5`, `35 <= score <= 75`). N=63 flagged. | Deterministic rule-based filter rather than separate ML classifier. |
| **SGPA Estimation** | `services/ml/app/scoring/score.py` | **VERIFIED (Derived)** | Handled via academic score percentiles; verified LightGBM regressor achieves MAE 0.54, RMSE 0.76. | Full regression pipeline not serialized as a standalone endpoint in Round 1. |
| **Round 1 Baseline** | `services/ml/app/models/risk.py` | **VERIFIED** | Standardized Logistic Regression pipeline (`SimpleImputer` + `StandardScaler` + `LogisticRegression`). | Logistic regression achieves 0.8747 academic AUC and 0.8063 placement AUC. |

---

### 3. EXISTING TEST BASELINE & TEST SUITE RESULTS
- **ML Test Suite (`pytest -q` in `services/ml`):**
  - **146 passed in 22.20s**
  - All unit tests covering auth, connectors, freshness, mapping review, netguard, normalization, pipeline, ratelimiting, request logging, entity resolution, and grounded ask contract passed with zero failures.
- **Web Test Suite (`npm test` in `apps/web`):**
  - **94 passed in 459ms across 17 test files**
  - Zero regressions, clean typechecks (`npx tsc --noEmit` code 0).

---

### 4. CRITICAL ARCHITECTURAL ARTIFACTS PROTECTED
The following core configurations and files are preserved without modification:
1. `services/ml/app/config.py`: Thresholds and weights locked per hard rules.
2. `services/ml/app/scoring/score.py`: Component percentile ranking logic.
3. `services/ml/artifacts/*.joblib`: Existing trained model artifacts.
4. `supabase/migrations/`: Existing schema and migrations preserved.
