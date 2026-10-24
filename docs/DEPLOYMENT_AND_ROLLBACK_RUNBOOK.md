# Deployment and rollback runbook

Extends `engineering/PRODUCTION_RUNBOOK.md` (topology, health URLs, secrets). This file records the exact steps used on 24 Oct 2026 and what went wrong.

## Web (Vercel, project `ascora`, root `apps/web`)
1. Open a PR. CI must be green: `web-check` (types, lint, unit tests), `web-build`, `e2e` (Playwright), `deps-audit`, `secrets-scan`.
2. Merge to `main`. Vercel deploys production from Git; confirm with `gh api repos/taqi-ai/Hackxelerate/commits/<sha>/status --jq .state` (expect `success`).
3. Verify the live URL, not the deploy message: `/`, `/login`, `/api/health?probe=live` return 200; signed-out `/overview` and `/mission-control` redirect to `/login`.
4. Roll back: Vercel dashboard, Deployments, promote the previous production deployment (or `vercel rollback`).

## ML service (Azure App Service `ascora-ml`, resource group `ascora-rg`)
1. Only changes under `services/ml/app/**`, `requirements.txt` or `startup.sh` trigger `.github/workflows/deploy-ml.yml` (tests under `services/ml/tests` do not). The workflow runs the full pytest suite as a gate, zips `app`, `data/demo` and `artifacts/state.joblib`, deploys with `az webapp deploy --clean --restart`, then waits for `/health`.
2. A test-only change needs a manual run: `gh workflow run deploy-ml.yml --ref main`, then watch with `gh run view <id>`.
3. `state.joblib` is part of the package. It now contains `ask_index` (per-student predictions and stored explanations for Ask). Rebuild it with `cd services/ml && .venv/Scripts/python scripts/publish_demo.py --no-publish`, then commit the changed `state.joblib` only (restore `model_*.joblib` and `llm_cache.json` with `git checkout`, they change byte-for-byte on every run).
4. Verify: `/health/ready` returns 200 with every check true; `POST /ask` without a token returns 401. A signed-in `/ask` check needs a staff token and was not done from this environment.
5. Roll back: re-run "Deploy ML service" on the previous good commit (`gh workflow run deploy-ml.yml --ref <branch or tag>` runs the workflow from that ref), or revert the merge on `main`.

## Database
Migrations 0001 to 0014 are applied to production. No migration was added or applied on 24 Oct. Policy for any new one: expand first, run `db-rls` CI from an empty database, dry-run in a rolled-back transaction on production, then apply. Never edit an applied migration; forward-fix.

## Lessons from 24 Oct
- A deploy gate failed on a flaky test, not on new code. Read the failing log before assuming a regression; production kept running the old version.
- `git`: two agents shared one working tree and one branch switch moved a commit onto the wrong branch. Use a separate `git worktree` for independent work, and publish with `git push origin <sha>:refs/heads/<name>` when the tree is not yours.
- Never run `publish_demo.py` without `--no-publish` unless replacing the live pipeline rows is intended; production already equals a fresh rebuild (1,200 students, AUC 0.8809 and 0.8016).
- Merging several ML PRs separately causes several Azure restarts; combine them first.
