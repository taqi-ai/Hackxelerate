# Round 2 backend: release verification (24 Oct 2026)

Scope: `services/ml` (LMS engine, four outcomes, mentor availability, placement panel), migration 0015, one theme-default line in `apps/web/src/app/layout.tsx`. Every number below was produced by running the code in this repository on the frozen synthetic cohort.

## What was built
| Area | Where | Status |
|---|---|---|
| LMS adapter engine (4 adapters, captcha lifecycle, sessions, lockout, remember-me) | `app/lms/` | built and tested; **demo sandbox only**, no real portal is contacted (see `LMS_ADAPTERS.md`) |
| Four outcomes (semester, backlog, placement readiness, engagement drop) | `app/models/round2.py` | built, evaluated, stored with the model state and the offline snapshot |
| Mentor availability + double-booking guard | `app/campus.py`, `app/campus_api.py`, migration 0015 | API tested; migration tested by CI `db-rls` (see the PR) but **not applied to production** |
| Placement panel (drives, eligibility, applications, Student 360) | same | same |
| Day mode default | `apps/web/src/app/layout.tsx` | `defaultTheme="light"`; existing users keep their stored choice |

Deviations from the brief, on purpose: the migration is `0015` (0007 is long taken); outcomes are **not** written into `student_scores.components` (the web reads that column as six numeric parts and a nested object would break charts) but into the model state, the snapshot (`round2_students`) and `analytics_artifacts` keys `model_semester`, `model_engagement`, `round2_outcomes`; timetable, fees, notices and assignments are reported as unavailable because the synthetic data has none; no live portal login.

## The four outcomes: what was measured
All on the synthetic cohort; the engagement labels come from the generator, so these show the pipeline works, not accuracy at a college.
- **Semester performance:** target = recorded SGPA of each completed semester (3,430 student-semesters), features = that semester's internal marks and earlier SGPAs, 5-fold out-of-fold predictions grouped by student. MAE 0.426, RMSE 0.584, R² 0.891, band accuracy 0.766. Baseline (repeat last semester's SGPA, 2,230 comparable rows): MAE 0.809. 80% interval is ±0.75 SGPA points (1.28 × RMSE, approximate). Pass probability = 1 − academic risk.
- **Backlog risk:** the existing academic-risk model: held-out ROC-AUC 0.8809 (unchanged and reproducible).
- **Placement readiness:** 1 − placement risk (placement-track students only); held-out placement ROC-AUC 0.8016. Benchmark flags use illustrative thresholds (aptitude 60, coding 60, 2 mock interviews) kept in `PLACEMENT_BENCHMARKS`.
- **Engagement drop:** target = the generator's post-mid-semester drop-off (12.1% of students); the model sees only data up to week 8. Held-out ROC-AUC 0.8307, PR-AUC 0.4422, Brier 0.0831, 5-fold CV AUC 0.81. Against thresholding the Round 1 Success Score at the same 20% flag share: out-of-fold AUC 0.814 vs 0.759; recall of drop-offs 0.566 vs 0.503; recall of the 106 silent decliners 0.377 vs 0.274 (CU24AIML0039 is one of them: Success Score looks healthy, engagement-drop probability 0.54, High).

## Tests run
- `cd services/ml && python -m pytest -q` in a clean worktree of this branch: **188 passed** (145 existing including the Ask suite, 43 new). New tests cover: adapter discovery; captcha issue, single use, regeneration after wrong captcha and wrong password; same message for unknown user and wrong password; lockout after five failures; no password or captcha text in logs; sync, expiry, logout, remember-me and tamper detection; failing-module degradation; session-store bound; double-booking (exact 409 text), back-to-back, holiday conflicts both ways, role scoping, persistence; drives, eligibility, idempotent applications; Student 360 scope; all four outcomes for all 1,200 students and their invariants.
- Two real bugs the tests found and fixed: the session bound was off by one (2,001), and an SGPA band was computed on the unrounded value (7.0 displayed as "Watch").
- SQL: `supabase/tests/mentor_placement.sql` added to CI `db-rls` (exclusion constraint, holiday triggers, RLS for mentor, admin and anonymous, institution stamping). No local Postgres was available, so CI is the first run; see the PR for its result.
- Not run here: Playwright locally, load tests, a live check with a real staff token on production.

## Security notes
LMS routes are public by design (students are not staff) and are bounded: input lengths, lockout, per-address start limit, session cap. All mentor, placement and outcome routes need a signed staff token and are scoped by the token (`mid` claim) exactly as Ask is. Demo accounts may book mentor time and apply to drives (synthetic data); drive and holiday creation need an admin token. File-backed campus state is capped (5,000 bookings, 500 holidays, 200 drives).

## Verified live after deploy (ML run 40089283671, 24 Oct 2026)
`/health/ready` 200; `/lms/universities` lists the four adapters as `demo_sandbox`, `live_connection: false`; a complete no-captcha login on production (`aktu_erp`: wrong password refused with a fresh session, right password returns the bundle with mentor and attendance, fees reported unavailable, sync works, logout then sync returns `LMS_SESSION_EXPIRED`); the captcha adapters return an SVG challenge; every mentor, placement, outcome and metrics route returns 401 without a token; the web login page ships `defaultTheme: "light"`. Not verified live: the staff-token routes (no staff token available here) and the captcha-solving path (covered by tests).

## Limitations to say out loud
- **The campus store (bookings, holidays, drives, applications) lives in a JSON file under the deployed folder, and the deploy uses `--clean`, so every ML redeploy resets it to the weekly seed.** Persistence needs migration 0015 applied and a data path from this service to the database (it holds no database key); neither is done. Migration 0015 is merged and passes CI from an empty database, but it has **not been applied to production**.
Synthetic data throughout; the sandbox is not a university connection; the campus store is a single-instance JSON file until migration 0015 is applied and a data path exists; "better than everything online" is not a claim this repository can support.
