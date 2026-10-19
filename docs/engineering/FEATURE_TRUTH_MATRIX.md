# Feature truth matrix (verified 2026-10-19)

Legend: REAL+TESTED · REAL/UNDER-TESTED · PARTIAL · DEMO/FIXTURE · UI-ONLY · MISSING · BLOCKED (external)

| Area | Status | Evidence / notes |
|---|---|---|
| Staff login / logout (Supabase Auth, admin + mentor) | REAL/UNDER-TESTED | `login-form.tsx`, `middleware.ts`. No automated E2E (no test credentials in CI). |
| Role resolution from `profiles` (role never from client) | REAL+TESTED (ML side) | `api/ml-token/route.ts`, `services/ml/tests/test_auth.py` |
| Mentor sees only own students (RLS) | REAL/UNDER-TESTED | migrations 0001/0004/0006; verified once by SQL role impersonation; no automated RLS suite yet |
| Multi-institution tenancy | MISSING | single implicit institution; no `institution_id` (P1) |
| User provisioning / invitations / deprovisioning | MISSING | accounts created manually in Supabase |
| Admin MFA | MISSING | supported by Supabase, not enforced |
| Student accounts (real, RLS-scoped) | PARTIAL | schema + RLS in 0006; no provisioning flow |
| Public student preview | DEMO/FIXTURE (explicit) | synthetic files in `apps/web/demo-data/preview`; off unless `ASCORA_PUBLIC_PREVIEW=1` |
| File import pipeline (CSV/XLSX/JSON, 12 steps) | REAL/UNDER-TESTED | `services/ml/app/pipeline.py`; run state is in memory (lost on restart) |
| Entity resolution + review queue | REAL+TESTED (synthetic) | `clean/resolve.py`, `tests/test_resolve.py`; P 1.00 / R 0.95 vs planted truth |
| Live ERP / LMS / CUIMS connectors | MISSING / BLOCKED | no connector framework; CUIMS needs institutional authorisation |
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
| Background jobs | PARTIAL | in-process threads; job state not durable |
| Health checks | PARTIAL | ML `/health`; no web readiness probe |
| Android app | REAL | signed APK 1.0.0 (`com.ascora.mobile`); not on Play Store; no OTA |
