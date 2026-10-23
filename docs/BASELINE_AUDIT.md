# Baseline audit

Taken 2026-10-24 from 00:53 IST on branch `claude/hardening-night` (cut from `claude/wrap-up` at e65c63a, which equals the deployed state per the work log). Everything below was observed in this session; nothing is copied from earlier reports.

## Commands run and results

| Check | Command (cwd) | Exit | Result |
|---|---|---|---|
| ML tests | `.venv/Scripts/python -m pytest -q` (services/ml) | 0 | 58 passed |
| Web unit tests | `npx vitest run` (apps/web) | 0 | 12 files, 54 passed |
| Types | `npx tsc --noEmit` | 0 | clean |
| Lint | `npx eslint` | 0 | 0 errors, 1 warning (`landing/intro.tsx` ref in effect cleanup) |
| Python dependency audit | `python -m pip_audit -r requirements.txt` | 0 | no known vulnerabilities (OSV/PyPI data, requirements file only) |
| npm audit, production deps | `npm audit --omit=dev` | **1** | **critical**: `next` <= 15.5.27, GHSA-2464-fhr4-w9xw (image optimizer RCE via upstream `sharp`, glibc Linux) and GHSA-p3m5-59mp-jv5r (Server Actions DoS). Advisory published 2026-10-22. Installed `sharp` was already 0.35.5 (the fixed version), so the RCE precondition was likely absent, but the audit gate was red. |
| Secret patterns in tracked files | `git grep -E` for sb_secret_, JWT-like, `sk-`, AWS keys, private keys | 0 matches in source | One regex hit inside the minified Expo bundle `apps/web/public/mobile-sim/...js`: it is supabase-js library code that tests whether a key string starts with the prefix `sb_secret_` (the match is the bare 10-character prefix, no key material). Not a credential. Limits: regex scan of the working tree only, not git history, not a replacement for gitleaks. |
| Env files | `git ls-files` for `.env*` | n/a | only `.env.example` files tracked; `.env` / `.env.local` are ignored |

## Live deployment (read-only probes)

- `https://ascora-five.vercel.app/` 200, `/login` 200, `/students` 307 (signed-out redirect).
- `https://ascora-ml.azurewebsites.net`: `/health` 200, `/health/ready` 200; anonymous `GET /connectors` 401; anonymous `POST /pipeline/run`, `/pipeline/upload`, `/whatif`, `/ask` all 401; a forged bearer token on `/whatif` 401. `/docs` and `/openapi.json` are public (200).
- Supabase advisors (security): `ascora_ingest` and `ascora_reset` are executable by `anon` (by design: token-gated, see migrations 0003/0012); five account RPCs are executable by `authenticated` (role-checked inside; covered by `supabase/tests/provisioning.sql`); leaked-password protection is disabled in Supabase Auth (a dashboard setting, not changed here).

## Not verified in this session

- Playwright e2e: the browser binary is not installed on this machine (`chromium_headless_shell-1194` missing), so the 14 e2e tests did not run locally. They run in CI on every PR.
- SQL suites (`supabase/tests/*.sql`): not run locally (no local Supabase stack); they run in the CI `db-rls` job from an empty database.
- Authenticated journeys on production: not exercised (needs a live login; no credentials were requested).

## Findings

1. **Confirmed, fixed on this branch:** `next` 15.5.27 carries a critical advisory. Patch bump to 15.5.28 (no API change). After the bump: `npm audit --omit=dev` 0 vulnerabilities, tsc clean, 54 vitest pass, production build succeeds.
2. **Suspected, low:** ML CORS accepts any origin matching `https://ascora.*\.vercel\.app`. Anyone can create a Vercel project with such a name, but auth is a bearer token (no cookies), so a hostile origin cannot ride a victim's session. Tightening could break preview deployments, so it is left as is for the event.
3. **Open, owner action:** enable leaked-password protection in Supabase Auth settings.

## Smallest safe path to a reliable demo

The deployed build was already healthy. Do not change anything except the Next patch bump, and only after CI (including e2e) is green. Rollback: redeploy the previous Vercel deployment (`vercel rollback`) or revert the merge commit.
