# Productionization plan

Ordered backlog. Status per item: done / next / blocked / human. Evidence in WORK_LOG.md.

## P0: security and data integrity
- [done] Demo accounts cannot change published data (ML `require_admin_write`).
- [done] Fixture preview off by default (`ASCORA_PUBLIC_PREVIEW`).
- [done] RLS isolation suite (`supabase/tests/rls_isolation.sql`) in CI job `db-rls`: migrations from empty + anon / no-profile / mentor / student / admin checks. Found and fixed: students could create and edit staff interventions (0008). Found and fixed: migrations did not apply to an empty database (0002).
- [done] Upload limits: 25 MB per file, content signature checks, xlsx inflate cap (zip-bomb guard), rejected uploads deleted. Parse timeout still open.
- [done] CSV export formula-injection guard (`lib/csv.ts`), unit-tested and checked in a browser.
- [human] Enable leaked-password protection and admin MFA in Supabase; rotate token secrets.

## P1: core foundations
- [done: expand] Tenancy 0010: `institutions`, `institution_id` on profiles, mentors, students, feedback and every campus-wide table (default = evaluation campus); every policy and helper scoped to the caller's institution; cross-institution tests in CI and production.
- [next: contract] Institution-scoped keys (students.id and analytics_artifacts.key are still globally unique, so two colleges cannot share a roll number); an institution parameter on `ascora_ingest` and `ascora_reset` (both still act on the default institution / all rows); per-institution ML artefacts; institution admin onboarding UI.
- Provisioning: invite-only accounts, first-admin bootstrap, deprovisioning.
- [done] Durable run state: JSON per run under `artifacts/runs/` (survives restarts; interrupted runs marked failed), one run at a time (409), `upload_id` format-validated (path traversal). A database-backed table is still needed for multi-instance hosting.
- Connector interface (discover / test / fetch / normalize, cursors, sync reports), with the file import as connector #1.
- Per-source data freshness on dashboards.

## P2: operations
- Web readiness endpoint; structured logs with request IDs; backup and restore drill; a staging environment.

## P3: polish
- Mobile OTA (expo-updates) with a release channel; Play Store listing.
