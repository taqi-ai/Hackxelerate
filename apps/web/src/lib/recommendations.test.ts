import { describe, it, expect } from "vitest";
import { deriveRecommendation } from "./recommendations";
import type { StudentRow } from "./types";

function mockStudent(overrides: Partial<StudentRow> = {}): StudentRow {
  return {
    id: "CU24CS0001",
    name: "Aarav Sharma",
    email: "aarav@cumail.in",
    branch: "CSE",
    year: 3,
    section: "A",
    mentor_id: "M01",
    success_score: 55,
    academic_risk_prob: 0.3,
    academic_risk_level: "Medium",
    placement_risk_prob: 0.2,
    placement_risk_level: "Low",
    intent: "placement",
    segment_id: 1,
    persona: "All-round strong",
    priority: 0.3,
    alerts: [],
    components: {
      academic: 50,
      placement: 50,
      attendance: 50,
      lms: 50,
      skills: 50,
      engagement: 50,
    },
    metrics: {
      cgpa: 7.0,
      backlogs: 0,
      att_overall: 75,
      att_core: 75,
      completion_rate: 80,
      login_freq: 5,
      mocks: 2,
      aptitude: 60,
      coding: 65,
      soft_avg: 60,
      tech_avg: 65,
    },
    ...overrides,
  };
}

describe("recommendations engine", () => {
  it("triggers Rule 1: Severe disengagement (attendance < 55% AND lms < 35%)", () => {
    const s = mockStudent({
      academic_risk_prob: 0.70,
      metrics: {
        cgpa: 5.5,
        backlogs: 0,
        att_overall: 48,
        att_core: 45,
        completion_rate: 25,
        login_freq: 1,
        mocks: 0,
        aptitude: 30,
        coding: 20,
        soft_avg: 40,
        tech_avg: 30,
      },
    });

    const rec = deriveRecommendation(s);
    expect(rec.suggested_owner).toBe("Student Wellness Counsellor");
    expect(rec.prescribed_action).toContain("Pastoral Academic Wellness Consultation");
    expect(rec.priority).toBe("P0 Critical");
    expect(rec.sla_target).toBe("48-hour SLA");
    expect(rec.evidence_reason).toContain("48%");
  });

  it("triggers Rule 2: Placement readiness deficit (CGPA >= 7.5 and placement risk >= 0.50)", () => {
    const s = mockStudent({
      academic_risk_prob: 0.15,
      placement_risk_prob: 0.65,
      metrics: {
        cgpa: 8.2,
        backlogs: 0,
        att_overall: 85,
        att_core: 85,
        completion_rate: 90,
        login_freq: 6,
        mocks: 0,
        aptitude: 45,
        coding: 35,
        soft_avg: 55,
        tech_avg: 40,
      },
    });

    const rec = deriveRecommendation(s);
    expect(rec.suggested_owner).toBe("Training & Placement Cell");
    expect(rec.prescribed_action).toContain("14-Day Intensive DSA Coding Bootcamp");
    expect(rec.priority).toBe("P1 High");
    expect(rec.sla_target).toBe("7-day SLA");
    expect(rec.evidence_reason).toContain("8.20");
  });

  it("triggers Rule 3: Academic backlog risk (academic risk >= 0.50 or backlogs >= 1)", () => {
    const s = mockStudent({
      academic_risk_prob: 0.58,
      metrics: {
        cgpa: 6.2,
        backlogs: 2,
        att_overall: 72,
        att_core: 70,
        completion_rate: 65,
        login_freq: 4,
        mocks: 1,
        aptitude: 50,
        coding: 50,
        soft_avg: 50,
        tech_avg: 50,
      },
    });

    const rec = deriveRecommendation(s);
    expect(rec.suggested_owner).toBe("Faculty Mentor");
    expect(rec.prescribed_action).toContain("Gatekeeper Course Peer Tutoring Pod");
    expect(rec.priority).toBe("P1 High");
  });

  it("triggers Rule 4: Engagement deterioration (attendance < 70% with prior good standing / alert)", () => {
    const s = mockStudent({
      academic_risk_prob: 0.35,
      alerts: [{ type: "attendance_drop", severity: "high", text: "Attendance dropped by 15 pts" }],
      metrics: {
        cgpa: 7.2,
        backlogs: 0,
        att_overall: 66,
        att_core: 65,
        completion_rate: 70,
        login_freq: 4,
        mocks: 2,
        aptitude: 60,
        coding: 60,
        soft_avg: 60,
        tech_avg: 60,
      },
    });

    const rec = deriveRecommendation(s);
    expect(rec.suggested_owner).toBe("Faculty Mentor");
    expect(rec.prescribed_action).toContain("1-on-1 Mentor Early-Warning Check-in");
    expect(rec.priority).toBe("P2 Watch");
    expect(rec.sla_target).toBe("14-day SLA");
  });

  it("correctly assigns P0 Critical at threshold boundary (academic risk >= 0.65)", () => {
    const s = mockStudent({
      academic_risk_prob: 0.65,
      metrics: {
        cgpa: 5.5,
        backlogs: 1,
        att_overall: 70,
        att_core: 70,
        completion_rate: 60,
        login_freq: 3,
        mocks: 1,
        aptitude: 45,
        coding: 40,
        soft_avg: 50,
        tech_avg: 45,
      },
    });

    const rec = deriveRecommendation(s);
    expect(rec.priority).toBe("P0 Critical");
    expect(rec.sla_target).toBe("48-hour SLA");
  });
});
