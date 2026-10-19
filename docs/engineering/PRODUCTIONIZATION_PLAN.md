# Productionization plan

Ordered backlog. Status per item: done / next / blocked / human. Evidence in WORK_LOG.md.

## P0: security and data integrity
- [done] Demo accounts cannot change published data (ML `require_admin_write`).
- [done] Fixture preview off by default (`ASCORA_PUBLIC_PREVIEW`).
- [next] Automated RLS negative tests (mentor A vs mentor B, anonymous, student) against a local Supabase (`supabase start`), run in CI.
- [done] Upload limits: 25 MB per file, content signature checks, xlsx inflate cap (zip-bomb guard), rejected uploads deleted. Parse timeout still open.
- [done] CSV export formula-injection guard (`lib/csv.ts`), unit-tested and checked in a browser.
- [human] Enable leaked-password protection and admin MFA in Supabase; rotate token secrets.

## P1: core foundations
- Tenancy: `institutions`, `institution_memberships`, `institution_id` on every table (expand, backfill, then constrain), RLS by membership, negative tests.
- Provisioning: invite-only accounts, first-admin bootstrap, deprovisioning.
- Durable `pipeline_runs` table (status, counts, errors) replacing in-memory run state.
- Connector interface (discover / test / fetch / normalize, cursors, sync reports), with the file import as connector #1.
- Per-source data freshness on dashboards.

## P2: operations
- Web readiness endpoint; structured logs with request IDs; backup and restore drill; a staging environment.

## P3: polish
- Mobile OTA (expo-updates) with a release channel; Play Store listing.
