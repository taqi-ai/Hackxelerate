import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CAPACITY, type MissionStudent } from "@/lib/mission-control";

const createIntervention = vi.fn();
const loadMission = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/(app)/actions", () => ({ createIntervention: (...a: unknown[]) => createIntervention(...a) }));
vi.mock("./load", () => ({ loadMission: () => loadMission(), PLAN_DATES: () => ({ due: "2026-10-27", followup: "2026-11-03" }) }));

import { approveMissionPlan } from "./actions";

function stu(id: string, over: Partial<MissionStudent> = {}): MissionStudent {
  return {
    id, name: `S ${id}`, branch: "CSE", year: 3, mentor_id: "M1", mentor_name: "Prof One", intent: "placement",
    academic_prob: 0.8, academic_level: "High", placement_prob: null, placement_level: "N/A", priority: 10,
    drivers: { academic: [{ feature: "att_overall", text: "Attendance low", impact: 1, actionable: true }], placement: [] },
    hasActive: false, identityReview: false, ...over,
  };
}
const A = "CU24CSE0001", B = "CU24CSE0002", OUTSIDE = "CU24CSE0999";

beforeEach(() => {
  createIntervention.mockReset();
  loadMission.mockReset();
  createIntervention.mockResolvedValue({ ok: true });
  loadMission.mockResolvedValue({ role: "mentor", mentors: 1, students: [stu(A), stu(B, { academic_prob: 0.7 })] });
});

describe("approveMissionPlan", () => {
  it("persists exactly the approved, authorised students with owner, due date and baseline-bearing action", async () => {
    const r = await approveMissionPlan({ capacity: DEFAULT_CAPACITY, student_ids: [A] });
    expect(r).toEqual({ ok: true, created: 1, existing: 0 });
    expect(createIntervention).toHaveBeenCalledTimes(1);
    expect(createIntervention.mock.calls[0][0]).toMatchObject({ student_id: A, type: "mentor_meeting", owner_name: "Prof One", due_date: "2026-10-27" });
  });

  it("refuses a student outside the caller's data (forged id) and never calls the database", async () => {
    const r = await approveMissionPlan({ capacity: DEFAULT_CAPACITY, student_ids: [OUTSIDE] });
    expect(r.ok).toBe(false);
    expect(createIntervention).not.toHaveBeenCalled();
    if (!r.ok) expect(r.failed[0].student_id).toBe(OUTSIDE);
  });

  it("refuses callers who are not staff", async () => {
    loadMission.mockResolvedValue(null);
    const r = await approveMissionPlan({ capacity: DEFAULT_CAPACITY, student_ids: [A] });
    expect(r.ok).toBe(false);
    expect(createIntervention).not.toHaveBeenCalled();
  });

  it("rejects invalid capacity and empty or malformed selections", async () => {
    expect((await approveMissionPlan({ capacity: { ...DEFAULT_CAPACITY, peerSlots: -2 }, student_ids: [A] })).ok).toBe(false);
    expect((await approveMissionPlan({ capacity: DEFAULT_CAPACITY, student_ids: [] })).ok).toBe(false);
    expect((await approveMissionPlan({ capacity: DEFAULT_CAPACITY, student_ids: ["x'; drop table"] })).ok).toBe(false);
    expect(createIntervention).not.toHaveBeenCalled();
  });

  it("does not allow more than the capacity: the server recomputes the plan", async () => {
    // one mentor, 30 minutes: only one meeting fits, so the second student is not part of the plan
    const r = await approveMissionPlan({ capacity: { ...DEFAULT_CAPACITY, mentorHoursPerMentor: 0.5, peerSlots: 0 }, student_ids: [A, B] });
    expect(createIntervention).toHaveBeenCalledTimes(1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.created).toBe(1);
  });

  it("a retry does not duplicate: the database refusal and an already-open intervention both count as existing", async () => {
    createIntervention.mockResolvedValue({ ok: false, error: "This student already has an open intervention of this type. Update that one instead." });
    expect(await approveMissionPlan({ capacity: DEFAULT_CAPACITY, student_ids: [A] })).toEqual({ ok: true, created: 0, existing: 1 });
    createIntervention.mockClear();
    loadMission.mockResolvedValue({ role: "mentor", mentors: 1, students: [stu(A, { hasActive: true })] });
    expect(await approveMissionPlan({ capacity: DEFAULT_CAPACITY, student_ids: [A] })).toEqual({ ok: true, created: 0, existing: 1 });
    expect(createIntervention).not.toHaveBeenCalled();
  });

  it("a persistence failure is reported as a failure, never as success", async () => {
    createIntervention.mockResolvedValue({ ok: false, error: "You can only create interventions for your students." });
    const r = await approveMissionPlan({ capacity: DEFAULT_CAPACITY, student_ids: [A, B] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.created).toBe(0);
      expect(r.failed).toHaveLength(2);
    }
  });

  it("holds back students whose identity match awaits review", async () => {
    loadMission.mockResolvedValue({ role: "mentor", mentors: 1, students: [stu(A, { identityReview: true })] });
    const r = await approveMissionPlan({ capacity: DEFAULT_CAPACITY, student_ids: [A] });
    expect(r.ok).toBe(false);
    expect(createIntervention).not.toHaveBeenCalled();
  });
});
