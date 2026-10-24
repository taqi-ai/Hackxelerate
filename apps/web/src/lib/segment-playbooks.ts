export interface PlaybookConfig {
  persona: string;
  primaryRisk: string;
  topDrivers: [string, string];
  prescribedIntervention: string;
  interventionType: "mentor_meeting" | "peer_tutoring" | "mock_interview" | "counselling_referral" | "parent_call" | "skill_workshop";
  institutionalOwner: "Faculty Mentor" | "Training & Placement Cell" | "Student Wellness Counsellor";
  priorityTier: "P0 Critical" | "P1 High" | "P2 Watch";
  sla: string;
  expectedLift: string;
}

export const SEGMENT_PLAYBOOKS: Record<string, PlaybookConfig> = {
  "Silent decliners": {
    persona: "Silent decliners",
    primaryRisk: "Medium Academic Risk (Steep Downward Trend)",
    topDrivers: ["Negative LMS activity slope (-0.08/wk)", "Attendance drop Aug→Oct (-6 pts)"],
    prescribedIntervention: "1-on-1 Mentor Early-Warning Check-in + Attendance Recovery Contract",
    interventionType: "mentor_meeting",
    institutionalOwner: "Faculty Mentor",
    priorityTier: "P1 High",
    sla: "7-day SLA",
    expectedLift: "Historical lift: +12.4 pts risk reduction (control group lift: +4.2 pts)",
  },
  "High academics, low placement readiness": {
    persona: "High academics, low placement readiness",
    primaryRisk: "Elevated Placement Risk (Technical & Interview Deficit)",
    topDrivers: ["Mock interview rating deficit (<2.5/5)", "Low coding benchmark relative to CGPA (>=7.5)"],
    prescribedIntervention: "14-Day Intensive DSA Coding Bootcamp + 2 Mock Technical Interviews",
    interventionType: "mock_interview",
    institutionalOwner: "Training & Placement Cell",
    priorityTier: "P1 High",
    sla: "7-day SLA",
    expectedLift: "Historical lift: +15.8 pts readiness improvement",
  },
  "Backlog cluster": {
    persona: "Backlog cluster",
    primaryRisk: "High Academic Backlog Risk (Prerequisite Gatekeepers)",
    topDrivers: ["Active course backlogs (>=1)", "Sub-threshold internal examination score (<50%)"],
    prescribedIntervention: "Gatekeeper Course Peer Tutoring Pod + Weekly Remedial Lab",
    interventionType: "peer_tutoring",
    institutionalOwner: "Faculty Mentor",
    priorityTier: "P0 Critical",
    sla: "48-hour SLA",
    expectedLift: "Historical lift: +18.2 pts pass rate improvement on remedial modules",
  },
  "Disengaged": {
    persona: "Disengaged",
    primaryRisk: "Critical Disengagement (Pastoral & Attendance Crisis)",
    topDrivers: ["Low overall attendance (<60%)", "Minimal LMS logins and assignment submissions"],
    prescribedIntervention: "Pastoral Academic Wellness Consultation + Workload Adjustment",
    interventionType: "counselling_referral",
    institutionalOwner: "Student Wellness Counsellor",
    priorityTier: "P0 Critical",
    sla: "48-hour SLA",
    expectedLift: "Historical lift: +9.6 pts re-engagement rate following counselling review",
  },
  "Engaged but not placement-ready": {
    persona: "Engaged but not placement-ready",
    primaryRisk: "Moderate Placement Deficit (Campus Active, Industry Skills Gap)",
    topDrivers: ["Aptitude assessment below cohort benchmark", "Lack of verified technical certifications"],
    prescribedIntervention: "Placement Cell Technical Bootcamp & Weekly Coding Contest Series",
    interventionType: "skill_workshop",
    institutionalOwner: "Training & Placement Cell",
    priorityTier: "P1 High",
    sla: "7-day SLA",
    expectedLift: "Historical lift: +11.3 pts mock rating improvement",
  },
  "All-round strong": {
    persona: "All-round strong",
    primaryRisk: "Low Risk Across Dimensions (Retention & Leadership Candidate)",
    topDrivers: ["Consistent top quartile attendance (>88%)", "High assignment completion (>95%)"],
    prescribedIntervention: "Peer Tutoring Leadership Pod & Advanced Honors Elective Nomination",
    interventionType: "mentor_meeting",
    institutionalOwner: "Faculty Mentor",
    priorityTier: "P2 Watch",
    sla: "14-day SLA",
    expectedLift: "High continuity: 98% retention across historical semesters",
  },
};
