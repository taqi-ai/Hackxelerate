# Release readiness

**Current status: INTERNAL TEST READY — SYNTHETIC DATA ONLY** (public evaluation instance at https://ascora-five.vercel.app).

Not a pilot candidate yet. Gates that block any real student data:

1. Multi-institution tenancy (`institution_id`, RLS by membership, negative tests): MISSING.
2. Account provisioning and deprovisioning, admin MFA: MISSING.
3. Automated RLS / cross-role negative test suite: DONE for the current single-tenant model (CI `db-rls`). Must be extended with cross-institution cases when tenancy lands.
4. Durable job state for pipeline runs: DONE for single-instance hosting (file-backed); database-backed table needed before scaling out.
5. Upload limits and export formula-injection guard: DONE (parse timeout still open).
6. A real connector or approved export path for the pilot institution: BLOCKED (institutional authorisation).
7. Model validation on authorised historical outcomes: NOT VALIDATED.
8. Legal / DPO review, independent penetration test, secret rotation: human gates.

Passing on 2026-10-19: 38 pytest (ML), 44 vitest (web), `tsc --noEmit`, eslint (0 errors), `next build`, gitleaks in CI.
