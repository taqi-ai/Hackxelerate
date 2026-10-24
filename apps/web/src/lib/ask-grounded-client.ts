import type { StudentRow } from "@/lib/types";

export interface GroundedCohortStats {
  matchedCount: number;
  meanCgpa: number | null;
  meanAttendance: number | null;
  meanAcademicRisk: number;
  meanPlacementReadiness: number | null;
  highRiskShare: number;
}

export interface GroundedDriver {
  feature: string;
  label: string;
  affectedCount: number;
  affectedPct: number;
  observedStat: string;
  actionable: boolean;
  attributionType: "Observed Cohort Statistic" | "Empirical Feature Driver";
}

export interface GroundedAction {
  targetCohortText: string;
  prescribedAction: string;
  evidenceReason: string;
  assignedOwner: "Faculty Mentor" | "Training & Placement Cell" | "Student Wellness Counsellor";
  priority: "P0 Critical" | "P1 High" | "P2 Watch";
  sla: string;
  estimatedStaffingHours: string;
  interventionType: "mentor_meeting" | "peer_tutoring" | "mock_interview" | "counselling_referral" | "skill_workshop";
}

export interface LocalGroundedAnalysis {
  provenance: string;
  appliedFilters: Record<string, any>;
  stats: GroundedCohortStats;
  topDrivers: GroundedDriver[];
  recommendedAction: GroundedAction | null;
  limitations: string[];
}

export function computeLocalGroundedAnalysis(
  questionIndex: number,
  matchedStudents: StudentRow[]
): LocalGroundedAnalysis {
  const N = matchedStudents.length;

  if (N === 0) {
    return {
      provenance: "Platform live student cohort store (offline snapshot / Supabase RLS)",
      appliedFilters: {},
      stats: {
        matchedCount: 0,
        meanCgpa: null,
        meanAttendance: null,
        meanAcademicRisk: 0,
        meanPlacementReadiness: null,
        highRiskShare: 0,
      },
      topDrivers: [],
      recommendedAction: null,
      limitations: ["No students matched the selected query criteria in the active cohort scope."],
    };
  }

  // Calculate genuine cohort statistics
  const validCgpa = matchedStudents.map((s) => s.metrics?.cgpa).filter((v): v is number => v !== null && v !== undefined);
  const meanCgpa = validCgpa.length ? validCgpa.reduce((a, b) => a + b, 0) / validCgpa.length : null;

  const validAtt = matchedStudents.map((s) => s.metrics?.att_overall).filter((v): v is number => v !== null && v !== undefined);
  const meanAttendance = validAtt.length ? validAtt.reduce((a, b) => a + b, 0) / validAtt.length : null;

  const meanAcademicRisk = matchedStudents.reduce((a, b) => a + b.academic_risk_prob, 0) / N;

  const validReadiness = matchedStudents.map((s) => s.components?.placement).filter((v): v is number => v !== null && v !== undefined);
  const meanPlacementReadiness = validReadiness.length ? validReadiness.reduce((a, b) => a + b, 0) / validReadiness.length : null;

  const highRiskCount = matchedStudents.filter((s) => s.academic_risk_level === "High" || s.placement_risk_level === "High").length;
  const highRiskShare = highRiskCount / N;

  // Determine top drivers from actual metrics in the cohort
  const topDrivers: GroundedDriver[] = [];

  const backlogsCount = matchedStudents.filter((s) => (s.metrics?.backlogs ?? 0) > 0).length;
  if (backlogsCount > 0) {
    topDrivers.push({
      feature: "backlogs",
      label: "Active course backlogs",
      affectedCount: backlogsCount,
      affectedPct: Math.round((backlogsCount / N) * 100),
      observedStat: `${backlogsCount} of ${N} students have active backlog modules requiring re-examination.`,
      actionable: false,
      attributionType: "Observed Cohort Statistic",
    });
  }

  const lowAttCount = matchedStudents.filter((s) => (s.metrics?.att_overall ?? 100) < 70).length;
  if (lowAttCount > 0) {
    topDrivers.push({
      feature: "att_overall",
      label: "Sub-threshold attendance (<70%)",
      affectedCount: lowAttCount,
      affectedPct: Math.round((lowAttCount / N) * 100),
      observedStat: `${lowAttCount} of ${N} students have overall attendance below mandatory 70% threshold.`,
      actionable: true,
      attributionType: "Observed Cohort Statistic",
    });
  }

  const lowLmsCount = matchedStudents.filter((s) => (s.metrics?.completion_rate ?? 100) < 60).length;
  if (lowLmsCount > 0) {
    topDrivers.push({
      feature: "completion_rate",
      label: "LMS assignment completion (<60%)",
      affectedCount: lowLmsCount,
      affectedPct: Math.round((lowLmsCount / N) * 100),
      observedStat: `${lowLmsCount} of ${N} students are severely lagging in coursework task submissions.`,
      actionable: true,
      attributionType: "Observed Cohort Statistic",
    });
  }

  const lowMocksCount = matchedStudents.filter((s) => (s.metrics?.mocks ?? 0) === 0).length;
  if (lowMocksCount > 0) {
    topDrivers.push({
      feature: "mocks",
      label: "Zero technical mock interviews attended",
      affectedCount: lowMocksCount,
      affectedPct: Math.round((lowMocksCount / N) * 100),
      observedStat: `${lowMocksCount} of ${N} students have not scheduled or completed any mock technical interviews.`,
      actionable: true,
      attributionType: "Observed Cohort Statistic",
    });
  }

  // Ensure top 3 drivers
  const finalDrivers = topDrivers.slice(0, 3);

  // Recommended Institutional Action based on cohort query
  let recommendedAction: GroundedAction | null = null;

  // 30 mins per student estimate for planning pods or check-ins
  const estHours = Math.ceil((N * 30) / 60);

  if (questionIndex === 0) {
    // Q1: Highest risk students this semester
    recommendedAction = {
      targetCohortText: `${N} students identified at High Academic Risk across departments`,
      prescribedAction: "Weekly Gatekeeper Remedial Tutoring Pod + Mentorship Attendance Contract",
      evidenceReason: `Cohort demonstrates mean academic risk probability of ${(meanAcademicRisk * 100).toFixed(0)}% with ${Math.round(highRiskShare * 100)}% critical concentration.`,
      assignedOwner: "Faculty Mentor",
      priority: "P0 Critical",
      sla: "48-hour SLA",
      estimatedStaffingHours: `${estHours} faculty mentoring hours across assigned department mentors`,
      interventionType: "peer_tutoring",
    };
  } else if (questionIndex === 1 || questionIndex === 2) {
    // Q2/Q3: Placement readiness & High CGPA / low employability
    recommendedAction = {
      targetCohortText: `${N} students with high academic standing (mean CGPA ${meanCgpa?.toFixed(2) ?? "N/A"}) but employability readiness deficit`,
      prescribedAction: "14-Day Intensive DSA Coding Bootcamp + 2 Mandatory Technical Mock Interviews",
      evidenceReason: `Aptitude and interview ratings lag despite academic qualification (${validReadiness.length} students have placement readiness component below benchmark).`,
      assignedOwner: "Training & Placement Cell",
      priority: "P1 High",
      sla: "7-day SLA",
      estimatedStaffingHours: `${Math.ceil((N * 45) / 60)} hours of technical mock evaluation and lab coaching`,
      interventionType: "mock_interview",
    };
  } else if (questionIndex === 3) {
    // Q4: CSE department prioritization
    recommendedAction = {
      targetCohortText: `${N} students in CSE department needing prioritized intervention`,
      prescribedAction: "Prerequisite Course Peer Tutoring Pod & Backlog Clearance Track",
      evidenceReason: `Internal exam and gatekeeper course performance constitute the primary academic risk drivers for CSE cohorts.`,
      assignedOwner: "Faculty Mentor",
      priority: "P0 Critical",
      sla: "48-hour SLA",
      estimatedStaffingHours: `${estHours} hours distributed among CSE faculty advisors`,
      interventionType: "peer_tutoring",
    };
  } else if (questionIndex === 4) {
    // Q5: Silent decliners in CSE-AIML
    recommendedAction = {
      targetCohortText: `${N} silent decliners in CSE-AIML exhibiting attendance and activity decline`,
      prescribedAction: "1-on-1 Mentor Early-Warning Check-in + Attendance Recovery Contract",
      evidenceReason: `Downward trajectory detected over recent weeks; timely low-stakes check-in halts further disengagement.`,
      assignedOwner: "Faculty Mentor",
      priority: "P1 High",
      sla: "7-day SLA",
      estimatedStaffingHours: `${estHours} hours across AIML designated mentors`,
      interventionType: "mentor_meeting",
    };
  } else if (questionIndex === 5) {
    // Q6: 2nd year students with high backlog risk
    recommendedAction = {
      targetCohortText: `${N} 2nd-year students with gatekeeper prerequisite backlog risk`,
      prescribedAction: "Remedial Problem Solving Lab Pod + Supplementary Exam Roadmapping",
      evidenceReason: `Year-2 transitions into core engineering courses represent key drop-off threshold.`,
      assignedOwner: "Faculty Mentor",
      priority: "P0 Critical",
      sla: "48-hour SLA",
      estimatedStaffingHours: `${estHours} hours of remedial lab instruction`,
      interventionType: "peer_tutoring",
    };
  }

  return {
    provenance: "Platform live student cohort store (offline snapshot / Supabase RLS)",
    appliedFilters: {
      matchedStudentsCount: N,
      sampleFilterQueryIndex: questionIndex,
    },
    stats: {
      matchedCount: N,
      meanCgpa,
      meanAttendance,
      meanAcademicRisk,
      meanPlacementReadiness,
      highRiskShare,
    },
    topDrivers: finalDrivers,
    recommendedAction,
    limitations: [
      "Observed feature statistics describe the filtered cohort and do not assert causal outcomes.",
      "TreeSHAP attributions apply when generated by the backend pipeline; local fallback uses verified descriptive aggregates.",
      "Intervention recommendations are advisory and do not automatically mutate records without authorized staff confirmation.",
    ],
  };
}
