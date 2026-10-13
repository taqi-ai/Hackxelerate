# Instructions for Gemini / Antigravity (read this first, then do only what it says)

You are continuing a project that Claude built. Claude is the lead; your job is to **execute the tasks below exactly as written**, not to redesign. Keep your reasoning short. If a task is not listed, do not start it: ask the user or leave it.

## What this project is
**Ascora**: an AI student-success platform for HacXLerate 2026 (byteXL), KPMG challenge 04. Next.js dashboard + FastAPI ML service + Supabase. Synthetic data only. Live: https://ascora-five.vercel.app

Read these before touching anything: `CLAUDE.md` (decisions and conventions), `docs/architecture.md`, `docs/REQUIREMENTS_MATRIX.md`.

## Current task
Build the mobile app by following `docs/ANTIGRAVITY_MOBILE_BRIEF.md` exactly. Work only in `apps/mobile/`. Do not touch the web app, the ML service or the database; Claude owns those.

## Hard rules (breaking these causes clashes)
1. **Never change the product name, the stack, the database schema semantics, or the scoring logic** (`services/ml/app/scoring`, `models`, `config.py` weights and thresholds). Those are locked.
2. **Never edit an existing migration file.** Add a new `supabase/migrations/000N_name.sql` (next number is 0006) and apply it with the Supabase tooling.
3. **Never commit secrets.** `.env`, `.env.local` and `apps/web/.vercel` are gitignored; keep it that way. Never print a token in chat or logs.
4. **Never touch Azure resources outside `ascora-rg`.** The `lawyerup-prod` group is another live project: do not read, change or delete anything in it.
5. **Work on a branch, not `main`.** `git checkout -b gemini/<short-task-name>`, commit small, open a pull request with `gh pr create`. Do not push to `main` directly. Claude or the user merges.
6. **One task at a time.** Before starting, run `git pull` and read `docs/HANDOFF.md`. When you finish a task, append one line to `docs/HANDOFF.md` (date, task, branch, result). If another line says a task is "in progress", do not start the same task.
7. **No em-dashes** in any user-facing text. No emojis. Keep the existing visual style (shadcn/ui, the tokens in `apps/web/src/app/globals.css`). Do not add new UI libraries.
8. **Do not "improve" working code.** If tests pass and the page works, leave it.
9. **Verify before saying done**: run the checks below and paste the real output summary. Never claim a test passed without running it.

## Commands (Windows, Git Bash or PowerShell)
```bash
# ML service tests (31 should pass)
cd services/ml && .venv/Scripts/python -m pytest -q
# run pipeline locally and refresh the offline snapshot, no database writes
cd services/ml && .venv/Scripts/python scripts/publish_demo.py --no-publish
# publish a fresh run to Supabase (needs services/ml/.env)
cd services/ml && .venv/Scripts/python scripts/publish_demo.py
# ML API
cd services/ml && .venv/Scripts/python -m uvicorn app.main:app --port 8000
# web app
cd apps/web && npm install && npm run lint && npx tsc --noEmit
cd apps/web && npm run dev            # needs apps/web/.env.local
cd apps/web && npm run dev:offline    # no Supabase, no auth, local only
```
Do not run `npm run build` while `npm run dev` is running (they share `.next`). Stop the dev server first.
If `services/ml/.venv` is missing: `python -m venv .venv` then `.venv/Scripts/python -m pip install -r requirements.txt`.

## Where things are
- Pages: `apps/web/src/app/(app)/*`; shared UI: `apps/web/src/components`; data access: `apps/web/src/lib/data.ts` (also has offline-mode branches: keep both in sync).
- API: `services/ml/app/main.py`; pipeline: `pipeline.py`; intelligence: `intelligence.py`.
- Supabase project ref: `xomihahbrxacgrwclect`. Demo logins are on the login page.

## Task list (do in this order; Claude updates it)
- [ ] T1. **Slides.** Build `docs/slides/` as a Markdown deck from `docs/pitch-outline.md` using real numbers from `docs/score-note.md`. No invented numbers.
- [ ] T2. **Feedback themes page**: `/feedback` (admin and mentor). Read `feedback` rows (theme, sentiment, language, course) through `lib/data.ts`, show theme counts by course and sentiment, and a table of recent comments (Hindi, Hinglish, English). Add a sidebar entry in `components/app-shell.tsx`. Follow the style of `app/(app)/segments/page.tsx`.
- [ ] T3. **Component tests**: add Vitest tests for `lib/format.ts` (`maskEmail`, `maskPhone`, `suggestIntervention`) in `apps/web`. Add `"test": "vitest run"` and a CI step in `.github/workflows/ci.yml`.
- [ ] T4. **README screenshots**: after the user supplies assets, add them to `README.md`. Do not invent images.
- [ ] T5. Anything the user asks directly. If it touches the locked items in the hard rules, ask first.

## If something fails
1. Read the actual error. 2. Fix the smallest thing. 3. Re-run only the affected check. 4. If you are stuck after two attempts, stop and write the problem in `docs/HANDOFF.md` for Claude. Do not retry the same command repeatedly, and do not work around a permission or safety block.

## Handing back
When your session ends, make sure `git status` is clean on your branch, your PR is open, and `docs/HANDOFF.md` has your entry.
