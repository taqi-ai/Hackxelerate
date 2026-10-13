import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Intervention } from "@/lib/types";

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

export function visibleIds(): Set<string> {
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
const g = globalThis as unknown as { __ascoraInterventions?: Intervention[] };
export const offlineInterventions: Intervention[] = (g.__ascoraInterventions ??= OFFLINE ? samplePlan() : []);

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
