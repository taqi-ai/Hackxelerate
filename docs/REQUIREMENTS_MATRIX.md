# Requirements matrix: KPMG Challenge 04 (Ascora)

Locked problem statement: **Smart Campus Analytics: Predict, Optimize & Improve Student Success** (KPMG in India).
Status values: not started / in progress / implemented / **verified** (behaviour observed, not just code present).

| ID | Requirement (from the brief) | Implementation | How it was verified | Status | Risk |
|---|---|---|---|---|---|
| R1 | Integrate student data from multiple sources into one unified view (Academic, Attendance, LMS, Engagement, Placement, Skills, Feedback) | `services/ml/app/pipeline.py`, `ingest/`, `clean/`; tables in `supabase/migrations/0001_schema.sql` | Pipeline run on the demo set: 7 files, 62,927 rows, 1,200 unified students; 31 pytest tests pass | verified | Real data may need new header synonyms |
| R2 | Data cleaning and quality (duplicates, missing, conflicts, scale and format differences) | `clean/normalize.py`, dedupe and conflict steps, quality report page | Report shows fixes (e.g. 5,782 date conversions, 158 rescaled skills), 60 conflicts, 216 duplicate rows merged | verified | None known |
| R3 | Entity resolution across sources with different identifiers | `clean/resolve.py` | Fuzzy precision 100%, recall 95.3% vs hidden truth; review queue for ambiguous links; unit tests | verified | Recall depends on name overlap in real data |
| R4 | Student Success Score from academic and engagement indicators | `scoring/score.py`; formula page; `docs/score-note.md` | Score bounded 0-100 (test); stability: min rank correlation 0.997 under 12 weight shifts | verified | Weights are a judgement call; documented and tunable |
| R5 | Identify students at risk of poor academic performance | Academic risk model, `models/risk.py` | Held-out AUC 0.881, precision at 50 = 0.78; calibration chart | verified (on synthetic data) | Synthetic labels |
| R6 | Identify students at risk of poor placement outcomes (separate from academic) | Placement model, intent-aware | Held-out AUC 0.802; only placement-intent students scored; others get goal-specific readiness | verified (on synthetic data) | Small placement-track sample (499) |
| R7 | Interactive dashboard for faculty and administrators | `apps/web`: Overview, Students, Student 360, Segments, This week, Interventions | Pages opened in a browser; filters, sort, CSV export, mentor vs admin views | verified locally; deployed build passes | Dark mode checked by computed styles only |
| R8 | Bonus: segmentation into meaningful groups | `models/segments.py`, Segments page | 6 personas incl. "High academics, low placement readiness", each with traits and action | verified | Silhouette is low (0.125): groups overlap, stated honestly |
| R9 | Bonus: explainable score and risk flags | SHAP drivers in plain language; score breakdown radar; lineage tooltips | Student 360 shows drivers with cohort medians and actionable markers | verified | None |
| R10 | Deliverable: short note explaining the Success Score | `docs/score-note.md` | Written from measured numbers | verified | None |
| R11 | Deliverable: working dashboard prototype | https://ascora-five.vercel.app | `/login` returns 200 publicly; unauthenticated visits redirect to login | implemented; sign-in not yet exercised on the live URL by the assistant | Needs a human sign-in check |
| R12 | Deliverable: short demo or slides | `docs/demo-script.md`, `docs/pitch-outline.md` | Drafted | implemented (slides not built) | Slides and recording still to do |
| R13 | Role-based access, audit, privacy (DPDP) | RLS, masked contacts, `audit_log` | SQL impersonation: admin 1,200, mentor M01 64, anon 0 | verified | None |
| R14 | Differentiators: intervention tracker, counterfactuals, what-if, silent decliners, alerts, mentor time planner, fairness panel, early-warning curve, Ask Ascora, what-works board | See pages | Intervention create and list verified in a browser; what-if endpoint verified by API call | implemented | HOD weekly briefing PDF and feedback-themes UI not built |
| R15 | Resilience: LLM optional, offline demo mode | `insights/llm.py`, `lib/offline.ts` | Whole app ran from the snapshot with no Supabase; LLM disabled in all runs | verified | Gemini path itself untested (no key) |
