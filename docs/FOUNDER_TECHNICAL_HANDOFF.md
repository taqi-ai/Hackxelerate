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
