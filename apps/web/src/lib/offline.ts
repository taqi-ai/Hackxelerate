import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Intervention } from "@/lib/types";

/**
 * Offline demo mode (ASCORA_OFFLINE=1): the whole product runs from a local JSON snapshot written by
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
export const offlineInterventions: Intervention[] = (g.__ascoraInterventions ??= []);
