# Security remediation log

| Date | Finding | Severity | Fix | Evidence |
|---|---|---|---|---|
| 2026-10-20 | Vulnerable Python dependencies: Starlette 0.41.3 (many advisories), python-multipart 0.0.20 (upload parser), pyarrow, lightgbm, python-dotenv, pytest | P1 | fastapi 0.148.0 (Starlette 1.9.0), python-multipart 0.0.31, pyarrow 23.0.1, lightgbm 4.6.0, python-dotenv 1.2.2, pytest 9.0.3 | `pip-audit` clean; 48 pytest; saved models give identical predictions under lightgbm 4.6 |
| 2026-10-20 | `shadcn` CLI shipped as a production dependency (pulled 6 high advisories into the runtime tree) | P2 | moved to devDependencies | `npm audit --omit=dev`: 9 to 2 |
| 2026-10-20 | **Accepted risk (review by 2026-11-30):** `next` 15.x (moderate) and its bundled `postcss` (high, source-map path traversal at build time). Fixed only in Next 16, a breaking upgrade | P2 | tracked: Next 16 upgrade with full regression pass | CI blocks on critical; this item is visible in every audit run |
| 2026-10-20 | Staff-typed Ask questions sent to the external LLM verbatim (could contain roll numbers, emails, phones) | P1 | `redact()` in `services/ml/app/insights/llm.py`, applied to every prompt | `pytest tests/test_llm_boundary.py` |
| 2026-10-19 | Any signed-in account (students, profile-less users) could read campus analytics, insights, segments, quality log and cached LLM text | P1 | migration 0009: staff-only policies (applied to production) | CI `db-rls` from empty; production suite in a rolled-back transaction |
| 2026-10-19 | `upload_id` joined into a server path without validation (path traversal into any directory) | P0 | pattern `^[0-9a-f]{10}$` on `RunRequest.upload_id` | `pytest tests/test_runs.py::test_upload_id_cannot_point_outside_the_uploads_folder` |
| 2026-10-19 | Signed-in students could read, create and update staff intervention records about themselves | P0 | migration 0008: `private.is_staff()` on intervention policies (applied to production) | `supabase/tests/rls_isolation.sql` (CI `db-rls`, and production in a rolled-back transaction) |
| 2026-10-19 | Migrations failed on an empty database (0002 renamed a function 0001 no longer creates) | P1 | 0002 made conditional | CI `db-rls` applies 0001-0008 from empty |
| 2026-10-19 | Shared demo admin (public repo) could run and publish the pipeline and upload files to the ML service | P0 | `require_admin_write` in `services/ml/app/auth.py`; web marks demo tokens (`apps/web/src/lib/demo-accounts.ts`) | `pytest tests/test_auth.py::test_shared_demo_accounts_cannot_change_published_data`; `vitest src/lib/demo-accounts.test.ts` |
| 2026-10-19 | Fixture student preview always on in production | P0 | `ASCORA_PUBLIC_PREVIEW` flag (default off) in data layer, actions, search API and middleware | local production build: off gives `/student` 307 to login and search `[]`; on gives 200 |
| 2026-10-19 | Uploads: no size limit, no content check, zip-bomb risk | P0 | size cap, signature checks, inflate cap, cleanup (`services/ml/app/main.py`) | `pytest tests/test_auth.py::test_upload_rejects_disguised_oversized_and_bomb_files` |
| 2026-10-19 | CSV export formula injection | P1 | `apps/web/src/lib/csv.ts` | `vitest src/lib/csv.test.ts`; browser export of 1,200 rows |
| 2026-10-19 | Login-page student picker broken (API redirected to login) | P2 bug | `/api/students/search` public with bounded inputs | curl against a local production build |
| 2026-10-14 | Student portal 500s and fake plan saves | P1 | preview files, honest errors | `docs/OVERNIGHT_PROGRESS.md` |

Open items that need a human: enable Supabase leaked-password protection and admin MFA; rotate `ASCORA_TOKEN_SECRET` and the ingest token before any real data; an independent penetration test; legal / DPO review (DPDP Act 2023 and its rules).
