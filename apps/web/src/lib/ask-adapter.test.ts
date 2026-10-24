import { describe, expect, it } from "vitest";
import {
  adaptAskResponse,
  clientRuleParse,
  computeCohortSummary,
  detectQuestionIntent,
  filterStudents,
  OFFICIAL_JUDGE_PRESETS,
  synthesizeDirectAnswer,
} from "./ask-adapter";
import type { StudentRow } from "./types";

const mockStudent = (id: string, over: Partial<StudentRow> = {}): StudentRow => ({
  id,
  name: `Student ${id}`,
  email: `st_${id}@example.com`,
  branch: "CSE",
  year: 3,
  section: "A",
  mentor_id: "m-1",
  success_score: 52,
  academic_risk_prob: 0.72,
  academic_risk_level: "High",
  placement_risk_prob: 0.68,
  placement_risk_level: "High",
  intent: "placement",
  segment_id: 1,
  persona: "High academics, low placement readiness",
  priority: 85,
  alerts: [{ type: "no_mock", severity: "high", text: "Zero mock interviews completed" }],
  components: {
    academic: 60,
    placement: 35,
    attendance: 62,
    lms: 45,
    skills: 40,
    engagement: 50,
  },
  metrics: {
    cgpa: 7.8,
    backlogs: 0,
    att_overall: 68,
    att_core: 62,
    completion_rate: 65,
    login_freq: 2.5,
    mocks: 0,
    aptitude: 45,
    coding: 40,
    soft_avg: 50,
    tech_avg: 48,
  },
  ...over,
});

describe("ask-adapter: Judge Presets", () => {
  it("includes all 4 official challenge questions and 2 deep-dive questions", () => {
    expect(OFFICIAL_JUDGE_PRESETS).toHaveLength(6);
    const questions = OFFICIAL_JUDGE_PRESETS.map((p) => p.question);

    expect(questions).toContain("Which students are most at risk this semester?");
    expect(questions).toContain("What factors are driving poor placement readiness?");
    expect(questions).toContain("Show me students who have good CGPA but low employability scores.");
    expect(questions).toContain("What intervention should we prioritize for the CSE department?");
    expect(questions).toContain("Silent decliners in 3rd year");
    expect(questions).toContain("High placement risk with no mock interviews");
  });

  it("contains no em-dashes in preset text or copy", () => {
    for (const p of OFFICIAL_JUDGE_PRESETS) {
      expect(p.title).not.toContain("—");
      expect(p.question).not.toContain("—");
      expect(p.hint).not.toContain("—");
      expect(p.query.explanation).not.toContain("—");
    }
  });
});

describe("ask-adapter: Intent Detection", () => {
  it("detects at_risk_students intent", () => {
    expect(detectQuestionIntent("Which students are most at risk this semester?")).toBe("at_risk_students");
    expect(detectQuestionIntent("Show failing or high risk students")).toBe("at_risk_students");
  });

  it("detects placement_drivers intent", () => {
    expect(detectQuestionIntent("What factors are driving poor placement readiness?")).toBe("placement_drivers");
    expect(detectQuestionIntent("Why is employability readiness low?")).toBe("placement_drivers");
  });

  it("detects cgpa_vs_employability intent", () => {
    expect(detectQuestionIntent("Show me students who have good CGPA but low employability scores.")).toBe("cgpa_vs_employability");
    expect(detectQuestionIntent("High CGPA but low placement readiness")).toBe("cgpa_vs_employability");
  });

  it("detects department_intervention intent", () => {
    expect(detectQuestionIntent("What intervention should we prioritize for the CSE department?")).toBe("department_intervention");
    expect(detectQuestionIntent("What action for mechanical branch?")).toBe("department_intervention");
  });
});

describe("ask-adapter: Student Filtering and Aggregation", () => {
  const students: StudentRow[] = [
    mockStudent("CU01", { branch: "CSE", academic_risk_level: "High", success_score: 45 }),
    mockStudent("CU02", { branch: "ECE", academic_risk_level: "Low", success_score: 82 }),
    mockStudent("CU03", {
      branch: "CSE",
      academic_risk_level: "Medium",
      metrics: { ...mockStudent("CU03").metrics, cgpa: 8.5 },
      placement_risk_level: "High",
    }),
  ];

  it("filters students strictly by branch and risk", () => {
    const q1 = OFFICIAL_JUDGE_PRESETS[0].query; // high academic risk
    const filtered = filterStudents(students, q1);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("CU01");
  });

  it("computes cohort summary accurately without NaN", () => {
    const summary = computeCohortSummary(students);
    expect(summary.count).toBe(3);
    expect(summary.academic_risk_levels.High).toBe(1);
    expect(summary.academic_risk_levels.Medium).toBe(1);
    expect(summary.academic_risk_levels.Low).toBe(1);
    expect(typeof summary.mean_cgpa).toBe("number");
    expect(typeof summary.mean_attendance).toBe("number");
    expect(Number.isNaN(summary.mean_cgpa)).toBe(false);
  });

  it("handles empty student cohorts cleanly", () => {
    const summary = computeCohortSummary([]);
    expect(summary.count).toBe(0);
    expect(summary.mean_cgpa).toBeNull();
    expect(summary.mean_attendance).toBeNull();
    expect(summary.mean_success_score).toBeNull();

    const answer = synthesizeDirectAnswer("at_risk_students", summary, null, OFFICIAL_JUDGE_PRESETS[0].query);
    expect(answer).toContain("No students match");
    expect(answer).not.toContain("NaN");
  });
});

describe("ask-adapter: adaptAskResponse Contract Compatibility", () => {
  const students: StudentRow[] = [
    mockStudent("CU01", { id: "CU01", branch: "CSE", academic_risk_level: "High" }),
    mockStudent("CU02", { id: "CU02", branch: "CSE", academic_risk_level: "High" }),
  ];
  const driversMap = {
    CU01: {
      academic: [{ feature: "att_core", label: "Core attendance < 65%", impact: 0.85, actionable: true, text: "Core attendance low" }],
      placement: [{ feature: "mocks", label: "Zero mock interviews", impact: 0.72, actionable: true, text: "No mock interviews" }],
    },
    CU02: {
      academic: [{ feature: "internal_delta", label: "Internal exam drop", impact: 0.65, actionable: true, text: "Internal exam dropped 15%" }],
      placement: [],
    },
  };

  it("adapts legacy response or offline mode into full AskGroundedResponse", () => {
    const adapted = adaptAskResponse(
      null,
      "Which students are most at risk this semester?",
      students,
      driversMap,
      "admin",
    );

    expect(adapted.contract_version).toBe("ask-grounded/1");
    expect(adapted.intent).toBe("at_risk_students");
    expect(adapted.matched_count).toBe(2);
    expect(adapted.matched_students).toHaveLength(2);
    expect(adapted.matched_students[0].top_driver).toBeDefined();
    expect(adapted.recommended_intervention).not.toBeNull();
    expect(adapted.recommended_intervention?.owner).toBeDefined();
    expect(adapted.prediction_evidence).not.toBeNull();
    expect(adapted.limitations.length).toBeGreaterThan(0);
    expect(adapted.answer).not.toContain("—");
  });

  it("preserves backend CONTRACT = ask-grounded/1 if already provided", () => {
    const backendPayload = {
      contract_version: "ask-grounded/1",
      question: "Which students are most at risk this semester?",
      engine: "azure-openai",
      query: OFFICIAL_JUDGE_PRESETS[0].query,
      intent: "at_risk_students",
      answer: "2 students match this query with elevated failure risk.",
      applied_filters: { academic_risk: ["High"] },
      matched_count: 2,
      matched_students: [
        {
          student_id: "CU01",
          name: "Student CU01",
          branch: "CSE",
          year: 3,
          section: "A",
          persona: "High academics, low placement readiness",
          success_score: 52,
          academic_risk: { level: "High", probability: 0.72 },
          placement_risk: { level: "High", probability: 0.68 },
          priority: 85,
          alerts: ["no_mock"],
        },
      ],
      prediction_evidence: {
        academic: { meaning: "Calibrated failure probability", levels: { medium_from: 0.35, high_from: 0.65 }, mean_probability: 0.72 },
        placement: { meaning: "Placement barrier", levels: { medium_from: 0.35, high_from: 0.65 }, mean_probability: 0.68 },
        model: "LightGBM",
      },
      recommended_intervention: {
        target: "CSE Cohort",
        target_count: 2,
        dimension: "academic",
        action: "Schedule peer tutoring",
        intervention_type: "peer_tutoring",
        driver_feature: "att_core",
        reason: "Core attendance below 65%",
        owner: "Faculty Mentor",
        priority: "Tier 1: Urgent (P0)",
      },
      scope: { role: "admin", available: true },
      limitations: ["Synthetic demonstration cohort."],
    };

    const adapted = adaptAskResponse(backendPayload, "Which students are most at risk this semester?", students, driversMap, "admin");
    expect(adapted.engine).toBe("azure-openai");
    expect(adapted.answer).toBe("2 students match this query with elevated failure risk.");
    expect(adapted.matched_students[0].student_id).toBe("CU01");
  });
});

describe("ask-adapter: Offline clientRuleParse", () => {
  it("parses department query", () => {
    const q = clientRuleParse("What intervention should we prioritize for the CSE department?");
    expect(q.filters.branch).toContain("CSE");
  });

  it("parses academic risk and attendance limits", () => {
    const q = clientRuleParse("high risk students with attendance below 65");
    expect(q.filters.academic_risk).toContain("High");
    expect(q.filters.attendance_max).toBe(65);
  });

  it("parses CGPA thresholds", () => {
    const q = clientRuleParse("students with cgpa above 7.5 and high placement risk");
    expect(q.filters.cgpa_min).toBe(7.5);
    expect(q.filters.placement_risk).toContain("High");
  });
});

describe("ask-adapter: Hard Rules and Edge Cases", () => {
  const students: StudentRow[] = [
    mockStudent("CU01", { id: "CU01", branch: "CSE", mentor_id: "m-1" }),
    mockStudent("CU02", { id: "CU02", branch: "ECE", mentor_id: "m-2" }),
  ];
  const driversMap = {
    CU01: { academic: [], placement: [] },
    CU02: { academic: [], placement: [] },
  };

  it("produces zero em-dashes across all 4 official question adaptations", () => {
    for (const preset of OFFICIAL_JUDGE_PRESETS) {
      const adapted = adaptAskResponse(null, preset.question, students, driversMap, "admin");
      expect(adapted.answer).not.toContain("—");
      if (adapted.recommended_intervention) {
        expect(adapted.recommended_intervention.action).not.toContain("—");
        expect(adapted.recommended_intervention.reason).not.toContain("—");
        expect(adapted.recommended_intervention.priority).not.toContain("—");
      }
      for (const lim of adapted.limitations) {
        expect(lim).not.toContain("—");
      }
    }
  });

  it("handles missing drivers gracefully without crashing or fabricating data", () => {
    const adapted = adaptAskResponse(
      null,
      "What intervention should we prioritize for the CSE department?",
      students,
      {}, // empty drivers map
      "mentor",
    );

    expect(adapted.matched_count).toBe(1); // Only CU01 is in CSE
    expect(adapted.matched_students[0].top_driver).toBeNull();
    expect(adapted.recommended_intervention?.owner).toBe("Faculty Academic Mentors");
    expect(adapted.scope.role).toBe("mentor");
  });
});
