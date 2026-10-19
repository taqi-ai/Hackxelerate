# Work log

## 2026-10-19
- Baseline: `main` at 085c079, clean apart from untracked user files.
- P0 T1 fixed: demo tokens plus `require_admin_write`. `pytest -q` gives 37 passed; `npm test` gives 41 passed.
- P0 T2 fixed: `ASCORA_PUBLIC_PREVIEW` gate. Verified on a local production build in both settings. Set to `1` on Vercel production (the evaluation instance).
- Bug: the login-page student picker was broken; `/api/students/search` made public with bounded inputs.
- Ponytail repository audited (see AI_TOOLING.md); the plugin install needs the user to run the slash commands.
- Next: `supabase start`, then write pgTAP RLS tests for mentor / anonymous / student isolation.
- Upload hardening (size, signature, zip-bomb, cleanup) and CSV formula-injection guard. `pytest -q` 38 passed; `npm test` 44 passed; tsc, lint (0 errors), build OK; CSV export checked in a browser (1,200 rows).
- Released #27. ML deploy (Azure) succeeded; /health ok, anonymous upload 401. Vercel's Git hook missed the merge, so production was redeployed via the API (dpl_CHXyHumamXgbbCBrPQ52Lrp3bSGs, commit 40c6d11). Verified live: student preview 200, login-page picker returns students.
- Next session: (1) pgTAP RLS negative tests with supabase start; (2) durable pipeline_runs table; (3) tenancy design doc then expand migration.
- RLS isolation suite written; first run found students could create staff interventions. Migration 0008 applied to production; suite re-run on production in a rolled-back transaction: all checks passed; no residue. CI job `db-rls` added; it also found that migrations did not apply to an empty database (0002 fixed). CI green.
- Durable run state + single-run lock + upload_id validation (path traversal). `pytest -q` 41 passed.
