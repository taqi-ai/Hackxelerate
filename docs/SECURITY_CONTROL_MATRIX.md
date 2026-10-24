# Security control matrix (observed 2026-10-24)

Not an ASVS conformance claim. "Verified" means observed in this session; "CI-tested" means a repo test that CI runs but this session did not re-run.

| Control | Status | Evidence |
|---|---|---|
| RLS enabled on every public table | Verified | query: 25/25 tables RLS on, each with policies; none targets `anon`/`public` or is `true` |
| Anonymous cannot read | Verified | live REST GET on 8 sensitive tables returned `[]` |
| Anonymous cannot write | Verified (partly) | PATCH/DELETE on interventions affected 0 rows; INSERT was refused by a tenancy trigger before RLS, so insert refusal at RLS level rests on `supabase/tests/rls_isolation.sql` (CI) |
| Anonymous RPC | Verified | `list_accounts`, `claim_invite` permission denied; `ascora_ingest`/`ascora_reset` reject a bad token (anon-executable by design) |
| Role / tenant isolation | CI-tested | `rls_isolation.sql`, `ingest_tenancy.sql`, `provisioning.sql`, `intervention_rules.sql` |
| ML endpoints authenticated | Verified | all POST routes and `/connectors` return 401 anonymously; a forged token gives 401 |
| Demo accounts cannot change data | CI-tested | `tests/test_auth.py` |
| Upload limits, zip bomb, path traversal | CI-tested | `tests/test_auth.py`, `tests/test_runs.py` |
| Rate limiting on /ask and /whatif | **Branch only** | `claude/ml-ratelimit`, 61 pytest pass; not merged or deployed (held until after the event) |
| CORS | Weak, low risk | ML allows `https://ascora*.vercel.app` by regex; bearer-token auth, no cookies |
| Dependencies | Verified | `npm audit --omit=dev` 0 after next 15.5.28; pip-audit clean |
| Secrets in tree | Partly verified | regex scan of the working tree clean; CI gitleaks job passes; git history not scanned here |
| Supabase Auth hardening | Open | leaked-password protection off (advisor); admin MFA not enforced |
| Logging | Partial | ML request log only; no alerting; no audit of reads |
