# Overnight audit log (Claude, 2026-10-14)

## Claim verification
| Claim | Evidence | Independent test | Result |
|---|---|---|---|
| Seven-source integration | `services/ml/app/ingest`, `scripts/run_integration_check.py` | Ran it: 7 sources, row counts, 60 conflicts, fixes counted | Verified (synthetic data only) |
| Fuzzy matching 100% precision / 95% recall | planted ground truth `data/demo/_truth_links.parquet` | Re-ran: precision 1.0, recall 0.9529 | Verified (synthetic) |
| Success Score, 6 weights | `services/ml/app/scoring` | `pytest` 36 pass | Verified |
| Rank stability 0.997 | `docs/score-note.md` | Not re-run | Not re-verified |
| LightGBM AUC 0.881 / 0.802 | saved `model_*.joblib` metrics, real 75/25 hold-out | Loaded artifacts: 0.8809 / 0.8016, CV 0.870 / 0.839 | Verified as stored; labels simulated; logistic baseline equal (0.875 / 0.806) |
| TreeSHAP | `models/risk.py` | Covered by existing tests | Partial (not re-checked per prediction) |
| RLS and audit log | migrations 0001, 0004, 0006; Supabase advisors | Policies read; advisors show only the token-gated ingest RPCs | Partial: append-only for app users, not tamper-proof |
| DPDP compliance | design only | n/a | Not a legal claim; reworded |
| CU Lucknow integration | `student/connection/page.tsx`, `login-form.tsx` | Code read | **False as claimed**: external link + manual import, no retrieval. Fixed UI |
| Web tests 17, ML tests 36 | | Ran: 20 web (17 + 3 new), 36 ML | Verified |
| Typecheck, lint, build | | Ran locally: clean | Verified |
| CI and deploy | `gh run list`, Vercel API | main CI green; ascora-five.vercel.app and Azure ML /health respond | Verified (reachable); authed flows not exercised |
| 106.5 / 100 score | | | **Invalid**, removed |
| Mobile APK | `apps/mobile` is Ujjwal's, branch `gemini/mobile-and-offline-fixes` | Not built or installed | Blocked / not verified |

## Fixed
- Fabricated "synchronized / last verified 4h ago" CU Lucknow status; now shows demo vs imported honestly.
- Due dates/overdue used UTC date (wrong day in IST before 05:30): new `src/lib/dates.ts` + tests, 8 call sites.
- Duplicate `.theme-fade` rules; reduced-motion guard now actually wins the cascade.
- Scorecard rewritten with honest ranges, synthetic-data caveat, corrections list.

## Open risks
- Students can write their own `external_connections` row (provenance label spoofable). Low impact.
- No browser E2E suite; no APK/OTA verification; no measured Web Vitals.

## Ujjwal's mobile branch (`origin/gemini/mobile-and-offline-fixes` @ baf915e), reviewed 2026-10-14
- Touches `apps/mobile` plus one web change (`user-menu.tsx`: skip Supabase signOut when env missing). No overlap with PR #5.
- `npm ci`, `tsc --noEmit`, `eslint`: clean. `expo export --platform android`: Hermes bundle builds (4.1 MB).
- Only a public Supabase publishable key is embedded (safe by design).
- No APK: no Android SDK on this machine, no `eas.json`, no `android.package`, no `expo-updates`, no signing identity. Needs an Expo/EAS account or Android SDK from the team.
- Not merged: no PR open yet. Nothing installed on a device or emulator.

## Release 2026-10-14 (PRs #5 and #9, live on https://ascora-five.vercel.app)
Verified live after deploy: `/`, `/mobile`, `/mobile-sim` (+ deep links), `/product`, `/how-it-works`, `/trust`, `/about`, `/login` return 200; authed routes redirect to login; the simulator loads the real Expo app with no console errors; fonts and bundle 200.

| Change | Evidence |
|---|---|
| New landing hero above the original (kept as second section, `#platform`) | Rendered at 1440 and 390 px, no horizontal overflow |
| `/mobile`: the real mobile app in a phone frame, honest "APK not published yet" notice, nav link, hero CTA | Production run: frame loads, 0 console errors |
| Landing/product screenshots regenerated from the current UI (`public/assets/shots`) | Captured from the running app, 2400x1500 |
| Mobile "Ask Ascora" was a canned simulation with invented statistics | Rewritten to answer only from rows the user can see (counts, averages, alert text); no fabricated figures |
| Student pages crashed when internal marks were missing (14 of 60 sampled demo students on `/student`; 743 of 1,200 students have at least one missing internal mark) | 60-student sweep over all four student pages: 0 errors after fix |
| Invented numbers in the student UI: "classes attended of 40" and an MST/assignment/quiz split of internal marks | Split removed; attendance counts labelled as estimates (register stores percentages only) |
| "63 silent decliners" (alert rule) vs "160" (behaviour cluster) looked contradictory | Explained on Segments with live numbers (54 of 63 fall in the cluster) |
| Accessibility | axe-core (WCAG 2.0/2.1/2.2 A and AA rules) clean in light and dark on `/`, `/mobile`, `/trust`, `/overview`, `/students`, `/students/[id]`, `/segments`, `/interventions`, `/model`, `/data`, `/fairness`, `/this-week`, `/ask`, `/settings`, `/student`. Fixed contrast, unlabelled sliders, unfocusable scroll regions, list markup. Automated rules only; no manual screen-reader pass |
| Performance | Vercel functions pinned to `hnd1` (next to Supabase in Tokyo; was `iad1`). Landing TTFB 2.1 s to 0.86 s (single curl samples). Page transition is CSS, so content is visible before hydration (the old JS `opacity: 0` start left pages blank on slow loads). Middleware skips Supabase for demo sessions and the simulator files. Authenticated page timings not measured (no credentials used) |

## Still not done
- Android APK: none exists (no Android SDK here, no `eas.json`, no package id, no signing identity). The site says so. OTA: not configured, not claimed.
- Authenticated production flows (login, mentor, intervention writes) were not exercised against production: entering account passwords on a non-local host is outside what this session may do. They were exercised in offline mode locally.
- No Lighthouse/Web Vitals field data.
