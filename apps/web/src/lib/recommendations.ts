import type { StudentRow } from "@/lib/types";

export type PriorityTier = "P0 Critical" | "P1 High" | "P2 Watch";
export type SuggestedOwner =
  | "Student Wellness Counsellor"
  | "Training & Placement Cell"
  | "Faculty Mentor";

export interface PrescribedRecommendation {
  student_id: string;
  student_name: string;
  roll_number: string;
  department: string;
  year: number;
  segment_persona: string;
  prescribed_action: string;
  evidence_reason: string;
  suggested_owner: SuggestedOwner;
  priority: PriorityTier;
  sla_target: string;
  primary_driver: string | null;
  observed_metrics: {
    cgpa: number | null;
    attendance_pct: number | null;
    core_attendance_pct: number | null;
    lms_completion_pct: number | null;
    academic_risk_prob: number;
    placement_risk_prob: number | null;
  };
}

/**
 * Deterministic recommendation engine following strictly typed rules.
 *
 * Rules precedence:
 * 1. Severe disengagement:
 *    Attendance < 55% AND LMS engagement < 35%.
 *    Action: Pastoral Academic Wellness Consultation + Workload Adjustment.
 *    Owner: Student Wellness Counsellor.
 *
 * 2. Placement readiness deficit:
 *    CGPA >= 7.5 and placement risk >= 0.50, or a documented coding deficit.
 *    Action: 14-Day Intensive DSA Coding Bootcamp + 2 Mock Technical Interviews.
 *    Owner: Training & Placement Cell.
 *
 * 3. Academic backlog risk:
 *    Academic risk >= 0.50 or at least one active backlog.
 *    Action: Gatekeeper Course Peer Tutoring Pod + Weekly Remedial Lab.
 *    Owner: Faculty Mentor.
 *
 * 4. Engagement deterioration:
 *    Falling LMS engagement or attendance < 70%, combined with evidence of previously stronger academic performance (e.g. alerts or trend).
 *    Action: 1-on-1 Mentor Early-Warning Check-in + Attendance Recovery Contract.
 *    Owner: Faculty Mentor.
 *
 * 5. Otherwise:
 *    Derive an appropriate action from existing intervention type (mentor meeting, peer tutoring, mock interview, coding bootcamp, counselling).
 */
export function deriveRecommendation(student: StudentRow): PrescribedRecommendation {
  const m = student.metrics ?? {};
  const att = m.att_overall ?? null;
  const lmsComp = m.completion_rate ?? null;
  const cgpa = m.cgpa ?? null;
  const backlogs = m.backlogs ?? 0;
  const coding = m.coding ?? null;
  const acadProb = student.academic_risk_prob;
  const placeProb = student.placement_risk_prob;

  // Priority derivation:
  // - P0 Critical: academic risk >= 0.65, engagement-drop score >= 0.75, or top decile priority rule (priority >= 0.75)
  // - P1 High: academic risk between 0.40 and 0.64, or placement risk >= 0.60.
  // - P2 Watch: medium risk between 0.25 and 0.39.
  let priority: PriorityTier = "P2 Watch";
  let sla_target = "14-day SLA";

  const hasHighDropAlert = student.alerts.some(
    (a) => a.type === "silent_decliner" || a.type === "attendance_drop" || a.type === "lms_silent"
  );

  if (acadProb >= 0.65 || (hasHighDropAlert && acadProb >= 0.5) || student.priority >= 0.75) {
    priority = "P0 Critical";
    sla_target = "48-hour SLA";
  } else if ((acadProb >= 0.40 && acadProb < 0.65) || (placeProb !== null && placeProb >= 0.60)) {
    priority = "P1 High";
    sla_target = "7-day SLA";
  } else if (acadProb >= 0.25 || (placeProb !== null && placeProb >= 0.25)) {
    priority = "P2 Watch";
    sla_target = "14-day SLA";
  }

  // Check precedence rules
  let prescribed_action = "";
  let evidence_reason = "";
  let suggested_owner: SuggestedOwner = "Faculty Mentor";
  let primary_driver: string | null = null;

  // Rule 1: Severe disengagement
  if (att !== null && att < 55 && lmsComp !== null && lmsComp < 35) {
    prescribed_action = "Pastoral Academic Wellness Consultation + Workload Adjustment";
    evidence_reason = `Severe disengagement: Attendance is ${att.toFixed(0)}% (cohort median ~78%) and LMS assignment completion is ${lmsComp.toFixed(0)}%.`;
    suggested_owner = "Student Wellness Counsellor";
    primary_driver = "attendance_and_lms_disengagement";
  }
  // Rule 2: Placement readiness deficit
  else if (
    (cgpa !== null && cgpa >= 7.5 && placeProb !== null && placeProb >= 0.50) ||
    (cgpa !== null && cgpa >= 7.5 && coding !== null && coding < 45) ||
    (placeProb !== null && placeProb >= 0.60 && coding !== null && coding < 40)
  ) {
    prescribed_action = "14-Day Intensive DSA Coding Bootcamp + 2 Mock Technical Interviews";
    if (cgpa !== null && coding !== null) {
      evidence_reason = `Placement readiness deficit: CGPA is strong at ${cgpa.toFixed(2)} while coding benchmark is ${coding.toFixed(0)}/100 with ${( (placeProb ?? 0) * 100).toFixed(0)}% placement risk.`;
    } else {
      evidence_reason = `Placement readiness deficit: Elevated placement risk (${((placeProb ?? 0) * 100).toFixed(0)}%) despite academic qualification.`;
    }
    suggested_owner = "Training & Placement Cell";
    primary_driver = "placement_readiness_deficit";
  }
  // Rule 3: Academic backlog risk
  else if (acadProb >= 0.50 || (backlogs !== null && backlogs >= 1)) {
    prescribed_action = "Gatekeeper Course Peer Tutoring Pod + Weekly Remedial Lab";
    const backlogText = backlogs > 0 ? `${backlogs} active backlog${backlogs > 1 ? "s" : ""}` : "elevated risk in gatekeeper course modules";
    evidence_reason = `Academic backlog risk: Academic risk probability is ${(acadProb * 100).toFixed(0)}% with ${backlogText}.`;
    suggested_owner = "Faculty Mentor";
    primary_driver = "academic_backlog_risk";
  }
  // Rule 4: Engagement deterioration
  else if (
    ((lmsComp !== null && lmsComp < 50) || (att !== null && att < 70)) &&
    (hasHighDropAlert || (cgpa !== null && cgpa >= 6.5))
  ) {
    prescribed_action = "1-on-1 Mentor Early-Warning Check-in + Attendance Recovery Contract";
    evidence_reason = `Engagement deterioration: Observed drop in activity (attendance ${att !== null ? `${att.toFixed(0)}%` : "under threshold"}, LMS ${lmsComp !== null ? `${lmsComp.toFixed(0)}%` : "low"}) after previously stable academic standing.`;
    suggested_owner = "Faculty Mentor";
    primary_driver = "engagement_deterioration";
  }
  // Rule 5: Fallback derived from persona or alerts
  else {
    if (student.persona === "Silent decliners") {
      prescribed_action = "1-on-1 Mentor Early-Warning Check-in + Attendance Recovery Contract";
      evidence_reason = `Silent decliner trajectory: Multi-week downward slope in attendance and digital coursework.`;
      suggested_owner = "Faculty Mentor";
      primary_driver = "silent_decliner_trend";
    } else if (student.persona === "Disengaged") {
      prescribed_action = "Pastoral Academic Wellness Consultation + Workload Adjustment";
      evidence_reason = `Persistent disengagement across class registers and LMS platform submissions.`;
      suggested_owner = "Student Wellness Counsellor";
      primary_driver = "disengaged_persona";
    } else if (student.persona === "High academics, low placement readiness" || student.persona === "Engaged but not placement-ready") {
      prescribed_action = "14-Day Intensive DSA Coding Bootcamp + 2 Mock Technical Interviews";
      evidence_reason = `Employability gap: Needs technical mock interviews and focused DSA practice.`;
      suggested_owner = "Training & Placement Cell";
      primary_driver = "employability_gap";
    } else if (student.persona === "Backlog cluster") {
      prescribed_action = "Gatekeeper Course Peer Tutoring Pod + Weekly Remedial Lab";
      evidence_reason = `Remedial tutoring required to clear prerequisite hurdles and stabilise SGPA.`;
      suggested_owner = "Faculty Mentor";
      primary_driver = "backlog_remediation";
    } else {
      prescribed_action = "Preventive Mentoring Check-in & Advanced Career Pathing";
      evidence_reason = `Routine academic continuity check-in to maintain current performance level.`;
      suggested_owner = "Faculty Mentor";
      primary_driver = "routine_continuity";
    }
  }

  return {
    student_id: student.id,
    student_name: student.name,
    roll_number: student.id,
    department: student.branch,
    year: student.year,
    segment_persona: student.persona || "Unassigned",
    prescribed_action,
    evidence_reason,
    suggested_owner,
    priority,
    sla_target,
    primary_driver,
    observed_metrics: {
      cgpa,
      attendance_pct: att,
      core_attendance_pct: m.att_core ?? null,
      lms_completion_pct: lmsComp,
      academic_risk_prob: acadProb,
      placement_risk_prob: placeProb,
    },
  };
}
