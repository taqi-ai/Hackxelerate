# Work log

## 2026-10-19
- Baseline: `main` at 085c079, clean apart from untracked user files.
- P0 T1 fixed: demo tokens plus `require_admin_write`. `pytest -q` gives 37 passed; `npm test` gives 41 passed.
- P0 T2 fixed: `ASCORA_PUBLIC_PREVIEW` gate. Verified on a local production build in both settings. Set to `1` on Vercel production (the evaluation instance).
- Bug: the login-page student picker was broken; `/api/students/search` made public with bounded inputs.
- Ponytail repository audited (see AI_TOOLING.md); the plugin install needs the user to run the slash commands.
- Next: `supabase start`, then write pgTAP RLS tests for mentor / anonymous / student isolation.
- Upload hardening (size, signature, zip-bomb, cleanup) and CSV formula-injection guard. `pytest -q` 38 passed; `npm test` 44 passed; tsc, lint (0 errors), build OK; CSV export checked in a browser (1,200 rows).
