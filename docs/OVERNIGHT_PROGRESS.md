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
