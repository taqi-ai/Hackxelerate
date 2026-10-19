# Threat model (initial, 2026-10-19)

Assets: student records (synthetic today), staff accounts, scores and predictions, interventions, the ML token secret, the pipeline publish token, the APK signing key.

| # | Threat | Current control | Residual risk / next step |
|---|---|---|---|
| T1 | Public repo exposes the shared demo logins (`@ascora.test`), so anyone can act as admin | **Fixed:** demo tokens carry `demo=true`; the ML service refuses pipeline runs and uploads (`require_admin_write`, tested) | demo users can still create and edit interventions on synthetic data (accepted for the evaluation instance) |
| T2 | Production silently serving fixture students | **Fixed:** preview gated by `ASCORA_PUBLIC_PREVIEW`, default off; middleware ignores the preview cookie when off | the evaluation instance has it on deliberately |
| T3 | Cross-mentor data access | RLS on every table, helpers in a private schema | add automated RLS tests (P0 next) |
| T4 | Cross-institution leakage | not applicable yet (single tenant) | tenancy required before a second institution (P1) |
| T5 | Anonymous SECURITY DEFINER RPCs `ascora_ingest` / `ascora_reset` | shared-secret gated, only a SHA-256 stored | rotate before real data; consider a dedicated database role |
| T6 | Malicious uploads (macros, zip bombs, huge files) | **Fixed:** 25 MB/file, max 12 files, signature checks, xlsx inflate cap, rejected uploads deleted | parse timeout and per-tenant quota still open |
| T7 | CSV formula injection in exports | **Fixed:** `lib/csv.ts` escapes text starting with `= + - @`, tab, CR | |
| T8 | Prompt injection via free-text feedback into the LLM | the LLM only words precomputed facts; never SQL or actions | strip identifiers before LLM calls by default (P2) |
| T9 | Leaked or weak passwords | Supabase Auth | enable leaked-password protection and admin MFA (dashboard, human action) |
| T10 | Loss of the APK signing key | stored outside the repo | back it up offline (human action) |
