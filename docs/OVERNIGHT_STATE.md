# Overnight state
Branch: `claude/overnight-audit`. Mobile (`apps/mobile`) is Ujjwal's: do not edit; check `origin/gemini/mobile-and-offline-fixes`.
Done: truth audit of Gemini claims (see OVERNIGHT_PROGRESS.md), IST date fix, CU Lucknow honesty fix, scorecard correction.
Do NOT repeat: re-running pytest/integration check, re-reading the scorecard claims.
Next: browser E2E smoke of login/mentor/student flows, calendar "+N more" overflow, measure route-change/theme performance, review Ujjwal's mobile branch when merged to main, APK/OTA only if signing + EAS config exist (not yet checked).
Resume: `git fetch`, `cd apps/web && npx tsc --noEmit && npm test && npm run lint`.
