import { describe, it, expect } from "vitest";
import { computeLocalGroundedAnalysis } from "./ask-grounded-client";
import type { StudentRow } from "./types";

function createMockStudent(overrides: Partial<StudentRow> = {}): StudentRow {
  return {
    id: "CU24AIML0001",
    name: "Test Student",
    email: "test@example.com",
    branch: "CSE-AIML",
    year: 3,
    section: "A",
    success_score: 55,
    academic_risk_level: "High",
    academic_risk_prob: 0.65,
    placement_risk_level: "High",
    placement_risk_prob: 0.72,
    persona: "Silent decliners",
    intent: "corporate",
    priority: 1.2,
    alerts: [{ type: "silent_decliner", severity: "high", message: "Drop in attendance" }],
    metrics: {
      cgpa: 6.8,
      att_overall: 65,
      att_core: 62,
      completion_rate: 50,
      mocks: 0,
      backlogs: 1,
    },
    components: {
      academic: 45,
      attendance: 40,
      engagement: 35,
      placement: 30,
      readiness: 30,
    },
    ...overrides,
  };
}

describe("computeLocalGroundedAnalysis", () => {
  it("handles empty student cohort safely with zero matchedCount and limitations", () => {
    const analysis = computeLocalGroundedAnalysis(0, []);
    expect(analysis.stats.matchedCount).toBe(0);
    expect(analysis.recommendedAction).toBeNull();
    expect(analysis.topDrivers).toHaveLength(0);
    expect(analysis.limitations.length).toBeGreaterThan(0);
  });

  it("calculates verified cohort stats and top drivers for high risk students (Q1)", () => {
    const students = [
      createMockStudent({ id: "S1", academic_risk_prob: 0.7 }),
      createMockStudent({ id: "S2", academic_risk_prob: 0.5 }),
    ];
    const analysis = computeLocalGroundedAnalysis(0, students);
    expect(analysis.stats.matchedCount).toBe(2);
    expect(analysis.stats.meanAcademicRisk).toBe(0.6);
    expect(analysis.recommendedAction?.priority).toBe("P0 Critical");
    expect(analysis.recommendedAction?.assignedOwner).toBe("Faculty Mentor");
  });

  it("recommends Training & Placement action for placement risk queries (Q2 & Q3)", () => {
    const students = [
      createMockStudent({ id: "S1", metrics: { cgpa: 8.2, att_overall: 80, att_core: 80, completion_rate: 90, mocks: 0, backlogs: 0 } }),
    ];
    const analysis = computeLocalGroundedAnalysis(1, students);
    expect(analysis.recommendedAction?.assignedOwner).toBe("Training & Placement Cell");
    expect(analysis.recommendedAction?.priority).toBe("P1 High");
    expect(analysis.recommendedAction?.interventionType).toBe("mock_interview");
  });

  it("recommends Peer Tutoring Pod for CSE department risk queries (Q4)", () => {
    const students = [createMockStudent({ branch: "CSE" })];
    const analysis = computeLocalGroundedAnalysis(3, students);
    expect(analysis.recommendedAction?.assignedOwner).toBe("Faculty Mentor");
    expect(analysis.recommendedAction?.priority).toBe("P0 Critical");
    expect(analysis.recommendedAction?.interventionType).toBe("peer_tutoring");
  });
});
