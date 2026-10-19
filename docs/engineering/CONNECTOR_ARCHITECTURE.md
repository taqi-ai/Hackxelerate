# Connector architecture

## What exists today
| Source | Status | Notes |
|---|---|---|
| File import (CSV, XLSX, JSON) | **Built and tested** | upload (25 MB/file, content-checked) or bundled cohort; 12-step pipeline; run status durable |
| Scheduled export (SFTP / object storage) | Not configured | needs an institution-approved drop location |
| OneRoster 1.2 | Not configured | only if the institution's SIS implements it |
| Moodle web services | Not configured | read-only token from the institution |
| Canvas REST API | Not configured | institution-approved developer key |
| CUIMS (Chandigarh University) | Awaiting institution authorisation | no public API; never scrape the portal, never reuse student passwords, never bypass CAPTCHA |

Status shown to admins comes from `services/ml/app/connectors.py` (`GET /connectors`, admin only) and the Data
integration page. A source is never reported "Healthy" or connected until a real authorised sync has succeeded.

## Pipeline contract (file import, connector #1)
1. **Ingest:** header auto-mapping by synonyms plus fuzzy match; Excel title rows skipped.
2. **Standardise:** roll-number formats, names, dates (3 formats), score scales (0-10 vs 0-100); impossible values
   blanked, never guessed. Missing stays missing (never zero).
3. **Resolve identities:** exact roll number; email blocked by programme; name blocked by branch and year with fuzzy
   matching; confidence per link: >= 0.90 auto, 0.75 to 0.90 review queue, below rejected. Ambiguous ties go to review.
4. **Conflicts:** written precedence rules per attribute (attendance register beats ERP), both values kept.
5. **Unified view with lineage** (file, sheet, row) per value.
6. **Publish** through `ascora_ingest` (token-gated, `on conflict do nothing`, idempotent re-runs).

## Interface every future connector implements
```
test_connection()           -> ok | error (no data read)
discover()                  -> resources and fields available, with sample-safe metadata
fetch(cursor)               -> pages of source records + next cursor (resumable, idempotent)
normalize(records)          -> canonical rows (same contract as the file import step 2)
report()                    -> fetched / accepted / rejected / warnings / freshness
```
Rules: credentials stored as tenant-owned secret references, never shown after save; least-privilege read-only scopes;
cursors persisted per institution and source; a failed or partial sync never publishes; schema drift is reported, not
silently mapped; every sync is audited.

## Before building an API connector
1. Written authorisation and scopes from the institution; a sandbox or test tenant.
2. Contract tests with synthetic fixtures: pagination, empty pages, duplicates, missing fields, time zones, rate
   limits, token expiry, schema drift.
3. Institution-scoped storage of cursor and run history (needs the tenancy contract step: institution-aware publish).
