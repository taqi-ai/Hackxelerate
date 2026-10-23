# Data retention and deletion (current state)

Verified by reading migrations on 2026-10-24. **No retention schedule, erasure workflow or scheduled purge exists.** Current holdings are synthetic.

| Data | Where | How it is removed today |
|---|---|---|
| Pipeline tables (scores, segments, insights, quality log, uploads, per-source rows) | Supabase | `ascora_reset` (token-gated, per institution, migration 0012) deletes pipeline-owned rows on each publish; students, mentors, profiles, plans, history and interventions are kept |
| Students / mentors | Supabase | updated in place by publish; no delete path |
| Interventions, plans, score history, audit log | Supabase | none; kept indefinitely |
| Uploaded files | ML server disk (`artifacts/uploads`) | rejected uploads are deleted; accepted ones are kept |
| Run state | ML disk (`artifacts/runs`) | none |
| LLM cache | Supabase `llm_cache` | replaced on publish |
| Accounts | Supabase Auth + `profiles` | deactivation (migration 0013) ends access; the record remains |

## Needed before real data (decisions belong to the institution)
1. Retention period per data class and its basis.
2. An erasure procedure for one student covering every per-student table, history, uploaded source files and the LLM cache, tested on a disposable database.
3. A scheduled purge for uploads and run files.
4. Backup retention aligned with the above (Supabase backup/PITR coverage is **not verified**).
