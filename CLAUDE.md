# HACKXELERATE26 — team workspace

Hackathon: **HacXLerate 2026 by byteXL**. Rule summary: `docs/RULEBOOK_SUMMARY.md` (from the official Round 1 rulebook PDF — the source of truth).
- **We are in Round 1 now: 24h physical campus hackathon.** Deadline = official start + 24h. Record exact start/deadline in `docs/PREP.md` once known.
- First 2h: pick + LOCK one problem statement (Team Lead only, permanent). Remaining 22h: build, deploy, submit. Resubmission allowed; the latest valid submission counts.
- Submit on the byteXL Hackathon Platform: project info + accessible GitHub repo + working deployment link (+ challenge-specific fields). Nimbus by byteXL is the suggested env; other tools are allowed.
- Gate 1 = automated check of mandatory functionality (fail = no human eval). Gate 2 = human eval (problem understanding, functionality, technical execution, innovation, UX, quality, deployment, scalability).
- If we qualify: Top 50 -> Round 2 buildathon (Oct 24, Hyderabad, 16h) -> Top 7 finale (Oct 25).
- Contact: hacxlerate@bytexl.com

Problem statement: `TBD`. The 4 below are from the public website; the official Round 1 statements arrive on the platform at start. Don't assume they are final.
1. AI-Powered Personal Health Copilot (Altrix Labs)
2. AI Content Creator Marketplace (Kampus.vc)
3. Digital Risk Protection Platform (Kampus.vc)
4. AI-Powered Student Analytics & Success Platform (KPMG India)

## How to work (the team lead's master instructions, condensed)
Role: lead engineer / architect / QA / deploy for the team. Goal: qualify for Top 50 and win. Never break rules or misrepresent functionality.
1. Don't invent the challenge. Wait for the official statements, then give a comparison matrix (mandatory functionality, likely automated checks, feasibility, innovation, deployability, data/API availability, risk) and recommend one. The Team Lead makes the lock decision. After lock, never suggest switching.
2. After lock: extract every mandatory feature / acceptance criterion into `docs/REQUIREMENTS_MATRIX.md` (requirement -> implementation -> test -> status -> risk). "Verified" only after observed behaviour.
3. Priority: P0 mandatory features -> P1 automated-eval readiness (routes, schemas, status codes, persistence, error handling, deployed == local) -> P2 one or two real differentiators -> P3 polish. No polish while P0 is incomplete.
4. No fake success, hardcoded outputs posing as computation, placeholder mandatory features, or simulated AI presented as a real model. Put external AI behind a service interface with timeouts and an honest fallback. Never invent benchmarks, users or results. Never game the evaluator.
5. Simplest robust architecture, vertical slices. Deploy a working baseline EARLY, keep it green, make the first valid submission early.
6. Deployment: use existing CLI sessions; never ask for credentials in chat; never print or commit tokens; no destructive prod commands without approval.
7. Maintain README, `docs/EVALUATOR_QA.md`, `docs/REQUIREMENTS_MATRIX.md` and a defect list by severity. Final audit in `docs/FINAL_GATE.md` (PASS / FAIL / NOT VERIFIED).
8. Time plan for the 22h build: 10% setup · 45% mandatory features · 15% differentiators · 15% tests/bugfix · 10% deploy/docs · 5% final verification. Give short milestone updates (done / doing / blocked / mandatory status / top risk / next).
9. Act autonomously on routine work. Ask only for missing essentials, ambiguity, irreversible decisions, secrets or costs.

## Product decisions (locked)
- Product name: **Ascora** (not Pragati). Tagline: "From early warning to real intervention."
- Locked challenge: **KPMG in India, Challenge 04: Smart Campus Analytics** (student success score, at-risk identification, dashboard).
- The full build brief is `master promptinitialclaude.md` (gitignored, not for evaluators). Rubric: Data Integration 30, Score and Risk 25, Dashboard 25, Problem Understanding 10, Demo 10.
- Live: https://ascora-five.vercel.app. Supabase project ref `xomihahbrxacgrwclect` (ap-northeast-1). Vercel project `ascora`, root `apps/web`, Git-connected.
- Azure is NOT set up yet; the ML service (FastAPI) runs locally until the user supplies Azure. Do not touch Azure until told.

## Layout
- `apps/web`: Next.js 15 dashboard. `npm run dev`, `npm run dev:offline` (snapshot mode, local only).
- `services/ml`: FastAPI service. `.venv` is local (gitignored). `pytest -q` for tests; `scripts/publish_demo.py` runs the full pipeline.
- `data/generator`, `data/demo`: synthetic data and the frozen judging set (`data/raw` is gitignored).
- `supabase/migrations`: 0001-0005 applied to the live project.
- `docs`: score-note, architecture, demo-script, pitch-outline (deliverables); PREP, RULEBOOK_SUMMARY, REQUIREMENTS_MATRIX, EVALUATOR_QA, FINAL_GATE.
- `motion`: Remotion videos (placeholder intro; build the real trailer once the logo exists).
- `ASSETS_NEEDED.md`: assets the user must provide; never invent or download assets.

## Conventions
- Windows dev machine; Node 22, npm; Python 3.12 venv in `services/ml/.venv`.
- Secrets only in `.env`/`.env.local` (gitignored). The ML service never holds the Supabase service-role key; it uses the token-gated `ascora_ingest` RPC.
- Git Bash rewrites leading `/` in arguments: use `MSYS_NO_PATHCONV=1` for `vercel api /v9/...`.
- Don't run `npm run build` while the dev server runs (they share `.next`); stop the dev server first.
- Remotion agent skills are in `.claude/skills/`; use them for video work.
- No em-dashes in user-facing copy.
