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
- 0009 campus analytics staff-only. CI `db-rls` green from empty (0001-0009); production suite passed in a rolled-back transaction.
- Next: tenancy expand migration (institutions + institution_id + membership-scoped helpers), web/ML unchanged until enforcement step.
- Tenancy expand 0010: CI from empty (0001-0010) green incl. 11 cross-institution checks; applied to production; regression (admin/mentor visibility unchanged) + tenant checks passed in a rolled-back transaction.

## 2026-10-20
- LLM boundary: `redact()` at the `generate()` choke point. Health probes for ML and web. `pytest -q` 46 passed (twice, cache isolated); `npm test` 46 passed; build OK.
- Structured request logging (ML). Dependency upgrades: pip-audit clean, 48 pytest, identical model predictions. shadcn moved to dev. CI `deps-audit` added.
- ML deploy after the dependency upgrade: Azure reported "failed to start within 10 min" (one-time dependency reinstall on B1), yet the new version started and is ready. Set WEBSITES_CONTAINER_START_TIME_LIMIT=1800; a settings restart came back ready in seconds (deps cached).
- ASCORA_LLM=off kill switch (49 pytest). ML_MODEL_CARD.md and PRODUCTION_RUNBOOK.md written from verified facts; backups and PITR marked not verified.
- Intervention integrity 0011 + `supabase/tests/intervention_rules.sql` (CI) + web mapping and allowed-move dropdown. 48 vitest.
- Connector status layer: ML `/connectors` (admin) + Data integration panel; verified end to end locally (web token to ML). 52 pytest, 48 vitest. Offline quality timestamp no longer fakes "now".

## Checkpoint 2026-10-20
- Merged and live: #33 (LLM redaction, health), #34 (deps + request log + CI deps-audit), #35 (LLM kill switch, model card, runbook), #36 (intervention integrity 0011), #37 (connector status), #38 (Playwright e2e in CI). All CI jobs green.
- Production DB has migrations 0001-0011; all SQL suites passed on production in rolled-back transactions.
- Next session, in order: (1) DATA_DICTIONARY_AND_LINEAGE.md; (2) tenancy contract step (institution-scoped keys + institution-aware ingest/reset RPCs) after the user decides; (3) Next 16 upgrade to clear the accepted advisory; (4) account provisioning and admin MFA; (5) restore drill.

## 2026-10-20 (after checkpoint)
- DATA_DICTIONARY_AND_LINEAGE.md written from the live schema. Checking its claim that mentors never see sensitive attributes found a P1 leak: the profile and report pages passed the full student row (raw contacts, fairness attributes) to client components, and LMS lineage / link keys carried raw emails, also in the public preview files. Fixed in `lib/minimise.ts`, preview files rebuilt masked. A new Playwright test reads the raw values from the snapshot and asserts they are absent from the HTML of the profile, report and students pages; it failed before the lineage fix and passes now. 51 vitest, 11 e2e, tsc, lint, build.
- #40 merged (CI green). Run time limit: `ASCORA_RUN_TIMEOUT_S` (default 900 s); checkpoints before model-state replacement and publish; never stopped while writing rows. 54 pytest.
