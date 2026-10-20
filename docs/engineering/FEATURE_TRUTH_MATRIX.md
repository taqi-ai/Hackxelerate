# Feature truth matrix (verified 2026-10-19)

Legend: REAL+TESTED · REAL/UNDER-TESTED · PARTIAL · DEMO/FIXTURE · UI-ONLY · MISSING · BLOCKED (external)

| Area | Status | Evidence / notes |
|---|---|---|
| Per-source data freshness | REAL+TESTED | from dates inside each file (`services/ml/app/freshness.py`); sources without dates say so; staleness limits per source; Data integration table and overview line. Production shows "Not reported" until the next publish |
| Account provisioning (invite, claim, deactivate) | REAL/UNDER-TESTED | database rules tested in CI (`supabase/tests/provisioning.sql`); web flow not yet run against the live project |
| Staff login / logout (Supabase Auth, admin + mentor) | REAL/UNDER-TESTED | `login-form.tsx`, `middleware.ts`. No automated E2E (no test credentials in CI). |
| Role resolution from `profiles` (role never from client) | REAL+TESTED (ML side) | `api/ml-token/route.ts`, `services/ml/tests/test_auth.py` |
| Role isolation (RLS) | REAL+TESTED | `supabase/tests/rls_isolation.sql`, CI `db-rls`; re-run on production in a rolled-back transaction |
| Multi-institution tenancy | PARTIAL | isolation enforced in RLS and tested (0010, `rls_isolation.sql` section 6); keys and publish path still single-institution |
| User provisioning / invitations / deprovisioning | MISSING | accounts created manually in Supabase |
| Admin MFA | MISSING | supported by Supabase, not enforced |
| Student accounts (real, RLS-scoped) | PARTIAL | schema + RLS in 0006; no provisioning flow |
| Public student preview | DEMO/FIXTURE (explicit) | synthetic files in `apps/web/demo-data/preview`; off unless `ASCORA_PUBLIC_PREVIEW=1` |
| File import pipeline (CSV/XLSX/JSON, 12 steps) | REAL/UNDER-TESTED | `services/ml/app/pipeline.py`; run state is in memory (lost on restart) |
| Entity resolution + review queue | REAL+TESTED (synthetic) | `clean/resolve.py`, `tests/test_resolve.py`; P 1.00 / R 0.95 vs planted truth |
| Connector status | REAL+TESTED | `services/ml/app/connectors.py`, `tests/test_connectors.py`, Data integration panel (checked end to end locally) |
| Live ERP / LMS / CUIMS connectors | MISSING / BLOCKED | none built; CUIMS needs institutional authorisation; shown honestly as not configured |
| Success Score | REAL+TESTED | `scoring/`, `docs/score-note.md` |
| Academic / placement risk models | REAL, synthetic labels only | real hold-out evaluation; NOT VALIDATED on institutional outcomes |
| SHAP reasons, what-helps | REAL | computed from the actual model |
| What-if simulator | REAL | ML `/whatif` |
| Interventions: create / status / follow-up / outcome | REAL/UNDER-TESTED | server actions; RLS zero-row refusal; follow-ups via migration 0007 |
| Student report page, journey timeline | REAL/UNDER-TESTED | PR #26; unit tests for journey utils |
| Ask Ascora (LLM wording) | REAL, optional | Azure OpenAI with deterministic fallback |
| Search (command palette) | REAL | fixed in #24 |
| Notifications (email / SMS) | MISSING | none exist; nothing claims delivery |
| Exports (students table CSV) | PARTIAL | client-side CSV of visible rows; no formula-injection guard yet |
| Data freshness on dashboards | PARTIAL | run date only; no per-source freshness |
| Background jobs | PARTIAL | in-process thread, one run at a time; status persisted to disk and restored on restart (`tests/test_runs.py`) |
| Health checks | REAL+TESTED | ML `/health/live`, `/health/ready` (`tests/test_health.py`); web `/api/health` (`readiness.test.ts`) |
| Android app | REAL | signed APK 1.0.0 (`com.ascora.mobile`); not on Play Store; no OTA |
