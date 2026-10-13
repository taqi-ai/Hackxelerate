import type { PlacementLevel } from "@/lib/types";

const nf = new Intl.NumberFormat("en-IN");
export const fmtInt = (n: number | null | undefined) => (n === null || n === undefined ? "-" : nf.format(Math.round(n)));
export const fmt1 = (n: number | null | undefined) => (n === null || n === undefined || Number.isNaN(n) ? "-" : n.toFixed(1));
export const pct = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined || Number.isNaN(n) ? "-" : `${(n * 100).toFixed(digits)}%`;

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

export const SOURCE_LABEL: Record<string, string> = {
  erp_academics: "Academic (ERP)",
  attendance_register: "Attendance register",
  lms_activity_log: "LMS activity",
  clubs_events: "Clubs & events",
  placement_cell: "Placement cell",
  skills_assessment: "Skills assessment",
  feedback_forms: "Feedback forms",
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
  if (["mocks", "mock_rating", "aptitude", "coding"].includes(feature)) return "mock_interview";
  if (["soft_avg", "communication", "tech_avg"].includes(feature)) return "skill_workshop";
  if (["cur_internal_pct", "internal_delta", "gatekeeper_pct", "backlogs", "cgpa"].includes(feature)) return "peer_tutoring";
  return "mentor_meeting";
}

export function maskEmail(e: string | null) {
  if (!e) return "-";
  const [user, domain] = e.split("@");
  return `${user.slice(0, 2)}${"•".repeat(Math.max(2, user.length - 2))}@${domain}`;
}

export function maskPhone(p: string | null) {
  if (!p) return "-";
  return `${p.slice(0, 2)}••••••${p.slice(-2)}`;
}

export function riskTone(level: PlacementLevel | string) {
  switch (level) {
    case "High":
      return "bg-risk-high-soft text-risk-high ring-risk-high/25";
    case "Medium":
      return "bg-risk-medium-soft text-risk-medium ring-risk-medium/25";
    case "Low":
      return "bg-risk-low-soft text-risk-low ring-risk-low/25";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

export function scoreTone(score: number) {
  if (score >= 65) return "text-risk-low";
  if (score >= 40) return "text-foreground";
  return "text-risk-high";
}
