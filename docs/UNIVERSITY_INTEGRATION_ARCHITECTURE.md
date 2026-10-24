# University integration architecture

Complements `engineering/CONNECTOR_ARCHITECTURE.md` (status catalogue and connector interface). Written 2026-10-24.

## What is genuinely tested
| Capability | Status | Evidence |
|---|---|---|
| Generic file import (CSV, XLSX, JSON), 7 sources | Built, tested on synthetic files | `services/ml/app/pipeline.py`, `tests/test_pipeline.py` |
| Header auto-mapping (synonyms + fuzzy) | Built, tested | `ingest/schema.py`; exact synonyms now claim a field before any fuzzy match (fixed 2026-10-24) |
| Mapping review: confident / uncertain / unmapped tiers, alternatives, missing required fields, admin overrides, preview | Built, API only (`POST /mapping/suggest`, admin), **no web screen yet**, branch `claude/mapping-review` | `ingest/review.py`, `tests/test_mapping_review.py` |
| SSRF guard for institution-supplied URLs | Built, **not used by any connector** | `app/netguard.py`, `tests/test_netguard.py` (fake resolver, no network) |
| Any live API connector (OneRoster, Moodle, Canvas, CUIMS, SIS) | **Not built** | no verified endpoint, credential or authorisation exists for any institution |

No connector has been exercised against a real university system. The Data integration panel reports them as not configured.

## Modes, honestly
1. **File export (works today).** Admin gets an authorised export, maps columns (review step above), the pipeline cleans, resolves identities (ambiguous matches go to a review queue), reports quality, and publishes idempotently.
2. **Scheduled export / API connectors (not built).** Need the institution's written authorisation, a sandbox, read-only scopes. Every future connector must: call `netguard.check_url` on its base URL and each redirect, keep secrets as server-side references, use bounded timeouts and retries, persist a per-institution cursor, never publish on partial failure, and audit each sync.
3. **Standards (OneRoster 1.2, LTI 1.3, SCIM):** only where the institution's system implements them; none is implemented here.
4. **No API (for example CUIMS):** manual export/import. Automation requires an agreement with the university. Never scrape, never ask for student passwords, never bypass CAPTCHA or MFA.

## Canonical model
Seven source schemas in `ingest/schema.py` (`SCHEMAS`, `REQUIRED`) map to the unified student table, then to Supabase tables keyed per institution (migration 0014). Scoring, models and dashboard read only the canonical tables.

## Still needed for a real pilot
Web screen for the mapping review with import approval; an institution onboarding flow (institution row, ingest token, ML deployment); contract tests per connector with synthetic fixtures; written authorisation from the institution.
