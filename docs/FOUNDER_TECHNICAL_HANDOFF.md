# Founder technical handoff

## The picture
Browser -> Next.js site on Vercel (`apps/web`) -> Supabase Postgres for data and login -> for heavy work (what-if, ask, pipeline) the site mints a short-lived signed token and the browser calls the Python service on Azure (`services/ml`).

## Request path
1. You sign in; Supabase Auth gives a session cookie.
2. `apps/web/src/middleware.ts` redirects signed-out users to `/login`.
3. Pages read data through the Supabase client as you; **Postgres row-level security (RLS) decides which rows you get** (see `supabase/migrations`). The browser never gets a privileged key.
4. For ML calls, `apps/web/src/app/api/ml-token/route.ts` checks your role in `profiles` and signs a token; `services/ml/app/auth.py` verifies it.

## Ten files to know
`apps/web/src/middleware.ts`, `apps/web/src/app/api/ml-token/route.ts`, `apps/web/src/lib/minimise.ts`, `services/ml/app/main.py`, `services/ml/app/auth.py`, `services/ml/app/pipeline.py`, `services/ml/app/features/build.py`, `services/ml/app/models/risk.py`, `supabase/migrations/0014_institution_keys.sql`, `supabase/tests/rls_isolation.sql`.

## ML in one paragraph
`features/build.py` turns cleaned data into a table (week-12 information only, sensitive attributes left out). `models/risk.py` trains two LightGBM models (academic, placement) with calibration, and SHAP explains each student. The Success Score is a separate deterministic formula (`docs/score-note.md`).

## Tests and logs
- ML: `cd services/ml && .venv/Scripts/python -m pytest -q` (58 on main).
- Web: `cd apps/web && npm test`, `npx tsc --noEmit`, `npm run build`, `npx playwright install` once, then `npm run e2e`.
- Database: the SQL suites run in CI (`db-rls`).
- Logs: Vercel dashboard (runtime logs); Azure App Service log stream (one JSON line per request).

## Deploy and roll back
Merge to `main`: Vercel deploys the web app; changes under `services/ml/**` deploy the ML service after tests. Rollback and secrets: `docs/engineering/PRODUCTION_RUNBOOK.md`. Never edit an applied migration; add a new one.

## What is real vs simulated
Real: the pipeline, scores, both models, SHAP, what-if, interventions, RLS. Synthetic: all student data. Not built: live portal connectors, notifications.

## Never claim
Real-world accuracy, DPDP compliance, "production-ready", live university integration, or that interventions caused improvement.

## Mission Control (added 2026-10-24, branch `claude/mission-control`)
**What it is:** `/mission-control` (admin and mentor). You enter weekly capacity (mentor hours per mentor, minutes per meeting, peer-tutoring, mock-interview and skill-workshop slots) and it builds a one-action-per-student support plan, shows evidence and capacity used, compares capacity scenarios, and creates real interventions only after you approve.

**Files:** `apps/web/src/lib/mission-control.ts` (the whole algorithm, pure and unit-tested), `app/(app)/mission-control/` (`load.ts` reads data as the signed-in user, `actions.ts` approval, `mission-control.tsx` screen), `getDriverMap` in `lib/data.ts`.

**Algorithm (a greedy heuristic, not an optimal solver):** considered = Medium or High risk on a dimension (placement only if the declared intent is placement). Held back, never allocated: no assigned mentor, identity match awaiting review, or an open intervention already. Each dimension gets a candidate type from its strongest actionable driver, limited to types valid for that dimension (academic: mentor meeting, peer tutoring; placement: mock interview, skill workshop, mentor meeting). Value = risk probability x (0.5 + 0.5 x actionable share of the raising drivers). Students are served in order of best value (ties: existing priority, then id); each gets at most one action, the best that still fits. Mentor meetings draw from the student's own mentor's minutes; other types draw shared slots.
**Metrics:** "need covered" = value of selected actions over value of all considered students. It is an allocation measure, not a forecast. The manual-order comparison uses the existing priority score with the same capacity.
**Approval:** the browser sends only capacity and chosen student ids; the server recomputes the plan from data read under the caller's row-level security and creates interventions through the existing `createIntervention` (baseline, duplicate refusal and audit already there). A retry counts already-open interventions as "existing". A failure is reported as a failure.
**Assumptions to say out loud:** default capacities are illustrative, not measured; all students are synthetic; counselling referral and parent calls are not auto-planned (human judgement); no outcome is predicted and no causal effect is claimed.
**Tests:** 22 engine tests, 8 approval-action tests (vitest), one Playwright journey (CI).
**Not done:** a per-mentor capacity editor, outcome tracking specific to Mission Control plans, and a live check with a real staff login on production.
