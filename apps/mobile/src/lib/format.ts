import type { PlacementLevel } from "./types";

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
