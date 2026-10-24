import { describe, expect, it } from "vitest";
import { buildPlan, DEFAULT_CAPACITY, validateCapacity, type Capacity, type MissionStudent } from "./mission-control";

const DATES = { due: "2026-10-27", followup: "2026-11-03" };

function stu(id: string, over: Partial<MissionStudent> = {}): MissionStudent {
  return {
    id, name: `Student ${id}`, branch: "CSE", year: 3, mentor_id: "M1", mentor_name: "Prof. One", intent: "placement",
    academic_prob: 0.6, academic_level: "High", placement_prob: null, placement_level: "N/A", priority: 50,
    drivers: {
      academic: [{ feature: "att_overall", text: "Attendance low", impact: 0.9, actionable: true }],
      placement: [{ feature: "mocks", text: "No mock interviews", impact: 0.8, actionable: true }],
    },
    hasActive: false, identityReview: false, ...over,
  };
}
const cap = (o: Partial<Capacity> = {}): Capacity => ({ ...DEFAULT_CAPACITY, ...o });
const many = (n: number, f: (i: number) => Partial<MissionStudent> = () => ({})) =>
  Array.from({ length: n }, (_, i) => stu(`CU24CSE${String(i).padStart(4, "0")}`, { academic_prob: 0.9 - i * 0.005, ...f(i) }));

describe("capacity validation", () => {
  it("accepts the defaults", () => expect(validateCapacity(DEFAULT_CAPACITY).ok).toBe(true));
  it.each([
    [{ ...DEFAULT_CAPACITY, peerSlots: -1 }],
    [{ ...DEFAULT_CAPACITY, peerSlots: 2.5 }],
    [{ ...DEFAULT_CAPACITY, mentorHoursPerMentor: 41 }],
    [{ ...DEFAULT_CAPACITY, meetingMinutes: 5 }],
    [{ ...DEFAULT_CAPACITY, mockSlots: Number.NaN }],
    [{ ...DEFAULT_CAPACITY, workshopSlots: "9" }],
    [{ mentorHoursPerMentor: 3 }],
    [null],
  ])("rejects invalid input %#", (bad) => expect(validateCapacity(bad).ok).toBe(false));
});

describe("allocation", () => {
  it("never exceeds mentor minutes or slot capacity", () => {
    const students = many(80, (i) => (i % 3 === 0 ? { drivers: { academic: [{ feature: "backlogs", text: "Backlogs", impact: 1, actionable: true }], placement: [] } } : {}));
    const c = cap({ mentorHoursPerMentor: 1, meetingMinutes: 30, peerSlots: 5 });
    const plan = buildPlan(students, c, DATES);
    const meetings = plan.selected.filter((a) => a.type === "mentor_meeting").length;
    expect(meetings * 30).toBeLessThanOrEqual(60);
    expect(plan.selected.filter((a) => a.type === "peer_tutoring").length).toBeLessThanOrEqual(5);
    for (const u of plan.usage) expect(u.used).toBeLessThanOrEqual(u.capacity);
    for (const m of plan.mentorUsage) expect(m.usedMinutes).toBeLessThanOrEqual(m.capacityMinutes);
  });

  it("zero capacity gives a valid empty plan with every student explained", () => {
    const plan = buildPlan(many(10), cap({ mentorHoursPerMentor: 0, peerSlots: 0, mockSlots: 0, workshopSlots: 0 }), DATES);
    expect(plan.selected).toHaveLength(0);
    expect(plan.skipped).toHaveLength(10);
    expect(plan.skipped.every((s) => s.code === "no_capacity")).toBe(true);
    expect(plan.needCovered).toBe(0);
  });

  it("is deterministic: identical inputs give identical plans, whatever the input order", () => {
    const s = many(40);
    const a = buildPlan(s, cap(), DATES);
    const b = buildPlan([...s].reverse(), cap(), DATES);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("gives each student at most one intervention", () => {
    const s = many(20, () => ({ placement_prob: 0.7, placement_level: "High" }));
    const plan = buildPlan(s, cap(), DATES);
    const ids = plan.selected.map((a) => a.student_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps placement actions to students on a placement pathway", () => {
    const s = [
      stu("CU24CSE0001", { intent: "higher_studies", academic_level: "Low", placement_prob: 0.9, placement_level: "High" }),
      stu("CU24CSE0002", { intent: "placement", academic_level: "Low", placement_prob: 0.9, placement_level: "High" }),
    ];
    const plan = buildPlan(s, cap(), DATES);
    expect(plan.selected.map((a) => a.student_id)).toEqual(["CU24CSE0002"]);
    expect(plan.selected[0].dimension).toBe("placement");
    expect(["mock_interview", "skill_workshop", "mentor_meeting"]).toContain(plan.selected[0].type);
    expect(plan.considered).toBe(1); // the higher-studies student is not at plannable risk
  });

  it("keeps academic and placement pathways distinct and never invents a combined probability", () => {
    const s = [stu("CU24CSE0003", { placement_prob: 0.8, placement_level: "High", academic_prob: 0.5, academic_level: "Medium" })];
    const [a] = buildPlan(s, cap(), DATES).selected;
    expect(a.dimension).toBe("placement");
    expect(a.risk_prob).toBe(0.8);
  });

  it("holds back students with no mentor, an identity review or an open intervention, with reasons", () => {
    const s = [
      stu("CU24CSE0010", { mentor_id: null, mentor_name: null }),
      stu("CU24CSE0011", { identityReview: true }),
      stu("CU24CSE0012", { hasActive: true }),
      stu("CU24CSE0013"),
    ];
    const plan = buildPlan(s, cap(), DATES);
    expect(plan.selected.map((a) => a.student_id)).toEqual(["CU24CSE0013"]);
    expect(plan.skipped.map((k) => k.code).sort()).toEqual(["has_active", "identity_review", "no_mentor"]);
    expect(plan.considered).toBe(4);
  });

  it("owner is always the student's own mentor", () => {
    const s = [stu("CU24CSE0020", { mentor_id: "M2", mentor_name: "Prof. Two" })];
    expect(buildPlan(s, cap(), DATES).selected[0].owner_id).toBe("M2");
  });

  it("serves higher need first when capacity is short", () => {
    const s = [stu("CU24CSE0030", { academic_prob: 0.55, academic_level: "High" }), stu("CU24CSE0031", { academic_prob: 0.95 })];
    const plan = buildPlan(s, cap({ mentorHoursPerMentor: 0.5, meetingMinutes: 30, peerSlots: 0 }), DATES);
    expect(plan.selected.map((a) => a.student_id)).toEqual(["CU24CSE0031"]);
    expect(plan.skipped[0].student_id).toBe("CU24CSE0030");
  });

  it("more capacity never selects fewer students", () => {
    const s = many(60);
    const small = buildPlan(s, cap({ mentorHoursPerMentor: 1 }), DATES).selected.length;
    const large = buildPlan(s, cap({ mentorHoursPerMentor: 4 }), DATES).selected.length;
    expect(large).toBeGreaterThanOrEqual(small);
  });

  it("reports coverage as counts and shares of defined need, with a comparable manual baseline", () => {
    const plan = buildPlan(many(30), cap({ mentorHoursPerMentor: 2 }), DATES);
    expect(plan.needCovered).toBeLessThanOrEqual(plan.needTotal);
    expect(plan.highPriority.covered).toBeLessThanOrEqual(plan.highPriority.total);
    expect(plan.baseline.selected).toBeLessThanOrEqual(plan.selected.length + 0 || plan.baseline.selected);
    expect(plan.baseline.needCovered).toBeLessThanOrEqual(plan.needCovered + 1e-9);
  });

  it("fairness groups below 10 students are marked too small to compare", () => {
    const plan = buildPlan(many(12, (i) => ({ branch: i < 3 ? "ECE" : "CSE" })), cap(), DATES);
    const ece = plan.fairness.find((f) => f.group === "Branch ECE")!;
    expect(ece.comparable).toBe(false);
    expect(ece.note).toMatch(/too small/);
  });

  it("every recommendation carries evidence, feasibility, follow-up and a valid type for its dimension", () => {
    for (const a of buildPlan(many(10), cap(), DATES).selected) {
      expect(a.evidence.length).toBeGreaterThan(0);
      expect(a.why_feasible.length).toBeGreaterThan(0);
      expect(a.followup_date).toBe(DATES.followup);
      expect(["mentor_meeting", "peer_tutoring"]).toContain(a.type); // academic
    }
  });
});
