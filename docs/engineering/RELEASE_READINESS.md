# Release readiness

**Current status: INTERNAL TEST READY — SYNTHETIC DATA ONLY** (public evaluation instance at https://ascora-five.vercel.app).

Not a pilot candidate yet. Gates that block any real student data:

1. Multi-institution tenancy: PARTIAL. Data isolation enforced and tested (0010); keys, publish RPC and ML artefacts are not yet per institution, so a second institution cannot be onboarded yet.
2. Account provisioning and deprovisioning, admin MFA: MISSING.
3. Automated RLS / cross-role negative test suite: DONE (CI `db-rls`): anonymous, profile-less, mentor, student and admin cases plus 11 cross-institution checks (0010), and intervention state-machine rules (0011).
4. Durable job state for pipeline runs: DONE for single-instance hosting (file-backed); database-backed table needed before scaling out.
5. Upload limits, run time limit and export formula-injection guard: DONE.
6. A real connector or approved export path for the pilot institution: BLOCKED (institutional authorisation).
7. Model validation on authorised historical outcomes: NOT VALIDATED.
8. Legal / DPO review, independent penetration test, secret rotation: human gates.

Passing on 2026-10-20: 54 pytest (ML), 51 vitest (web), 11 Playwright journeys, `tsc --noEmit`, eslint (0 errors), `next build`, both SQL suites, pip-audit, gitleaks in CI.
