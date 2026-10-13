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

## Layout
- `motion/` — Remotion (v4) videos: demo video, intro, social cuts. `npm run dev` opens Studio.
  - Brand values live in `motion/src/theme.ts`; keep them in sync with the app theme.
  - Compositions: `Intro` (1920x1080), `Social` (1080x1920).
- `app/` — main product (web). Not scaffolded yet.
- `mobile/` — mobile app, only if the idea needs it (Expo / React Native planned). Not scaffolded yet.
- `docs/` — idea, pitch script, demo script, judging notes.
- `assets/` — shared brand files (logo, fonts) and product screenshots/screen recordings used by `motion/`.

## Conventions
- Windows dev machine; Node 22, npm. Each sub-project has its own `package.json` (no monorepo tooling).
- Secrets go in `.env.local` files (gitignored). Never commit keys.
- Optimise for demo-ability: every feature should be showable in the live demo or the video.
- Remotion agent skills are installed in `.claude/skills/` (`remotion-best-practices` is the router) — use them for any video work.
