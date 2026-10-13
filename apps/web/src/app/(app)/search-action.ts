"use server";

import { createClient } from "@/lib/supabase/server";
import { OFFLINE, snapshot, visibleIds } from "@/lib/offline";

export type StudentHit = { id: string; name: string; branch: string; year: number; section: string; risk: string | null };

/** Student search for the command palette. Row-level security decides what each user can find. */
export async function searchStudents(raw: string): Promise<StudentHit[]> {
  const q = raw.replace(/[^\p{L}\p{N} .-]/gu, "").trim().slice(0, 40);
  if (q.length < 2) return [];
  if (OFFLINE) {
    const ids = visibleIds();
    const scores = new Map(snapshot().student_scores.map((s) => [s.student_id, s.academic_risk_level]));
    const lq = q.toLowerCase();
    return snapshot()
      .students.filter((s) => ids.has(s.id) && (s.name.toLowerCase().includes(lq) || s.id.toLowerCase().includes(lq)))
      .slice(0, 8)
      .map((s) => ({ id: s.id, name: s.name, branch: s.branch, year: s.year, section: s.section, risk: scores.get(s.id) ?? null }));
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, name, branch, year, section, student_scores(academic_risk_level)")
    .or(`name.ilike.%${q}%,id.ilike.%${q}%`)
    .order("name")
    .limit(8);
  return (data ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    branch: s.branch,
    year: s.year,
    section: s.section,
    risk: (Array.isArray(s.student_scores) ? s.student_scores[0] : s.student_scores)?.academic_risk_level ?? null,
  }));
}
