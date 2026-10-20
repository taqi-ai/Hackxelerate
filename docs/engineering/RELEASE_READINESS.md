# Release readiness

**Current status: INTERNAL TEST READY — SYNTHETIC DATA ONLY** (public evaluation instance at https://ascora-five.vercel.app).

Not a pilot candidate yet. Gates that block any real student data:

1. Multi-institution tenancy: DONE for the data layer. Isolation (0010), per-institution publishing (0012), per-institution keys (0014: roll numbers, mentor ids, segment ids and artefact keys unique per institution; every per-student policy checks the row's institution; user-written rows stamped from the caller). ML: one analytics deployment per institution (`ASCORA_INSTITUTION_ID`; tokens carry `inst` and other institutions are refused). Onboarding a second institution = an institution row, an ingest token, an ML deployment; not yet rehearsed end to end.
2. Account provisioning and deprovisioning: DONE in the database (0013: admin invites within the institution, claim only with a confirmed email, deactivation ends access, shared evaluation accounts read-only, all audited; CI `provisioning.sql`). Web flow (`/accounts`, `/join`) builds and is covered offline; not exercised against the live project (needs a personal admin account). Requires Supabase Auth "Confirm email" to stay ON. Admin MFA: MISSING (Supabase setting, human).
3. Automated RLS / cross-role negative test suite: DONE (CI `db-rls`): anonymous, profile-less, mentor, student and admin cases plus 11 cross-institution checks (0010), and intervention state-machine rules (0011).
4. Durable job state for pipeline runs: DONE for single-instance hosting (file-backed); database-backed table needed before scaling out.
5. Upload limits, run time limit and export formula-injection guard: DONE.
6. A real connector or approved export path for the pilot institution: BLOCKED (institutional authorisation).
7. Model validation on authorised historical outcomes: NOT VALIDATED.
8. Legal / DPO review, independent penetration test, secret rotation: human gates.

Passing on 2026-10-20: 54 pytest (ML), 51 vitest (web), 11 Playwright journeys, `tsc --noEmit`, eslint (0 errors), `next build`, both SQL suites, pip-audit, gitleaks in CI.
