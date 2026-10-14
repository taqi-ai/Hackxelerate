# Overnight state
Live on main (3b628c3+): PRs #5 and #9. Mobile source is Ujjwal's: re-export the simulator with `npm run export:web` in apps/mobile whenever mobile code changes, and commit apps/web/public/mobile-sim.
Done: claim audit, IST dates, honest CU Lucknow status, new hero, /mobile simulator, student crash fix, mobile Ask rewrite, axe clean, Tokyo region.
Do NOT repeat: the claim audit, the axe sweep, the 60-student sweep (re-run only after UI changes: scripts were in the session scratchpad).
Next: APK needs an Expo/EAS account or Android SDK + signing identity (not available); authed prod smoke by a human with the demo accounts in docs/DEMO_SCRIPT.md; Web Vitals field data.
Resume: git fetch; cd apps/web && npx tsc --noEmit && npm test && npm run lint. Stop `next dev` before tsc/build (memory).
