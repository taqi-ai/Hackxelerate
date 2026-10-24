# ASCORA: ROUND 2 DEAN'S DECISION BRIEF (S4 GUIDED TOUR DEMO SCRIPT)
## 3-5 Minute Live Executive Presentation & Judge Technical Defense

---

### PRESENTATION OVERVIEW
- **Audience:** Institutional Dean, Academic Directors, KPMG in India Evaluation Panel.
- **Duration:** 3 to 5 minutes.
- **Narrative Architecture:** 8-Step S4 Guided Executive Decision Tour.
- **Core Objective:** Demonstrate how Ascora transitions an institution from reactive semester-end marks to proactive, multi-signal early interventions that safeguard student trajectories while respecting mentor staffing capacity.
- **Primary Demonstration Cohort:** 1,200 students across 7 campus data silos (synthetic seed 42 dataset).
- **Featured Case Study:** Arjun Gupta (`CU24AIML0039`), CSE-AIML, Year 3, Section A.

---

### TIMED 8-STEP S4 TOUR WALKTHROUGH

#### STEP 1: Institutional Decision: The Cost of Late Detection [0:00 - 0:35]
- **Screen to Open:** `/brief` (Step 1)
- **Presenter Actions:**
  - Direct attention to the top KPI cards: "1,200 Students across 7 data silos", "63 Silent Decliners", "61 Placement Mismatches", and "91.4% At-Risk Recall".
- **Key Spoken Message for the Dean:**
  "Dean, traditional academic reporting relies on midterm scores and semester CGPAs. By the time a student shows an F grade on a transcript, their failure is already a fait accompli. Across our campus cohort of 1,200 students, Ascora unites 7 disparate silos: attendance, LMS clickstreams, coding submissions, mock interviews, and library access. We achieve 91.4% at-risk recall compared to just 64.2% using static grade thresholds, catching students weeks before exams fail."
- **Screen Evidence:**
  - 1,200 student scale.
  - 63 silent decliners (identified by 3-week engagement slope drop).
  - 61 placement mismatches (CGPA >= 7.5 but employability readiness <= 40).
- **Transition:** "Let us look at how Ascora forecasts multi-dimensional risk across the entire university."

---

#### STEP 2: Multi-Outcome Risk: Campus-Wide Predictive Forecast [0:35 - 1:10]
- **Screen to Open:** `/brief` (Step 2 or press Right Arrow key)
- **Presenter Actions:**
  - Walk across the four quad-outcome cards: SGPA distribution, Academic Backlogs, Placement Deficit, and 3-Week Engagement Drop.
- **Key Spoken Message for the Dean:**
  "Rather than reducing student potential into an arbitrary single composite score, Ascora evaluates four distinct institutional outcomes to direct specific operating teams. We forecast:
  1. SGPA Distribution: 465 students under 6.0 and 49 Dean's List candidates.
  2. Backlog Accumulation: 184 students at High Academic Risk driven primarily by gatekeeper courses.
  3. Placement Unreadiness: 139 students in Year 3/4 with critical employability deficits.
  4. 3-Week Engagement Drop: 63 students in active downward engagement slopes."
- **Screen Evidence:**
  - Tabular breakdown of SGPA bands (`<6.0`, `6.0-7.5`, `7.5-8.5`, `>8.5`).
  - Distinct probabilities per outcome.
- **Transition:** "Notice that these risks are not evenly distributed. Step 3 exposes the structural clusters."

---

#### STEP 3: Risk Distribution: Department, Year & Persona Concentrations [1:10 - 1:40]
- **Screen to Open:** `/brief` (Step 3)
- **Presenter Actions:**
  - Highlight the department risk disparity (CSE branches account for 58% of backlog risk) and the Year 2 vs Year 3 milestone divide.
- **Key Spoken Message for the Dean:**
  "Dean, when we look at our departments, CSE, CSE-AIML, and CSE-Data Science represent 304 students requiring academic and placement focus. Year 2 students transition into prerequisite gatekeepers like Operating Systems and Data Structures, driving 22.4% backlog risk. Conversely, Year 3 students face the placement cliff, where technical mock interview participation drops. Our 6 KMeans behavioral personas group students by root causes rather than symptoms."
- **Screen Evidence:**
  - Department breakdown (304 CSE vs 176 Core Engineering).
  - Year 2 foundational theory risk vs Year 3 placement gap.
  - Link to `/segments` persona centroids.
- **Transition:** "To see this dynamic early detection in action, let us examine a specific student profile."

---

#### STEP 4: Silent Decliner Case Study: Arjun Gupta [1:40 - 2:20]
- **Screen to Open:** `/brief` (Step 4)
- **Presenter Actions:**
  - Contrast Arjun's traditional status against Ascora's signal fusion.
  - Click 'Inspect Full Profile' if the judge requests live profile verification (`/students/CU24AIML0039`).
- **Key Spoken Message for the Dean:**
  "Meet Arjun Gupta (`CU24AIML0039`), a 3rd-year CSE-AIML student. In your traditional ERP, Arjun appears completely safe: CGPA 6.85 and zero historical backlogs. An academic committee would never flag him.
  Yet Ascora flags him with a low trajectory score of 50.9. Why? Over the last 6 weeks, his attendance dropped by 14 points, and his LMS assignment completions plummeted by 40%. He is a classic Silent Decliner, spiraling toward failure 4 weeks before midterms."
- **Screen Evidence:**
  - Student Name: Arjun Gupta, ID `CU24AIML0039`, CSE-AIML Year 3, Section A.
  - Traditional status: CGPA 6.85, 0 backlogs.
  - Ascora early warning: Trajectory score 50.9, Persona 'Silent decliners', Mentor Prof. Eshana Puri.
- **Transition:** "How does the Dean know this alert is mathematically trustworthy? Step 5 shows the grounded evidence."

---

#### STEP 5: Grounded Model Evidence: TreeSHAP Attributions [2:20 - 2:55]
- **Screen to Open:** `/brief` (Step 5)
- **Presenter Actions:**
  - Point out the difference between TreeSHAP log-odds impact (+1.015), raw observed trajectory drops (-14 pts), and counterfactual simulation (-28% risk).
- **Key Spoken Message for the Dean:**
  "Ascora provides complete explainability. We do not use black-box generative text. We compute exact TreeSHAP attributions from our calibrated LightGBM models. For academic risk, internal examination marks and gatekeeper prerequisite scores exert the largest upward push on risk (+1.015 log-odds). We explicitly separate empirical observations from simulated counterfactuals: an attendance contract is projected to reduce risk by 28%, but we label this transparently as a projection, not a guarantee."
- **Screen Evidence:**
  - Attribution 1: TreeSHAP log-odds impact (+1.015 for internal marks).
  - Attribution 2: Raw observed trend (-14 pts attendance, -40% LMS completion).
  - Attribution 3: Counterfactual scenario (-28% simulated delta).
- **Transition:** "Insights without action waste institutional energy. Step 6 routes this to designated owners."

---

#### STEP 6: Prescribed Interventions: Institutional Decision Matrix [2:55 - 3:30]
- **Screen to Open:** `/brief` (Step 6)
- **Presenter Actions:**
  - Walk through the Decision Matrix table: Silent Decliners -> Faculty Mentor (P1, 7d SLA); Backlog Cluster -> Faculty Mentor (P0, 48h SLA); High CGPA/Low Readiness -> T&P Cell (P1, 7d SLA); Disengaged -> Student Wellness Counsellor (P0, 48h SLA).
- **Key Spoken Message for the Dean:**
  "Every risk detected is bound to an institutional owner and a clear service level agreement:
  - Silent Decliners like Arjun are routed to Faculty Mentors for a 1-on-1 check-in within a 7-day SLA.
  - High-CGPA placement mismatches are routed to Training & Placement for a 14-day DSA bootcamp and mandatory mock interviews.
  - Critical academic backlogs receive peer tutoring within 48 hours.
  - Disengaged students are routed to Student Wellness Counsellors."
- **Screen Evidence:**
  - Complete Decision Matrix with target segments, risk profiles, actions, owners, and SLA priorities.
  - Direct button to `/interventions` queue.
- **Transition:** "However, assigning interventions is pointless if faculty mentors do not have the time. Step 7 solves the capacity problem."

---

#### STEP 7: Capacity & Governance: Mentor Knapsack Allocation [3:30 - 4:10]
- **Screen to Open:** `/brief` (Step 7)
- **Presenter Actions:**
  - Point to the Mentor Knapsack metrics: "480 Available Mentor Hours" across 40 mentors, "100% P0 Critical Scheduled", "Closed-Loop Auditing".
- **Key Spoken Message for the Dean:**
  "Most student success initiatives fail due to faculty burnout. Ascora treats mentor time as a constrained resource. We use a mathematical knapsack algorithm in `/this-week` that balances the 480 available monthly mentor hours across our 40 faculty advisors. Every P0 Critical and P1 student is scheduled within available hours. Once scheduled, interventions follow a closed-loop lifecycle: Assigned -> Meeting Held -> Follow-up Scheduled -> Outcome Audited."
- **Screen Evidence:**
  - 480 available mentor hours across 40 mentors.
  - Knapsack capacity optimization.
  - Closed-loop lifecycle tracking.
  - Direct button to `/this-week` capacity planner.
- **Transition:** "Finally, Step 8 provides the Dean's mandate and live verification shortcuts for this panel."

---

#### STEP 8: Executive Decision & Live Verification Shortcuts [4:10 - 4:45]
- **Screen to Open:** `/brief` (Step 8)
- **Presenter Actions:**
  - Summarize the executive decision.
  - Point to the four Live Judge Shortcuts:
    1. Inspect Demo Student (`/students/CU24AIML0039`)
    2. Mentor Capacity Planner (`/this-week`)
    3. Ask Ascora Copilot (`/ask`)
    4. Model Validation (`/model`)
- **Key Spoken Message for the Dean:**
  "Dean, your executive decision today is clear:
  1. Authorize immediate mentor check-ins for the 63 verified silent decliners.
  2. Mandate the 14-day DSA bootcamp for the 61 placement mismatches.
  3. Deploy peer tutoring pods for the CSE gatekeeper courses.
  Judges, you can click any of the 4 live shortcuts below to verify student records, mentor schedules, Ask Ascora queries, and ROC-AUC model validation metrics in real time."

---

### CONTINGENCY PLAYBOOK DURING LIVE DEMO
1. **If ML Service is Offline:**
   - The application automatically activates the verified in-memory fallback using `snapshot.json`.
   - Point out: "Notice the status indicator: Ascora features a fail-safe architecture that executes queries and risk computations directly against the platform's local verified data store."
2. **If Judge asks for Natural Language in Ask Ascora:**
   - Click the "3. Ask Ascora Copilot" shortcut.
   - Click one of the 4 official prompt chips (e.g. chip 1 or chip 3) to show verified matched counts (e.g., 304 for CSE, 61 for placement mismatch), Evidence Panels A, B, C, and the limitations disclosure.
3. **If Judge questions Model Validity:**
   - Click the "4. Model Validation" shortcut.
   - Switch to the "Round 2 Model Validation" tab.
   - Show held-out ROC-AUC of 0.881 on Academic Risk (vs 0.792 LogReg baseline) and 0.802 on Placement Risk.

---

### JUDGE TECHNICAL DEFENSE: TOP 10 QUESTIONS & ANSWERS

#### Q1: How does Ascora identify a silent decliner?
**Answer:** A silent decliner is a student whose historical CGPA is moderate or high (>= 6.5) and who has no historical backlogs, but whose 6-week operational slope shows a drop of >= 10 points in core attendance and a drop of >= 25% in LMS coursework completion. The rule alerts mentors weeks before internal marks reflect exam failure.

#### Q2: How many students matched the official Copilot questions, and how is the count computed?
**Answer:** Counts are computed deterministically against the scoped cohort:
- Q1 (Most at risk this semester): 184 students with `academic_risk_level == "High"` (calibrated probability >= 0.50).
- Q2 (Placement readiness drivers): 139 students with `placement_risk_level == "High"` among placement-track cohorts.
- Q3 (Good CGPA but low employability): 61 students with `CGPA >= 7.5` and `placement_readiness <= 40` (or `placement_risk >= 0.50`).
- Q4 (CSE department prioritization): 304 students in `CSE`, `CSE-AIML`, and `CSE-Data Science` exhibiting Medium or High risk.

#### Q3: How are TreeSHAP values obtained and interpreted?
**Answer:** TreeSHAP values are computed by TreeExplainer on our calibrated LightGBM decision tree models during pipeline execution and stored in `ask_index`. They are expressed in log-odds impact units. A TreeSHAP value of +1.015 for internal exam scores means this feature increases the log-odds of academic risk by 1.015 for that student relative to the base expected value.

#### Q4: How does the recommendation engine select an intervention and institutional owner?
**Answer:** `deriveRecommendation()` inspects the dominant risk dimension and top driver. If the risk is academic and backlogs exist, it assigns a Peer Tutoring Pod to a Faculty Mentor (P0, 48h SLA). If the risk is placement/interview deficit, it assigns a DSA Bootcamp and Mock Interview to the Training & Placement Cell (P1, 7d SLA). If disengagement is severe across attendance and platform, it assigns a Wellness Consultation to a Student Counsellor.

#### Q5: How does the system distinguish correlation from causation?
**Answer:** We explicitly disclose non-causality across all evidence panels. Model attributions indicate statistical feature importance in our prediction tree; observed trajectories show empirical historical correlations. Interventions and counterfactual simulations are labeled as hypothetical scenario projections. Ascora provides decision support to human educators, who make the final causal determination.

#### Q6: What happens when a model output or student field is missing?
**Answer:** Ascora fails closed and handles nullable JSONB safely. Missing features are excluded from mathematical denominators rather than being silently zero-filled. For students with no placement intent (e.g. higher studies or civil services), placement risk is marked `N/A` rather than zero. When the ML backend is unreachable, the system executes deterministic fallback rules and clearly discloses the provenance.

#### Q7: How is the recommendation tracked after it is assigned?
**Answer:** Interventions are tracked through an audited closed-loop state machine: `recommended` -> `assigned` -> `in_progress` -> `completed` -> `verified`. Faculty mentors log meetings and attendance contracts in `/this-week` and `/interventions`, updating the student timeline.

#### Q8: What are the current model limitations?
**Answer:**
1. The platform is calibrated on a synthetic cohort of 1,200 students with seed 42 for challenge compliance.
2. Secondary outcomes (SGPA regression and 3-week drops) are currently implemented via deterministic rule engines rather than separately calibrated neural networks.
3. Model predictions represent a snapshot in time and must be re-indexed as weekly attendance updates occur.

#### Q9: Which values are measured, predicted, estimated, or synthetic?
**Answer:**
- **Measured:** Core attendance %, assignment completion rate, historical CGPA, mock interview attendance.
- **Predicted:** Academic risk probability (LightGBM 0.881 ROC-AUC) and placement risk probability (LightGBM 0.802 ROC-AUC).
- **Estimated:** 3-week engagement drop alert rule and expected SGPA band.
- **Synthetic:** The entire student population data is synthetically generated for privacy compliance.

#### Q10: How does the Dean verify the recommendation against underlying student data?
**Answer:** Every recommendation card and brief act provides direct clickable links to the underlying student record (`/students/[id]`), the raw timeline of events, the LMS and attendance breakdown, and the model explanation tab (`/model`), enabling instant drill-down from macro-KPIs to individual ground-truth records.
