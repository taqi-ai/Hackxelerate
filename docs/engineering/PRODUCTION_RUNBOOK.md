# Production runbook

Topology: web on Vercel (project `ascora`, root `apps/web`, functions in `hnd1` next to the database), database and
auth on Supabase (project `xomihahbrxacgrwclect`, Tokyo), ML service on Azure App Service (`ascora-ml`, resource group
`ascora-rg`, Central India), Azure OpenAI for optional wording. There is one environment today (production, synthetic
data); a staging environment is a release gate before real data.

## Health
| Check | URL | Healthy |
|---|---|---|
| Web live | `https://ascora-five.vercel.app/api/health?probe=live` | 200 `{"status":"ok"}` |
| Web ready | `https://ascora-five.vercel.app/api/health` | 200, every check `true` (settings + ML reachable) |
| ML live | `https://ascora-ml.azurewebsites.net/health/live` | 200 |
| ML ready | `https://ascora-ml.azurewebsites.net/health/ready` | 200, every check `true` |

Readiness answers 503 with booleans naming the missing piece; values are never shown.
ML request logs: one JSON line per request (`ascora.request`) with `request_id`, method, path (roll numbers
redacted), status and ms. Find a request by the `X-Request-ID` response header in App Service log stream.

## Deploy
- **Web:** merge to `main`; Vercel builds from Git. If no production deployment appears for the merge commit
  (the Git hook can be missed), redeploy the current production deployment with the latest commit:
  `vercel api "/v13/deployments?teamId=<team>" --method POST --input body.json` with
  `{"name":"ascora","project":"ascora","deploymentId":"<current prod dpl id>","withLatestCommit":true,"target":"production"}`.
- **ML:** merging changes under `services/ml/**` runs `.github/workflows/deploy-ml.yml` (tests gate the deploy).
  When `requirements.txt` changes, the first start reinstalls dependencies into `/home/deps` and can take over
  10 minutes on the B1 plan; the start limit is set to 30 minutes (`WEBSITES_CONTAINER_START_TIME_LIMIT=1800`).
  Later restarts reuse the cached dependencies and take seconds.
- **Database:** migrations in `supabase/migrations`, applied in order. Every PR touching `supabase/**` runs CI
  `db-rls`: all migrations from an empty database, then `supabase/tests/rls_isolation.sql`. Apply to production only
  after CI is green, then run the same test file against production (it always rolls back).

## Roll back
- **Web:** Vercel dashboard, Deployments, promote the previous production deployment (or `vercel rollback`).
- **ML:** re-run "Deploy ML service" (`workflow_dispatch`) on the previous good commit, or revert the commit on `main`.
- **Database:** forward-fix with a new migration; never edit an applied migration except to make it idempotent
  for empty databases. Before any destructive change, take a backup (Supabase dashboard, Database, Backups).

## Secrets (names only; values live in Vercel / Azure / Supabase settings)
| Name | Where | Rotate |
|---|---|---|
| `ASCORA_TOKEN_SECRET` | Vercel (web) and Azure (ML), must match | set the new value in both, redeploy web, restart ML; outstanding tokens expire within 10 minutes |
| `ASCORA_INGEST_TOKEN` | Azure (ML); its SHA-256 in `private.ingest_secret` | insert the new hash, update Azure, restart, delete the old hash row |
| Supabase anon key | Vercel, mobile app build | rotate in Supabase; rebuild the mobile app |
| Azure OpenAI key | Azure (ML) | rotate in Azure portal; restart ML |
| APK signing key | offline, `C:\Users\mohdt\.ascora-signing` | never rotate (updates would break); keep two offline backups |

## Feature flags
- `ASCORA_PUBLIC_PREVIEW=1` (Vercel): public student preview from synthetic files. Off by default; must be off for an
  institution with real data.
- `ASCORA_DEMO_EMAIL_DOMAIN` (Vercel): accounts on this domain are treated as shared demo logins (cannot run or
  publish the pipeline). Default `ascora.test`; `none` disables.
- `ASCORA_LLM=off` (Azure, ML service): nothing is ever sent to an external model; all wording falls back to deterministic text. Every prompt is redacted anyway (roll numbers, emails, phones).

## Incident first steps
1. Check the four health URLs; note which check is `false`.
2. ML down: App Service, Log stream; look for `[startup]` lines (dependency install) or a traceback.
3. Data looks wrong after a pipeline run: the run's status is in `artifacts/runs/<run_id>.json`; re-run is idempotent.
4. Suspected data exposure: revoke sessions in Supabase Auth, set `ASCORA_PUBLIC_PREVIEW` off, rotate
   `ASCORA_TOKEN_SECRET`, preserve logs, inform the institution's data protection contact.

## Backups
Backup coverage and point-in-time recovery for this Supabase plan have **not been verified**, and no restore
drill has been performed. Both are release gates before real data.
