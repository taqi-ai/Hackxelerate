# Known limitations (state on 2026-10-24)

- **Synthetic data only.** All metrics (academic ROC-AUC 0.881, placement 0.802) come from a generated cohort whose labels share latent factors with the features. They are not evidence of accuracy at a real college. The split is random, not out-of-time.
- **No live university connector.** The pipeline ingests exported CSV/XLSX/JSON files. The Data integration panel shows connectors as not configured. Automatic sync needs institutional authorisation and a verified API.
- **One institution per ML deployment.** The data layer is multi-institution; a second institution has not been onboarded end to end.
- **Single-worker ML service.** Run state is file-backed on one App Service (B1); no queue, no scale-out. Not sized for large institutions.
- **Backups unverified.** Supabase backup/PITR coverage and a restore drill are not confirmed.
- **Account security.** Admin MFA not enforced; leaked-password protection off.
- **No alerting**, no data-subject request workflow, no retention or erasure job (see `DATA_RETENTION_AND_DELETION.md`).
- **Interventions:** outcome reports are descriptive before/after, not proof that an intervention caused improvement.
- **Mobile:** a signed APK exists; it is not published on a store.
- **What-if and SHAP** describe the model, not causes; recommendations are not guarantees.
- **Rate limiting** on /ask and /whatif exists only on branch `claude/ml-ratelimit` (not deployed).
- **Public evaluation instance:** `ASCORA_PUBLIC_PREVIEW=1` serves synthetic students without sign-in by design; it must be off for any real data.
- **Local e2e** needs `npx playwright install`; the browser was missing on this machine on 2026-10-24 (CI runs them).
