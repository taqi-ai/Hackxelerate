# Autonomous work log (overnight 2026-10-24)

Window: started 00:52 IST, stop at 05:00 IST (owner instruction). Earlier history lives in `docs/engineering/WORK_LOG.md`.

## Batch 1 (00:52-01:30)
- Branch `claude/hardening-night` created. Baseline in `docs/BASELINE_AUDIT.md`.
- Found `npm audit` critical on `next`; bumped to 15.5.28. tsc, vitest, build verified locally. e2e could not run locally (no Playwright browser); relying on CI.
- Next: open PR, wait for CI, merge if green, verify production, then continue the audit (RLS grants review, upload limits, pipeline idempotency).

## Batch 2 (01:15-02:30)
- PR #51 merged (CI incl. 14 e2e green); production deployment for 265f4b9 reports success; web `/`, `/login`, health 200 afterwards.
- Verified live: RLS on 25/25 tables, anonymous reads empty, anonymous RPCs refused, ML endpoints 401 anonymously.
- Rate limiter for ML `/ask` and `/whatif` built and tested (61 pytest) on branch `claude/ml-ratelimit`, **not merged** (an ML deploy restarts the Azure app; held until after the event).
- Docs added: PRIVACY_AND_COMPLIANCE_READINESS, DATA_RETENTION_AND_DELETION, INCIDENT_RESPONSE_RUNBOOK, SECURITY_CONTROL_MATRIX, MVP_KNOWN_LIMITATIONS, BUILDATHON_DEMO_CHECKLIST, FOUNDER_TECHNICAL_HANDOFF. DPDP dates are from secondary sources (MeitY page blocked, 403).
- Not done: connector framework / mapping UI (large, risky on event day), RLS suite re-run, authenticated live journeys, Azure cost review (no credit data read), restore drill.
- Next: decide on merging the rate limiter after the event; enable Supabase leaked-password protection and admin MFA (dashboard).

## Batch 3 (07:30-08:30, 24 Oct)
- Mission Control merged (PR 55, CI green incl. new e2e) and deployed (6995828): `/mission-control` redirects signed-out users to login; not exercised with a live staff login. Offline build: 128 interventions persisted with baselines.
- Found and fixed: header mapper let an early fuzzy match steal a field from a later exact one (PR 53, held).
- OULAD benchmark executed (PR 54, held): out-of-time AUC about 0.70, LightGBM no better than logistic. See `docs/EXTERNAL_PUBLIC_DATA_BENCHMARK.md`. No web UI section added.
- Held PRs (touch services/ml, would redeploy Azure): ratelimit branch, 53, 54.

## Batch 4 (24 Oct, after 08:30)
- ML work merged and deployed: PR 53 (mapping review API, exact-before-fuzzy fix, SSRF guard, rate limiter), PR 54 (OULAD benchmark), PR 56. First ML deploy was blocked by a flaky pre-existing test (`test_tampered_token_is_rejected` passed by chance when the signature started with A); fixed, re-dispatched, deploy succeeded; ML health/ready 200; `/mapping/suggest` 401 anonymously.
- Evaluation data tab on `/model` (synthetic demo and OULAD side by side, labelled not comparable); constants guarded by a test against `docs/benchmarks/oulad_results.json`.
- Still open: signed-in check of Mission Control on production (needs a staff login), web screen for the mapping review, Supabase MFA and leaked-password protection (dashboard), restore drill.

## Recovery
`git checkout claude/hardening-night`; run `npm ci && npm test && npm run build` in apps/web and `pytest -q` in services/ml. Roll back production with `vercel rollback` to the deployment preceding the merge.
