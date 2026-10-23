# Demo checklist

Before going on stage (each takes under a minute):
1. `https://ascora-five.vercel.app/api/health?probe=live` returns `{"status":"ok"}`; `/api/health` shows every check true.
2. `https://ascora-ml.azurewebsites.net/health/ready` returns 200 (first call after idle may be slow: warm it).
3. Sign in with the shared demo admin and mentor accounts; confirm 1,200 students and the overview load.
4. Open one high-risk student: score, both risks, reasons, what-if. Run one what-if.
5. Create an intervention for a student and change its status (demo accounts may do this on synthetic data).
6. Have the offline fallback ready: `npm run build && npm run start:offline` in `apps/web` (local, labelled offline).

Say honestly: synthetic data; exports are imported by file, no live portal sync yet; risk is decision support with a human in the loop; before/after is descriptive, not causal.

Do not: run the pipeline from a demo account (it is refused), deploy or merge anything during judging, claim real-world accuracy.

Rollback if the live site breaks: promote the previous Vercel production deployment (`vercel rollback`). Last known-good production commit: `265f4b9` (Next 15.5.28), health verified 2026-10-24; the one before it is `e65c63a`.
