# Privacy and compliance readiness (not a compliance claim)

Ascora holds **synthetic data only**. Nothing here certifies legal compliance; code cannot do that. Verified 2026-10-24.

## Sources and what they say
- DPDP Rules 2025 were notified in November 2025 and commence in phases: Rules 1, 2, 17-21 (Data Protection Board) immediately; Rule 4 (consent managers) after 12 months (about 13 Nov 2026); the core duties (Rules 3, 5-16, 22, 23: notice, security safeguards, breach intimation, Data Principal rights, children's data) after 18 months (about 13 May 2027). Dates come from secondary law-firm summaries ([SCC Online](https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/), [JSA](https://www.jsalaw.com/wp-content/uploads/2025/11/JSA-Prism-InfoTech-November-2025-DPDP-Rules.Final_.pdf)). The MeitY page returned HTTP 403 to this session, so the **primary text was not read**. Counsel must confirm.
- CERT-In Directions (2022), OWASP ASVS and WCAG 2.2: referenced as frameworks; not fetched this session; no conformance claimed. Accessibility: an axe WCAG 2.2 AA scan of 17 pages x 2 themes found no violations (`engineering/ACCESSIBILITY.md`); that is automated testing only.

## Requirement status
| Area | Status | Evidence | Gap / remediation | Legal or institutional approval needed |
|---|---|---|---|---|
| Fiduciary / processor roles | Requires legal determination | none | Institution is likely the fiduciary and Ascora a processor; needs a contract | Yes |
| Purpose and legal basis | Requires legal determination | none | Institution defines purpose; under-18 students may need verifiable parental consent | Yes |
| Notice / transparency | Gap | no privacy notice page | Draft per institution | Yes |
| Data minimisation | Partly done | contacts masked and fairness attributes stripped from client payloads (`lib/minimise.ts`, e2e test); sensitive attributes excluded from model inputs (model card) | masking is display-level; raw contacts still stored | No |
| Security safeguards | Partly done | RLS on all 25 public tables, no policy for anon, anon probes return empty (2026-10-24); token-gated RPCs; upload limits; see `SECURITY_CONTROL_MATRIX.md` | admin MFA missing, leaked-password protection off, no pen test, no restore drill | Pen test is external |
| Breach detection / notification | Gap | `INCIDENT_RESPONSE_RUNBOOK.md` is a plan; no alerting | alerts, named owner, notification templates | Yes |
| Retention and erasure | Gap | no deletion or retention job; `ascora_reset` replaces pipeline rows only | see `DATA_RETENTION_AND_DELETION.md` | Yes |
| Access and correction | Gap | no data-subject request workflow | build with the institution | Yes |
| Cross-border transfer | Needs review | DB in Tokyo (Supabase ap-northeast-1), web functions hnd1, ML in Central India, Azure OpenAI in Korea Central (prompts redacted; `ASCORA_LLM=off` stops all sends) | region choice and transfer terms per institution | Yes |
| Profiling / human oversight | Partly done | flags are decision support, interventions need a human, model card states limits | written policy: no punitive use | Yes |
| Audit trail | Partial | `audit_log` (admin-readable) and provisioning audit; reads are not all logged | extend if required | No |

## Blockers before any real student data
Signed agreement with the institution, privacy notice, retention policy, breach owner, admin MFA, restore drill, independent security test, legal review, out-of-time model validation.
