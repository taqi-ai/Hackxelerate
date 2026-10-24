# Incident response runbook (plan; never rehearsed)

Owner: team lead. Escalation: the institution's data-protection contact once real data exists. Today's data is synthetic.

## Detect
No automated alerting exists. Signals: failing health URLs (see `engineering/PRODUCTION_RUNBOOK.md`), ML JSON request logs (`ascora.request`, find by `X-Request-ID`), Vercel runtime logs, Supabase logs and advisors, vendor notices.

## Respond
1. **Contain:** turn `ASCORA_PUBLIC_PREVIEW` off, set `ASCORA_LLM=off`; deactivate affected accounts (`set_account_disabled`); revoke Supabase sessions.
2. **Rotate** (names in the production runbook): `ASCORA_TOKEN_SECRET` (Vercel and Azure together), ingest token, Azure OpenAI key, Supabase keys. Rotation can interrupt service; do it deliberately.
3. **Preserve:** export logs before they roll off; note times, request ids, accounts.
4. **Assess:** which tables and institutions; use `audit_log`.
5. **Notify:** with real data the institution decides on notice to affected people and regulators. DPDP breach duties start about 18 months after Nov 2025 per secondary sources; the CERT-In 2022 directions require reporting within 6 hours. Counsel confirms applicability.
6. **Recover:** roll back per the production runbook; forward-fix database changes.
7. **Review:** record cause and fix in `engineering/SECURITY_REMEDIATION.md`.
