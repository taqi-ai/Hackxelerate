import { describe, expect, it } from "vitest";
import { buildStudentJourney, filterJourneyEvents } from "./journey-utils";

describe("journey-utils", () => {
  const sampleStudent = {
    student: { id: "CU25ME0004", name: "Amit Gupta", year: 2 },
    academic: {
      cgpa: 5.5,
      backlogs: 0,
      sgpa: { "1": 5.2, "2": 5.8 },
      subjects: [{ sem: 1, subject: "Mathematics-I", total: 56.6 }],
    },
    attendance: {
      overall_pct: 85.6,
      core_pct: 85.51,
      by_month: { Aug: 85.5, Sep: 87.3, Oct: 84.2 },
    },
    lms: {
      login_freq: 4.5,
      completion_rate: 95.2,
      weekly: [
        { week: 1, logins: 3, due: 2, submitted: 2, minutes: 279 },
        { week: 6, logins: 1, due: 2, submitted: 2, minutes: 205 },
        { week: 12, logins: 10, due: 2, submitted: 2, minutes: 215 },
      ],
    },
    engagement: {
      events: [
        { event: "CAD Workshop", type: "workshop", date: "2025-12-25" },
        { event: "Smart India Hackathon", type: "hackathon", date: "2026-05-02" },
      ],
    },
    interventions: [
      {
        id: "inv-1",
        type: "mentor_meeting",
        created_at: "2026-09-10T10:00:00Z",
        due_date: "2026-09-24",
        status: "done",
        owner_name: "Prof. Eiravati Manne",
        notes: "Discussed study plan",
        followup: {
          date: "2026-09-23",
          academic_risk_prob: 0.12,
          notes: "Observed attendance turnaround",
        },
        outcome: "improved",
      },
    ],
  };

  it("extracts and formats events from verified campus sources", () => {
    const events = buildStudentJourney(sampleStudent);

    expect(events.length).toBeGreaterThan(0);
    // Verified events should include academic SGPA, attendance, LMS milestones, engagement, and interventions
    const categories = new Set(events.map((e) => e.category));
    expect(categories.has("academic")).toBe(true);
    expect(categories.has("attendance_lms")).toBe(true);
    expect(categories.has("milestone_skill")).toBe(true);
    expect(categories.has("support_intervention")).toBe(true);
  });

  it("orders events chronologically from newest to oldest", () => {
    const events = buildStudentJourney(sampleStudent);

    for (let i = 0; i < events.length - 1; i++) {
      expect(events[i].date >= events[i + 1].date).toBe(true);
    }
  });

  it("filters events accurately by category", () => {
    const events = buildStudentJourney(sampleStudent);

    const academicOnly = filterJourneyEvents(events, "academic");
    expect(academicOnly.every((e) => e.category === "academic")).toBe(true);
    expect(academicOnly.length).toBe(2); // Sem 1 and Sem 2

    const supportOnly = filterJourneyEvents(events, "support_intervention");
    expect(supportOnly.every((e) => e.category === "support_intervention")).toBe(true);
    expect(supportOnly.length).toBe(2); // Create + Followup review

    const allEvents = filterJourneyEvents(events, "all");
    expect(allEvents.length).toBe(events.length);
  });

  it("handles missing historical data gracefully without fabricating records", () => {
    const minimalStudent = {
      student: { id: "CU24CSE9999", name: "New Enrollee", year: 1 },
      academic: null,
      attendance: null,
      lms: null,
      engagement: null,
      interventions: [],
    };

    const events = buildStudentJourney(minimalStudent);
    expect(events).toEqual([]);
  });
});
