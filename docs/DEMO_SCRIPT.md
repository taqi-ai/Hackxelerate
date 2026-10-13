# Ascora Evaluator Demonstration Script
**KPMG Challenge 04: AI-Powered Student Analytics and Success Platform**
**Live Walkthrough & Verification Playbook (5–7 Minutes)**

*This script outlines the exact live demonstration sequence for evaluators and judges. All scenarios are verifiable on the live production URL or via local offline mode.*

---

## Preparation & Access Credentials

### Production Environment
- **Live URL**: [https://ascora-five.vercel.app](https://ascora-five.vercel.app)
- **Local Offline Mode (Venue Backup)**:
  ```bash
  cd apps/web && npm run dev:offline
  # Opens http://localhost:3000 with zero external internet dependencies
  ```

### Evaluator Demo Accounts (Pre-configured)
| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Institutional Admin / HOD** | `admin@ascora.test` | `AscoraDemo#2026` | Full campus analytics, all 1,200 student records, data integration pipeline. |
| **Faculty Mentor** | `mentor@ascora.test` | `AscoraDemo#2026` | Assigned mentee cohort (64 students), weekly capacity planner, check-in manager. |
| **Student (Demo Cohort)** | *Demo Picker* | *1-Click Session* | Individual student portal, timetable, recovery simulators, CU Lucknow connection. |

---

## 8-Step Demonstration Sequence

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           ASCORA DEMO SEQUENCE                         │
  │                                                                        │
  │  1. Landing Page   ──▶  2. Data Integration ──▶  3. Campus Overview    │
  │  (Value Proposition)    (7 Sources Reconciled)   (Macro Health & Agenda) │
  │                                                                        │
  │  4. Student 360    ──▶  5. Intervention     ──▶  6. Capacity Planner   │
  │  (SHAP & Counterfactual) (Closed-Loop Action)    (Knapsack Optimization)│
  │                                                                        │
  │  7. Student Portal ──▶  8. Verification Proof                          │
  │  (Collegiate Simulators) (Zero-Defect Tests & Audit)                    │
  └────────────────────────────────────────────────────────────────────────┘
```

---

### Step 1: The Landing Page & Value Proposition
- **Navigate to**: `https://ascora-five.vercel.app/`
- **What to Observe**:
  - Hero scene demonstrates the core thesis: a student with an exceptional 9.15 CGPA (Arjun Gupta) appears completely safe in traditional ERP systems, but Ascora flags silent disengagement across LMS activity and attendance before semester failure occurs.
  - Interactive stage showcases the four-step loop: **Flag $\to$ Explain $\to$ Act $\to$ Measure**.
  - Explore top navigation links: `Product`, `How it works`, `Trust`, and `About`.

---

### Step 2: Data Integration Pipeline (Admin Role)
- **Navigate to**: Sign in with `admin@ascora.test` $\to$ Click **Data integration** (`/data`).
- **Demonstration Actions**:
  1. Click **Run pipeline** to watch the streaming ingestion of 7 campus sources (`erp_academics`, `attendance_register`, `lms_activity_log`, `placement_cell`, `skills_assessment`, `clubs_events`, `feedback_forms`).
  2. Point to the **Data Quality & Coverage** table: show 1,200 students reconciled with column mapping metrics and missing value handling.
  3. Show the **Fuzzy Match Accuracy** benchmark: 100% precision and 95% recall against planted ground truth.
  4. Point to the **Review Queue**: explain that low-confidence matches never silently corrupt student profiles; they await human confirmation.

---

### Step 3: Campus Overview & 7-Day Agenda Calendar
- **Navigate to**: Click **Overview** (`/overview`).
- **Demonstration Actions**:
  1. Review the **Campus Health Metric Cards**: Average Success Score (54.2), High Academic Risk count, High Placement Risk count, and Silent Decliners.
  2. Examine the **7-Day Rolling Agenda Calendar**:
     - Click **Later days** ($\to$) and **Earlier days** ($\leftarrow$) to shift weeks.
     - Click the **Today** button to instantly snap back to the current date.
     - Observe scheduled check-ins with badges and overdue indicators.
  3. Toggle between tabs:
     - **Focus**: Ranked high-priority students requiring attention.
     - **Trends**: Semester CGPA progression and score distributions.
     - **Groups**: Departmental risk heatmap comparing CSE, AI/ML, and ECE.

---

### Step 4: Individual Student 360 & Explainable AI
- **Navigate to**: Press `Ctrl + K` (or click search) $\to$ Search for `Arjun Gupta` (`CU24AIML0039`) $\to$ Open profile (`/students/CU24AIML0039`).
- **Demonstration Actions**:
  1. Note that Arjun has a **9.15 CGPA**, yet is flagged with **High Academic Risk** and marked as a **Silent Decliner**.
  2. Click **Why flagged? (SHAP Drivers)**:
     - Observe plain-language explanations: "Core subject attendance dropped to 61% (cohort median: 78%), raising academic risk by +18 pts."
     - "LMS assignment submissions fell from 90% to 40% in weeks 7–10, raising risk by +14 pts."
  3. Click **What helps? (Counterfactuals)**:
     - Interact with the live What-If slider: increase attendance and watch the calibrated risk probability drop in real-time.
  4. Open the **Source Tabs & Lineage**:
     - Hover over the dotted underline beside any metric to inspect the exact source file and row number provenance.

---

### Step 5: Closed-Loop Intervention Workflow
- **On Arjun Gupta's Profile**:
  1. Click **Plan intervention** in the right-hand panel.
  2. Observe that the form pre-selects the suggested intervention type (`mentor_meeting`) based on the student's primary risk driver.
  3. Select a due date, enter factual notes ("Discuss mid-semester lecture attendance recovery"), and click **Save**.
  4. Notice the success sound feedback and confirmation toast.
- **Navigate to**: Click **Interventions** (`/interventions`).
  - Show the newly created intervention in the **Open Interventions** queue with its frozen baseline.
  - Review the **What Works** card: explain the statistical lift of historical interventions over unassisted control cohorts.

---

### Step 6: Mentor Capacity Planner (`/this-week`)
- **Navigate to**: Sign in with `mentor@ascora.test` $\to$ Click **This week** (`/this-week`).
- **Demonstration Actions**:
  1. Move the **Hours available this week** slider (e.g. from 2 hours to 5 hours).
  2. Watch the greedy Knapsack optimization dynamically recalculate the optimal list of mentee check-ins that maximize priority coverage.
  3. Click the **Schedule** button directly on any mentee in the list $\to$ confirm check-in $\to$ observe instant persistence.

---

### Step 7: Student Portal & Collegiate Experience
- **Navigate to**: Log out $\to$ Select the **Student Login** tab.
- **Demonstration Actions**:
  1. Click **Explore Demo Student** $\to$ select `Daksh Bakshi (CU24AIML0001)`.
  2. **`/student` (Overview)**: Review student-facing metric cards, ongoing subjects, and the live What-If attendance slider.
  3. **`/student/academics`**: Inspect the multi-semester SGPA progression graph, radar diagnostics, and historical transcripts.
  4. **`/student/calculator`**:
     - Test the **Attendance Recovery Solver**: set a 75% target to compute the exact number of future lectures needed.
     - Test the **Terminal Exam Target Solver**: select continuous evaluation internal marks (/40) to calculate required end-semester marks out of 60.
     - Click **Commit Target to My Plan**.
  5. **`/student/schedule`**: View the Monday–Saturday weekly timetable and examination dates.
  6. **`/student/connection`**: Review the official CU Lucknow portal link (`https://student.culko.in/Login.aspx`) and manual verified import.

---

### Step 8: Algorithmic Fairness & Verification Proof
- **Navigate to**: Sign in as Admin $\to$ Open **Fairness** (`/fairness`) and **Model & logic** (`/model`).
- **Key Points for Judges**:
  - Transparent documentation of model weights and LightGBM ROC-AUC metrics (0.881 academic, 0.802 placement).
  - Open disclosure of four disparate impact checks marked for human review (lateral entry and residence).
  - DPDP-aligned design (not a legal certification): all student emails and phone numbers are masked, audit logging is active, and students cannot view peer records.

---

## Anticipated Questions & Answers

**Q1: How does Ascora differ from a standard PowerBI or Tableau campus dashboard?**
> *Answer*: Ascora is an intervention engine, not just a reporting screen. Dashboards display historical failure; Ascora detects early disengagement (silent decliners), provides mathematically calibrated SHAP drivers, calculates counterfactual recovery paths, optimizes mentor time via Knapsack planning, and measures longitudinal lift through baseline-frozen interventions.

**Q2: How does the model perform on real vs synthetic data?**
> *Answer*: On the 1,200-student cohort, LightGBM achieves an ROC-AUC of 0.881 with an honest comparison against a logistic regression baseline (AUC 0.875). We openly state that accuracy on synthetic data demonstrates pipeline integrity; deploying at an institution requires calibration against the institution's historical student outcomes.

**Q3: How are student privacy and data governance handled?**
> *Answer*: We enforce strict Row-Level Security (RLS) in PostgreSQL. Students have zero access to cohort analytics or peer data. Contacts are masked with SHA-256 backed identifiers, sensitive demographics are excluded from feature vectors, and every view is logged under DPDP Act 2023 standards.
