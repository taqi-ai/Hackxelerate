# HACKXELERATE26 — team workspace

Hackathon: **HacXLerate 2026 by byteXL** (https://events.bytexl.com/hacxlerate)
- Round 1 (24h, campus / virtual external track): Oct 5–11, 2026 — done
- Round 2 Buildathon: **Oct 24, 2026 — 16 hours on-site, byteXL office Hyderabad**. Must deploy within the time. Bring own laptops.
- Grand Finale: **Oct 25, 2026** — top 7 teams pitch to an industry jury.
- Judged on: understanding the business problem, solution design, working prototype, presentation.
- Contact: hacxlerate@bytexl.com

Problem statement (pick ONE — fill in once decided): `TBD`
1. AI-Powered Personal Health Copilot (Altrix Labs)
2. AI Content Creator Marketplace (Kampus.vc)
3. Digital Risk Protection Platform (Kampus.vc)
4. AI-Powered Student Analytics & Success Platform (KPMG India)

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
