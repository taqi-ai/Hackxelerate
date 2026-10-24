import "server-only";
import { getDriverMap, getInterventions, getMentors, getProfile, getReviewQueue, getStudentRows } from "@/lib/data";
import { ACTIVE_STATUSES } from "@/lib/intervention-rules";
import { campusDate } from "@/lib/dates";
import type { MissionStudent } from "@/lib/mission-control";

export const PLAN_DATES = () => ({ due: campusDate(3), followup: campusDate(10) });

/** Everything Mission Control plans from, read as the signed-in user (row-level security decides the rows).
 *  Returns null for anyone who is not an admin or mentor. Used by both the page and the approval action, so the
 *  plan that is approved is recomputed from server data, never taken from the browser. */
export async function loadMission(): Promise<{ role: "admin" | "mentor"; students: MissionStudent[]; mentors: number } | null> {
  const profile = await getProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "mentor")) return null;
  const [rows, drivers, interventions, review, mentors] = await Promise.all([
    getStudentRows(),
    getDriverMap(),
    getInterventions(),
    getReviewQueue(5000),
    getMentors(),
  ]);
  const mentorName = new Map(mentors.map((m) => [m.id, m.name]));
  const active = new Set(interventions.filter((i) => ACTIVE_STATUSES.includes(i.status)).map((i) => i.student_id));
  const inReview = new Set((review.rows as { student_id: string | null }[]).map((r) => r.student_id).filter((x): x is string => !!x));
  const students: MissionStudent[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    branch: r.branch,
    year: r.year,
    mentor_id: r.mentor_id,
    mentor_name: r.mentor_id ? (mentorName.get(r.mentor_id) ?? r.mentor_id) : null,
    intent: r.intent,
    academic_prob: r.academic_risk_prob,
    academic_level: r.academic_risk_level,
    placement_prob: r.placement_risk_prob,
    placement_level: r.placement_risk_level,
    priority: r.priority,
    drivers: drivers.get(r.id) ?? { academic: [], placement: [] },
    hasActive: active.has(r.id),
    identityReview: inReview.has(r.id),
  }));
  return { role: profile.role, students, mentors: new Set(students.map((s) => s.mentor_id).filter(Boolean)).size };
}
