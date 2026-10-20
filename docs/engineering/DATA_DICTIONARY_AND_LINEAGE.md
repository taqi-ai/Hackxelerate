# Data dictionary and lineage

Schema verified against the live database on 2026-10-20 (migrations 0001-0011). `!` = not null.
Every tenant-owned row carries `institution_id` directly (students, mentors, profiles, feedback, campus-wide tables) or
through its `student_id` (all per-student tables).

What reaches a browser: staff screens get name, roll number, branch, year, section and mentor, with email and phone
masked on the server (`apps/web/src/lib/minimise.ts`); fairness attributes never leave the server. The one deliberate
exception is the admin-only review queue on Data integration, which shows the raw source key (for LMS rows, an email)
because the reviewer must compare it with the candidate student to accept or reject the match.

## Sources to tables
| Source file (campus system) | Table | One row per |
|---|---|---|
| `erp_academics.csv` (ERP) | `academic` | student: CGPA, active backlogs, SGPA by semester, per-subject internal / end-sem / total |
| `attendance_register.xlsx` (register, one sheet per month) | `attendance` | student: overall %, core-subject %, by subject, by month |
| `lms_activity_log.csv` (LMS) | `lms_activity` | student: logins per week, assignment completion %, minutes per week, trend slope, weekly series |
| `clubs_events.csv` | `engagement` | student: hackathons, clubs, workshops, certifications, event list |
| `placement_cell.xlsx` | `placement` | student: aptitude, coding, mock interviews, mock rating, declared intent, visited the cell |
| `skills_assessment.json` | `skills` | student: technical and soft-skill scores and averages |
| `feedback_forms.csv` (multilingual) | `feedback` | form response: course, rating, comment, language, theme, sentiment |
| all of the above | `source_links` | source row: which student it was linked to, how (`match_method`), with what confidence, `status` (auto / review / rejected) |
| cross-source disagreements | `conflicts` | attribute: both values, both sources, the rule applied, the resolved value |

## Core entities
- **students**: `id!` (roll number, canonical `CU<yy><programme><nnnn>`), `name!`, `email`, `phone`, `branch!`, `year!`, `section!`, `mentor_id`, `institution_id!`. Sensitive attributes `gender`, `hosteller`, `first_generation`, `lateral_entry`, `schooling_medium` are used **only** by the fairness audit, never as model features, and are not shown to mentors.
- **student_scores**: `success_score!` (0-100), `components!` (six component percentiles), `academic_risk_prob` / `_level`, `placement_risk_prob` / `_level` (`N/A` when the student is not on the placement track), `intent`, `segment_id`, `persona`, `shap_academic`, `shap_placement`, `alerts`, `trend`, `recourse` ("what helps"), `readiness`, `priority`, `metrics`, `updated_at!`.
- **interventions**: `student_id!`, `type!`, `driver`, `owner_name`, `due_date`, `status!` (state machine, migration 0011), `notes`, `baseline` (score and risk frozen at creation), `followup`, `outcome`, `review_date`, `created_by`, timestamps. Staff-only.
- **data_quality_log**: one row per pipeline run: `run_id!`, `created_at!`, `report!` (per-source rows in, fixes applied, coverage, match quality, conflicts).

## Missing values (never silently zero)
| Situation | Handling |
|---|---|
| A value is absent or impossible in the source | stored as null; impossible values (for example internal marks above the maximum) are blanked, never guessed, and counted in the quality report |
| A student has no rows at all in a source | that Success Score component is a neutral 50 and the UI says "no data" |
| A student never visited the placement cell | placement readiness is a neutral-low 15, labelled as missing, not as failure |
| Student is not on the placement track | placement risk is `N/A`, never a number |
| Missing internal marks for a subject | shown as "Not recorded"; calculators ask the student to enter them |
| Feedback | excluded from the score on purpose (an unhappy student must not score lower) |

## Normalisation applied on ingest
Roll numbers: four input formats to one canonical form. Names: case and whitespace. Dates: three formats to ISO.
Scores: 0-10 scales rescaled to 0-100 (detected per source). Attendance attended > held: capped and counted.
Every fix is counted per source in `data_quality_log.report.fixes`.

## Lineage
Each per-student table has a `lineage` JSON column naming the source file and rows; per-subject marks carry a `ref`
such as `erp_academics.csv row 15728`, and monthly attendance names the sheet and row (for example
`attendance_register.xlsx, sheet 'Oct 2026', row 4`). The student profile's Sources tab shows these, plus every
`source_links` decision with its method and confidence, and every conflict with the rule that resolved it.

## Freshness
`data_quality_log.report.freshness` holds, per source, the latest date found inside the data (`as_of`), how it was
found (`basis`), its age at run time and whether it passed that source's limit (attendance 35 days, LMS 14, feedback 60,
clubs 120, skills 200). Attendance month sheets carry no day-level dates, so only the first day of the latest month
counts. The ERP marks export and the placement tracker have no dates and are reported as such, never given one.

## Known limits
- Roll numbers are issued by each institution, so keys are `(institution_id, roll number)` (0014); two institutions
  can use the same roll number for different students. `students.apaar_id` (optional national 12-digit APAAR ID,
  unique across the platform) is the cross-institution identity.
- Lineage records file and row, not a content hash of the source file; reproducing an old run needs the original files.
