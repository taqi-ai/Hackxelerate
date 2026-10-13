import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ExternalConnection, Intervention, StudentPlan } from "@/lib/types";

/**
 * Offline mode (ASCORA_OFFLINE=1): the whole product runs from a local JSON snapshot written by
 * `services/ml/scripts/publish_demo.py`, with no Supabase and no internet (venue Wi-Fi insurance).
 * It mirrors row-level security: ASCORA_OFFLINE_ROLE=mentor restricts everything to mentor M01's students.
 */
// never honoured on Vercel: offline mode skips auth, so it is for a local laptop only
export const OFFLINE = process.env.ASCORA_OFFLINE === "1" && !process.env.VERCEL;
export const OFFLINE_ROLE = (process.env.ASCORA_OFFLINE_ROLE === "mentor" ? "mentor" : "admin") as "admin" | "mentor";
export const OFFLINE_MENTOR = "M01";

type Snapshot = Record<string, any[]>;
let snap: Snapshot | null = null;
const byStudent: Record<string, Map<string, any>> = {};

export function snapshot(): Snapshot {
  if (!snap) {
    const file = path.join(process.cwd(), "demo-data", "snapshot.json");
    snap = JSON.parse(readFileSync(file, "utf-8")) as Snapshot;
    for (const t of ["academic", "attendance", "lms_activity", "engagement", "placement", "skills", "student_scores"]) {
      byStudent[t] = new Map((snap[t] ?? []).map((r) => [r.student_id, r]));
    }
  }
  return snap;
}

export function visibleIds(activeStudentId?: string): Set<string> {
  if (activeStudentId) return new Set([activeStudentId]);
  const s = snapshot();
  return new Set(
    s.students.filter((st) => OFFLINE_ROLE === "admin" || st.mentor_id === OFFLINE_MENTOR).map((st) => st.id as string),
  );
}

export function one(table: string, studentId: string) {
  snapshot();
  return byStudent[table]?.get(studentId) ?? null;
}

export function artifact(key: string) {
  return snapshot().analytics_artifacts.find((a) => a.key === key)?.payload;
}

/** interventions created during an offline session live in memory (reset on server restart) */
// anchored on globalThis: server actions and pages can load separate module instances in dev
const g = globalThis as unknown as {
  __ascoraInterventions?: Intervention[];
  __ascoraPlans?: StudentPlan[];
  __ascoraConnections?: Map<string, ExternalConnection>;
};
export const offlineInterventions: Intervention[] = (g.__ascoraInterventions ??= OFFLINE ? samplePlan() : []);
export const offlinePlans: StudentPlan[] = (g.__ascoraPlans ??= OFFLINE ? sampleStudentPlans() : []);
export const offlineConnections: Map<string, ExternalConnection> = (g.__ascoraConnections ??= new Map());

/** sample student plans for offline evaluation */
function sampleStudentPlans(): StudentPlan[] {
  const stamp = new Date().toISOString();
  return [
    {
      id: "plan-sample-1",
      student_id: "CU24AIML0001",
      title: "Maintain safe 80% attendance in Cloud Computing",
      category: "attendance",
      target_value: { subject: "Cloud Computing", targetPct: 80, requiredClasses: 4 },
      current_value: { currentPct: 74.2 },
      due_date: "2026-10-31",
      status: "active",
      notes: "Attend all 4 sessions scheduled this week to rebuild buffer.",
      created_at: stamp,
      updated_at: stamp,
    },
    {
      id: "plan-sample-2",
      student_id: "CU24AIML0001",
      title: "Score at least 18/20 in upcoming Deep Learning MST-2",
      category: "marks",
      target_value: { subject: "Deep Learning", targetMark: 18, maxMark: 20 },
      current_value: { internal: 23, internalMax: 40 },
      due_date: "2026-11-08",
      status: "active",
      notes: "Targeting Grade A (80+ total) in end-semester grading.",
      created_at: stamp,
      updated_at: stamp,
    },
    {
      id: "plan-sample-3",
      student_id: "CU24AIML0001",
      title: "Reach target CGPA of 6.50 this semester",
      category: "cgpa",
      target_value: { targetCGPA: 6.5, requiredSGPA: 7.2 },
      current_value: { currentCGPA: 5.65, completedCredits: 80, currentSemesterCredits: 20 },
      due_date: "2026-12-20",
      status: "active",
      notes: "Need minimum 7.20 SGPA across all 5 semester subjects.",
      created_at: stamp,
      updated_at: stamp,
    },
  ];
}

/** the same small sample plan the live database carries: top-priority students, due over the next few weeks */
function samplePlan(): Intervention[] {
  const s = snapshot();
  const mentorOf = new Map(s.students.map((st) => [st.id as string, st.mentor_id as string]));
  const mentorName = new Map((s.mentors ?? []).map((m) => [m.id as string, m.name as string]));
  const top = [...s.student_scores].sort((a, b) => b.priority - a.priority);
  const picks = [...top.filter((r) => mentorOf.get(r.student_id) !== OFFLINE_MENTOR).slice(0, 8), ...top.filter((r) => mentorOf.get(r.student_id) === OFFLINE_MENTOR).slice(0, 8)];
  const today = new Date();
  return picks.map((r, k) => {
    const due = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (k % 8) * 2 - 1);
    const stamp = new Date().toISOString();
    return {
      id: `sample-${k}`,
      student_id: r.student_id,
      type: k % 4 === 3 ? "peer_tutoring" : "mentor_meeting",
      driver: r.alerts?.[0]?.type ?? "priority",
      owner_name: mentorName.get(mentorOf.get(r.student_id) ?? "") ?? null,
      due_date: `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`,
      status: k % 5 === 4 ? "in_progress" : "open",
      notes: "Sample plan created with the generated cohort",
      baseline: { success_score: r.success_score, academic_risk_prob: r.academic_risk_prob, placement_risk_prob: r.placement_risk_prob },
      created_at: stamp,
      updated_at: stamp,
    };
  });
}
