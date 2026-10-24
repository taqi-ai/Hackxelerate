import type { PlacementLevel, StudentScore } from "./types";

const nf = new Intl.NumberFormat("en-IN");

export const fmtInt = (n: number | null | undefined) =>
  n === null || n === undefined ? "-" : nf.format(Math.round(n));

export const fmt1 = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? "-" : n.toFixed(1);

export const pct = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined || Number.isNaN(n)
    ? "-"
    : `${(n * 100).toFixed(digits)}%`;

export const INTENT_LABEL: Record<string, string> = {
  placement: "Placement",
  higher_studies: "Higher studies",
  govt_exams: "Government exams",
  entrepreneurship: "Entrepreneurship",
  undecided: "Undecided",
};

export const COMPONENT_LABEL: Record<string, string> = {
  academic: "Academic",
  placement: "Placement readiness",
  attendance: "Attendance",
  lms: "LMS activity",
  skills: "Skills",
  engagement: "Engagement",
};

export const INTERVENTION_LABEL: Record<string, string> = {
  mentor_meeting: "Mentor meeting",
  peer_tutoring: "Peer tutoring",
  mock_interview: "Mock interview",
  counselling_referral: "Counselling referral",
  parent_call: "Parent call",
  skill_workshop: "Skill workshop",
};

/** map the strongest driver to the most useful intervention type */
export function suggestIntervention(feature?: string): string {
  if (!feature) return "mentor_meeting";
  if (["mocks", "mock_rating", "aptitude", "coding"].includes(feature))
    return "mock_interview";
  if (["soft_avg", "communication", "tech_avg"].includes(feature))
    return "skill_workshop";
  if (
    [
      "cur_internal_pct",
      "internal_delta",
      "gatekeeper_pct",
      "backlogs",
      "cgpa",
    ].includes(feature)
  )
    return "peer_tutoring";
  return "mentor_meeting";
}

export function maskEmail(e: string | null | undefined) {
  if (!e) return "-";
  const [user, domain] = e.split("@");
  if (!domain) return e;
  return `${user.slice(0, 2)}${"*".repeat(Math.max(2, user.length - 2))}@${domain}`;
}

export function maskPhone(p: string | null | undefined) {
  if (!p) return "-";
  return `${p.slice(0, 2)}******${p.slice(-2)}`;
}

export function getRiskColor(
  level: PlacementLevel | string,
  colors: { riskHigh: string; riskMedium: string; riskLow: string; mutedText: string }
) {
  switch (level) {
    case "High":
      return colors.riskHigh;
    case "Medium":
      return colors.riskMedium;
    case "Low":
      return colors.riskLow;
    default:
      return colors.mutedText;
  }
}

export function getRiskSoftColor(
  level: PlacementLevel | string,
  colors: {
    riskHighSoft: string;
    riskMediumSoft: string;
    riskLowSoft: string;
    surface: string;
  }
) {
  switch (level) {
    case "High":
      return colors.riskHighSoft;
    case "Medium":
      return colors.riskMediumSoft;
    case "Low":
      return colors.riskLowSoft;
    default:
      return colors.surface;
  }
}

export function scoreToneColor(
  score: number,
  colors: { riskLow: string; text: string; riskHigh: string }
) {
  if (score >= 65) return colors.riskLow;
  if (score >= 40) return colors.text;
  return colors.riskHigh;
}

export interface MobilePrescribedAction {
  owner: "Faculty Mentor" | "Training & Placement Cell" | "Student Wellness Counsellor";
  priority: "P0 Immediate" | "P1 High" | "P2 Watch";
  action: string;
  reason: string;
  forecast: string;
}

export function deriveMobileRecommendation(score: StudentScore, metrics?: any): MobilePrescribedAction {
  const acadProb = Number(score.academic_risk_prob || 0);
  const placeProb = score.placement_risk_prob !== null && score.placement_risk_prob !== undefined ? Number(score.placement_risk_prob) : null;
  const att = metrics?.att_overall ?? null;
  const lmsComp = metrics?.completion_rate ?? null;
  const cgpa = metrics?.cgpa ?? null;
  const coding = metrics?.coding ?? null;

  // Priority
  let priority: "P0 Immediate" | "P1 High" | "P2 Watch" = "P2 Watch";
  if (acadProb >= 0.65 || Number(score.priority || 0) >= 0.75) {
    priority = "P0 Immediate";
  } else if ((acadProb >= 0.40 && acadProb < 0.65) || (placeProb !== null && placeProb >= 0.60)) {
    priority = "P1 High";
  }

  // Precedence Rules
  if (att !== null && att < 55 && lmsComp !== null && lmsComp < 35) {
    return {
      owner: "Student Wellness Counsellor",
      priority,
      action: "Pastoral Academic Wellness Consultation + Workload Adjustment",
      reason: `Attendance (${att.toFixed(0)}%) and LMS coursework (${lmsComp.toFixed(0)}%) indicate severe disengagement.`,
      forecast: "Target: Re-engage attendance past 70% threshold within 3 weeks.",
    };
  }

  if (
    (cgpa !== null && cgpa >= 7.5 && placeProb !== null && placeProb >= 0.50) ||
    (cgpa !== null && cgpa >= 7.5 && coding !== null && coding < 45) ||
    (placeProb !== null && placeProb >= 0.60 && coding !== null && coding < 40)
  ) {
    return {
      owner: "Training & Placement Cell",
      priority,
      action: "14-Day Intensive DSA Coding Bootcamp + 2 Mock Technical Interviews",
      reason: `High CGPA (${cgpa?.toFixed(2) ?? "good"}) with technical employability benchmark gap.`,
      forecast: "Target: Elevate mock interview rating from baseline by +1.5 pts.",
    };
  }

  if (acadProb >= 0.50 || (metrics?.backlogs && metrics.backlogs > 0)) {
    return {
      owner: "Faculty Mentor",
      priority,
      action: "Gatekeeper Course Peer Tutoring Pod + Weekly Remedial Lab",
      reason: `Academic risk probability is ${(acadProb * 100).toFixed(0)}% with prerequisite backlog risk.`,
      forecast: "Target: Stabilize SGPA and clear prerequisite backlog in remedial cycle.",
    };
  }

  if (score.persona === "Silent decliners") {
    return {
      owner: "Faculty Mentor",
      priority,
      action: "1-on-1 Mentor Early-Warning Check-in + Attendance Recovery Contract",
      reason: "Observed downward trend in LMS activity and attendance.",
      forecast: "Target: Halt attendance decline and recover past 75% cohort baseline.",
    };
  }

  return {
    owner: "Faculty Mentor",
    priority,
    action: "Preventive Mentoring Check-in & Academic Continuity Review",
    reason: "Routine support check-in based on current risk profile.",
    forecast: "Target: Maintain current performance and engagement trajectory.",
  };
}
