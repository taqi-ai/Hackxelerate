# Ask Ascora: grounded response contract (`ask-grounded/1`)

Backend: `services/ml/app/insights/ask_grounded.py`, index builder `ask_index.py`, route `POST /ask` in `main.py`.
Written 2026-10-24. The response is a superset of the old one (`question`, `engine`, `query` are unchanged), so existing clients keep working.

## Endpoint and auth
- `POST {ML_URL}/ask`, body `{"question": "<3 to 300 chars>"}`.
- `Authorization: Bearer <token>` from the web app's `/api/ml-token` (HMAC, 10 minutes). Admin and mentor roles only.
- Scope comes from the signed token, never the request: admin = the whole institution; mentor = only students whose `mentor_id` equals the token's `mid` claim (added to `/api/ml-token` in this change). A mentor token without `mid` returns no students (fail closed; `scope.available=false`).
- Rate limited per caller (60/min, `ASCORA_RATE_LIMIT_PER_MIN`). Errors: 401 no or invalid token, 403 wrong institution, 422 bad body, 429 too many requests, 500 safe generic message.

## How an answer is produced
1. The question is parsed by deterministic rules into the closed filter schema. **The intent is chosen by rules only.** For the recognised intents the language model is not consulted, so the four official questions are reproducible. For free-form questions the model may propose a filter (validated against the schema); on any provider failure the rules answer (`engine: "rules"`).
2. Students are read from a stored per-student index (`ask_index` in `state.joblib`, built by the pipeline, no contact fields) and scoped by the token.
3. Counts, aggregates, stored probabilities and stored TreeSHAP attributions are computed from the matched records. Nothing is recalculated by a model and nothing is written anywhere.
4. The recommendation follows the existing playbook mapping (driver feature to existing intervention type and owner role). It is a suggestion; nothing is created or dispatched.

## Intents
`at_risk_students` (Q1), `placement_drivers` (Q2), `cgpa_vs_employability` (Q3), `department_intervention` (Q4), `student_lookup` (a roll number in the question), `student_filter` (free-form filter), `unrecognised` (no data returned; the answer lists example questions).

## Response schema
| Field | Type | Notes |
|---|---|---|
| `question`, `engine`, `query` | as before | `engine` is `rules`, `azure-openai` or `gemini` |
| `contract_version` | string | `ask-grounded/1` |
| `intent` | string | see above |
| `answer` | string | built from the numbers below; also explains an empty or unsupported result |
| `applied_filters` | object | non-empty filters actually applied; may include `any_risk_level` (Q4) and `readiness_max` (Q3) |
| `matched_count` | int | all matches; the roster is capped at `limit` (max 50) |
| `cohort_summary` | object | `count`, `mean_success_score`, `mean_cgpa`, `mean_attendance`, `mean_core_attendance`, `mean_placement_readiness`, `high_risk_share`, `academic_risk_levels`, `placement_risk_levels`, `by_branch`, `top_personas[{persona,count}]`, `alert_counts`, `with_stored_explanations` |
| `matched_students[]` | array | `student_id, name, branch, year, section, persona, success_score, cgpa, placement_readiness, academic_risk{probability,level}, placement_risk{probability,level} or null, priority, alerts[], mentor, attendance, att_core, backlogs, top_driver{feature,label,impact,text,actionable} or null, suggested_action or null`. No email, phone or fairness attributes |
| `prediction_evidence` | object or null | meaning, thresholds and mean probability per dimension, model description |
| `driver_evidence` | object or null | `method`, `provenance`, `academic` and `placement` `{cohort_top_drivers[{feature,label,students_affected,mean_impact,total_impact,actionable}]}`, `students[]` (first 10: top 3 stored attributions per dimension), `readiness_gaps[]` (Q3 only: measured gaps against the institution median, not model attributions) |
| `recommended_intervention` | object or null | `target, target_count, dimension, action, intervention_type, driver_feature, reason, owner, priority, priority_reason, segment_playbook, workflow{system,how,status}, expected_impact` |
| `scope` | object | `role, scope, available` |
| `limitations` | string[] | always present; includes synthetic data, snapshot timing, attribution is not causation, missing explanations |

`owner` is one of Faculty Mentor, Training and Placement Cell, Student Counsellor. `priority` is `P0 Critical` (40% or more of the matched students are High risk on the recommended dimension), `P1 High` (15% to 40%) or `P2 Watch`; the rule is returned in `priority_reason`. `expected_impact` is always "Unvalidated": no measured recovery lift exists. A student with no stored explanation gets `top_driver: null` and no invented one.

## Definitions and assumptions
- "Most at risk": academic risk level High (calibrated probability from 0.50), sorted by probability. Week-12 snapshot.
- "Good CGPA": 7.5 or more unless the question gives a number. "Low employability": placement-readiness component of 40 or less (0 to 100 cohort percentile). A student with no readiness value is a data gap and is never counted as low.
- "CSE department": CSE, CSE-AIML and CSE-Data Science.

## Real sample (synthetic cohort, admin token, trimmed to 2 students)
```json
{
 "question": "What intervention should we prioritize for the CSE department?",
 "engine": "rules",
 "query": {
  "...": "the original filter object (filters, sort_by, sort_dir, limit, group_by, explanation), unchanged"
 },
 "intent": "department_intervention",
 "contract_version": "ask-grounded/1",
 "answer": "304 students in the selected department are at Medium or High risk. Recommended priority: arrange peer tutoring in the weakest subjects and review the backlog plan for 304 matched students in CSE, CSE-AIML, CSE-Data Science (Faculty Mentor, P0 Critical). Reason: Current-semester internal marks raises academic risk for 240 of 304 matched students (mean TreeSHAP impact 1.015).",
 "applied_filters": {
  "branch": [
   "CSE",
   "CSE-AIML",
   "CSE-Data Science"
  ],
  "any_risk_level": [
   "Medium",
   "High"
  ]
 },
 "matched_count": 304,
 "cohort_summary": {
  "count": 304,
  "mean_success_score": 32.78,
  "mean_cgpa": 4.91,
  "mean_attendance": 73.53,
  "mean_core_attendance": 73.48,
  "high_risk_share": 0.681,
  "mean_placement_readiness": 33.92,
  "academic_risk_levels": {
   "Low": 46,
   "High": 157,
   "Medium": 101
  },
  "placement_risk_levels": {
   "High": 88,
   "Medium": 32,
   "N/A": 147,
   "Low": 37
  },
  "by_branch": {
   "CSE-AIML": 112,
   "CSE": 114,
   "CSE-Data Science": 78
  },
  "top_personas": [
   {
    "persona": "Disengaged",
    "count": 109
   },
   {
    "persona": "Backlog cluster",
    "count": 95
   },
   {
    "persona": "Silent decliners",
    "count": 47
   },
   {
    "persona": "High academics, low placement readiness",
    "count": 27
   }
  ],
  "alert_counts": {
   "assignments": 102,
   "backlogs": 101,
   "core_attendance": 46,
   "no_mock": 26,
   "lms_silent": 22
  },
  "with_stored_explanations": 304
 },
 "matched_students": [
  {
   "student_id": "CU25DS0064",
   "name": "Jatin Sarma",
   "branch": "CSE-Data Science",
   "year": 2,
   "section": "B",
   "persona": "Disengaged",
   "success_score": 9.3,
   "cgpa": 3.9,
   "placement_readiness": 15,
   "academic_risk": {
    "probability": 1.0,
    "level": "High"
   },
   "placement_risk": null,
   "priority": 1.485,
   "alerts": [
    "lms_silent",
    "core_attendance",
    "attendance_drop",
    "assignments"
   ],
   "mentor": "Prof. Liam Mitter",
   "attendance": 62.17,
   "att_core": 59.72,
   "backlogs": 1.0,
   "top_driver": {
    "feature": "cur_internal_pct",
    "label": "Current-semester internal marks",
    "impact": 1.9101,
    "text": "Current-semester internal marks 34% (cohort median 57%) raises academic risk",
    "actionable": true
   },
   "suggested_action": "Arrange peer tutoring in the weakest subjects and review the backlog plan"
  },
  {
   "student_id": "CU25AIML0107",
   "name": "Balhaar Bath",
   "branch": "CSE-AIML",
   "year": 2,
   "section": "B",
   "persona": "Disengaged",
   "success_score": 10.7,
   "cgpa": 3.8,
   "placement_readiness": 28.1,
   "academic_risk": {
    "probability": 1.0,
    "level": "High"
   },
   "placement_risk": {
    "probability": 0.9675,
    "level": "High"
   },
   "priority": 1.485,
   "alerts": [
    "lms_silent",
    "core_attendance",
    "backlogs",
    "assignments"
   ],
   "mentor": "Dr. Vritti Kibe",
   "attendance": 58.87,
   "att_core": 62.5,
   "backlogs": 2.0,
   "top_driver": {
    "feature": "cur_internal_pct",
    "label": "Current-semester internal marks",
    "impact": 1.9743,
    "text": "Current-semester internal marks 34% (cohort median 57%) raises academic risk",
    "actionable": true
   },
   "suggested_action": "Arrange peer tutoring in the weakest subjects and review the backlog plan"
  }
 ],
 "prediction_evidence": {
  "academic": {
   "meaning": "Calibrated probability of end-semester failure or a new backlog",
   "levels": {
    "medium_from": 0.25,
    "high_from": 0.5
   },
   "mean_probability": 0.51
  },
  "placement": {
   "meaning": "Calibrated probability of not being placed by final year (placement-track students only)",
   "levels": {
    "medium_from": 0.35,
    "high_from": 0.6
   },
   "mean_probability": 0.6
  },
  "model": "LightGBM with isotonic calibration, trained and evaluated on the synthetic cohort"
 },
 "driver_evidence": {
  "method": "TreeSHAP attributions stored with each student's score",
  "provenance": "Computed by the pipeline from the same calibrated models that produce the probabilities; not recomputed or edited here",
  "academic": {
   "dimension": "academic",
   "cohort_top_drivers": [
    {
     "feature": "cur_internal_pct",
     "label": "Current-semester internal marks",
     "students_affected": 240,
     "mean_impact": 1.015,
     "total_impact": 243.637,
     "actionable": true
    },
    {
     "feature": "gatekeeper_pct",
     "label": "Score in gatekeeper courses",
     "students_affected": 197,
     "mean_impact": 0.607,
     "total_impact": 119.596,
     "actionable": false
    },
    {
     "feature": "backlogs",
     "label": "Active backlogs",
     "students_affected": 139,
     "mean_impact": 0.6,
     "total_impact": 83.386,
     "actionable": false
    },
    {
     "feature": "att_trend",
     "label": "Attendance change Aug\u2192Oct",
     "students_affected": 73,
     "mean_impact": 0.624,
     "total_impact": 45.567,
     "actionable": true
    },
    {
     "feature": "cgpa",
     "label": "CGPA",
     "students_affected": 123,
     "mean_impact": 0.359,
     "total_impact": 44.111,
     "actionable": false
    }
   ]
  },
  "placement": {
   "dimension": "placement",
   "cohort_top_drivers": [
    {
     "feature": "cgpa",
     "label": "CGPA",
     "students_affected": 131,
     "mean_impact": 0.779,
     "total_impact": 102.02,
     "actionable": false
    },
    {
     "feature": "tech_avg",
     "label": "Technical skills",
     "students_affected": 73,
     "mean_impact": 0.695,
     "total_impact": 50.73,
     "actionable": true
    },
    {
     "feature": "soft_avg",
     "label": "Soft skills",
     "students_affected": 45,
     "mean_impact": 1.045,
     "total_impact": 47.021,
     "actionable": true
    },
    {
     "feature": "att_overall",
     "label": "Overall attendance",
     "students_affected": 72,
     "mean_impact": 0.421,
     "total_impact": 30.295,
     "actionable": true
    },
    {
     "feature": "aptitude",
     "label": "Aptitude score",
     "students_affected": 62,
     "mean_impact": 0.36,
     "total_impact": 22.335,
     "actionable": true
    }
   ]
  },
  "students": [
   {
    "student_id": "CU25DS0064",
    "academic": [
     {
      "feature": "cur_internal_pct",
      "label": "Current-semester internal marks",
      "value_text": "34%",
      "median_text": "57%",
      "impact": 1.9101,
      "actionable": true,
      "text": "Current-semester internal marks 34% (cohort median 57%) raises academic risk"
     },
     {
      "feature": "att_trend",
      "label": "Attendance change Aug\u2192Oct",
      "value_text": "-26 pts",
      "median_text": "-2 pts",
      "impact": 0.6275,
      "actionable": true,
      "text": "Attendance change Aug\u2192Oct -26 pts (cohort median -2 pts) raises academic risk"
     },
     {
      "feature": "att_core",
      "label": "Core-subject attendance",
      "value_text": "60%",
      "median_text": "78%",
      "impact": 0.6135,
      "actionable": true,
      "text": "Core-subject attendance 60% (cohort median 78%) raises academic risk"
     }
    ],
    "placement": []
   }
  ]
 },
 "recommended_intervention": {
  "target": "304 matched students in CSE, CSE-AIML, CSE-Data Science",
  "target_count": 304,
  "dimension": "academic",
  "action": "Arrange peer tutoring in the weakest subjects and review the backlog plan",
  "intervention_type": "peer_tutoring",
  "driver_feature": "cur_internal_pct",
  "reason": "Current-semester internal marks raises academic risk for 240 of 304 matched students (mean TreeSHAP impact 1.015)",
  "owner": "Faculty Mentor",
  "priority": "P0 Critical",
  "priority_reason": "52% of the matched students are High risk on this dimension (rule: P0 at 40% or more)",
  "segment_playbook": {
   "persona": "Disengaged",
   "note": "Segment playbook text is shown on the Segments page"
  },
  "workflow": {
   "system": "Ascora interventions",
   "how": "Create it from Mission Control or the student profile; the type above is an existing intervention type",
   "status": "recommended only: nothing has been created or dispatched"
  },
  "expected_impact": "Unvalidated: no measured recovery lift is available for this recommendation"
 },
 "scope": {
  "role": "admin",
  "scope": "institution",
  "available": true
 },
 "limitations": [
  "All students are a synthetic demonstration cohort; probabilities are calibrated on synthetic outcomes and are unvalidated for real deployment.",
  "Predictions are a week-12 snapshot of the semester, not a live feed.",
  "Driver evidence is TreeSHAP attribution of the model's behaviour; it describes what the model used, not what caused an outcome.",
  "Recommendations are suggestions for a human decision. Nothing has been created, assigned or sent.",
  "A department means every branch in its family (for example CSE, CSE-AIML and CSE-Data Science); expected impact is unvalidated."
 ]
}
```

## Frontend integration
- Read the new fields when `contract_version === "ask-grounded/1"`; fall back to `query` for older servers (the adapter in `apps/web/src/lib/ask-adapter.ts` already does).
- Show `limitations` and `recommended_intervention.workflow.status` ("recommended only") wherever a recommendation appears.
- Mentors need a web build that sends the `mid` claim (`apps/web/src/app/api/ml-token/route.ts`); until then they get an empty grounded result and the old filter behaviour.
- Turn a recommendation into records with Mission Control or the student profile. This API never creates interventions.

## Known limitations
Synthetic cohort only; no measured intervention lift; the index is rebuilt only when the pipeline runs (`state.joblib`); student names are returned to staff who can already see them; the language model, when used, only proposes filters and sees the question text only.

## Files and tests
Changed: `services/ml/app/insights/{ask.py,ask_index.py,ask_grounded.py}`, `app/main.py`, `app/service.py`, `artifacts/state.joblib` (now includes `ask_index`), `apps/web/src/lib/ml-token.ts`, `apps/web/src/app/api/ml-token/route.ts`. Also fixed: the rule parser read "show **me**" as the ME branch, and a provider exception was not caught.
Tests: `services/ml/tests/test_ask_grounded.py` (43 tests: the four questions, variations, determinism and provider failure, counts and aggregates, missing explanations, playbook fields, empty and malformed input, SQL and prompt injection, mentor scoping and privacy, HTTP contract). Run `cd services/ml && .venv/Scripts/python -m pytest -q` (145 passed on 2026-10-24).
