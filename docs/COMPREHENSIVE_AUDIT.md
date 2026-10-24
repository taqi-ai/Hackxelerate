# Comprehensive audit and release report (24 Oct 2026)

Scope: what was observed or built between 00:52 and about 14:30 IST on 24 Oct 2026. Evidence lives in the files named; nothing here is copied from earlier AI reports unless marked. Earlier work (19 to 21 Oct) is in `engineering/WORK_LOG.md` and `engineering/SECURITY_REMEDIATION.md`.

## 1. Architecture as observed
Browser -> Next.js 15 on Vercel (`apps/web`) -> Supabase Postgres + Auth (row-level security) for data; heavy work (what-if, ask, pipeline) -> signed 10-minute token -> FastAPI on Azure App Service (`services/ml`, one institution per deployment, holds no database key; publishes through the token-gated `ascora_ingest` function). Offline demo mode serves a local snapshot (`apps/web/demo-data/snapshot.json`, gitignored, rebuilt by `scripts/publish_demo.py --no-publish`).

## 2. Findings and status
| # | Finding | Severity | Status | Evidence |
|---|---|---|---|---|
| 1 | `next` 15.5.27 critical advisories (image-optimizer RCE via sharp; Server Actions DoS) | Critical by advisory (installed sharp already fixed) | Fixed, deployed (15.5.28) | `BASELINE_AUDIT.md`, PR 51 |
| 2 | Flaky deploy gate: `test_tampered_token_is_rejected` passed by chance 1 in 64 | Medium (blocked a deploy) | Fixed, PR 56 | failed deploy run 40069463030, rerun green |
| 3 | Header mapper let an early fuzzy match take a field from a later exact match | Medium (data quality) | Fixed, PR 53 | `tests/test_mapping_review.py` |
| 4 | Rule parser read "show me" as the ME branch | Medium | Fixed, PR 58 | `tests/test_ask_grounded.py` |
| 5 | Ask: a provider exception was uncaught on free-form questions | Low | Fixed, PR 58 | `test_provider_failure_falls_back_to_rules...` |
| 6 | No rate limit on `/ask` and `/whatif` (LLM spend) | Medium | Fixed, 60/min per caller, deployed | `tests/test_ratelimit.py` |
| 7 | ML CORS regex accepts any `ascora*.vercel.app` | Low (bearer tokens, no cookies) | Open, accepted for now | `SECURITY_CONTROL_MATRIX.md` |
| 8 | Supabase leaked-password protection off; admin MFA not enforced | Medium | Open, dashboard action (owner) | Supabase advisor |
| 9 | No retention or erasure workflow, no alerting, backups and PITR unverified, no restore drill | High before real data | Open | `DATA_RETENTION_AND_DELETION.md`, `PRIVACY_AND_COMPLIANCE_READINESS.md` |
| 10 | Mission Control and the grounded Ask were not exercised with a real signed-in staff session on production | Verification gap | Open | see 4 |

## 3. Security verification this session (read-only)
Row-level security on 25 of 25 public tables; no policy for `anon`; anonymous REST reads return empty and anonymous update or delete changes nothing; anonymous calls to account functions are refused; `ascora_ingest` and `ascora_reset` reject a bad token; every ML write and ask route returns 401 without a valid token; `npm audit --omit=dev` and `pip-audit` clean after the fixes. The SQL suites in `supabase/tests` were not re-run (no schema change; they run in CI). Not claimed: full ASVS conformance, DPDP compliance, penetration testing.

## 4. Tests run (actual)
- ML: `python -m pytest -q` in `services/ml`: 145 passed locally before the Ask merge; the deploy gate re-ran the suite and the deploy succeeded.
- Web: `npx vitest run` 85 passed (local, before the Ask merge); CI web-check and web-build green on every merged PR; Playwright e2e 15 journeys green in CI (cannot run locally: browser not installed on this machine).
- axe (WCAG 2.2 AA tags) on `/mission-control` and `/model` Evaluation data tab, dark and light: 0 violations (automated only).
- Not run: SQL suites locally, authenticated production journeys, load tests, restore drill.

## 5. What was built and deployed
Mission Control (`/mission-control`, capacity-constrained greedy plan, human approval, server-recomputed); Evaluation data tab (synthetic vs OULAD, labelled); OULAD external benchmark (AUC about 0.70 out of time, LightGBM no better than logistic; `EXTERNAL_PUBLIC_DATA_BENCHMARK.md`); mapping-review API and SSRF guard (no connector uses them yet); rate limiter; evidence-grounded Ask Ascora backend (`ASK_GROUNDED_CONTRACT.md`). The web screen that renders the grounded Ask answer is being built by the frontend agent and is not part of main yet.

## 6. Connectors
Genuinely tested: file import only (synthetic files). Not built or tested against any real system: OneRoster, Moodle, Canvas, CUIMS, SFTP. No institutional authorisation or credentials exist.

## 7. Resources and cost
Azure: existing `ascora-ml` App Service in `ascora-rg` redeployed several times (restart on each); no resource created, deleted or resized. Azure OpenAI used only for free-form Ask filter proposals and optional wording, prompts redacted. No billing or credit data was readable from this environment, so spend is not reported. Vercel: normal Git-driven production deployments. Supabase: read-only queries; no writes, no migrations, no republish.

## 8. What a real-university pilot still needs
Written institutional authorisation and a data-processing agreement; a verified export or API for their systems; privacy notice, retention policy, erasure procedure and breach owner; admin MFA and leaked-password protection; backup and restore evidence; independent security test and legal review; out-of-time model validation on their own historical outcomes.

## 9. Claims supported by evidence
Supported: the pipeline, scores, both models and their stored explanations work on the synthetic cohort and reproduce (AUC 0.8809 academic, 0.8016 placement); access is restricted as probed above; interventions persist with baselines (offline build verified, CI-tested). Not supported: real-world accuracy, compliance with any law, production readiness, live university integration, causal benefit of interventions.
