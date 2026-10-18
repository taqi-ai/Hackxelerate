"use server";

import { createClient } from "@/lib/supabase/server";
import { OFFLINE, snapshot, visibleIds } from "@/lib/offline";
import { matchesStudentQuery } from "@/lib/search-utils";

export type StudentHit = {
  id: string;
  name: string;
  branch: string;
  year: number;
  section: string;
  risk: string | null;
  score?: number | null;
};

/**
 * Enhanced student search with typo-tolerance, roll-number normalization,
 * and scoped permissions for command palette and quick search.
 */
export async function searchStudents(
  raw: string,
  branch?: string,
  year?: number,
  limit = 12,
): Promise<StudentHit[]> {
  const q = raw.replace(/[^\p{L}\p{N} .-]/gu, "").trim().slice(0, 40);
  if (q.length < 2) return [];

  if (OFFLINE) {
    const ids = visibleIds();
    const scoreMap = new Map(snapshot().student_scores.map((s) => [s.student_id, s]));

    return snapshot()
      .students.filter((s) => {
        if (!ids.has(s.id)) return false;
        if (branch && branch !== "all" && s.branch !== branch) return false;
        if (year && s.year !== year) return false;
        return matchesStudentQuery(s.name, s.id, q);
      })
      .slice(0, limit)
      .map((s) => {
        const sc = scoreMap.get(s.id);
        return {
          id: s.id,
          name: s.name,
          branch: s.branch,
          year: s.year,
          section: s.section,
          risk: sc?.academic_risk_level ?? null,
          score: sc?.success_score ?? null,
        };
      });
  }

  const supabase = await createClient();
  let queryBuilder = supabase
    .from("students")
    .select("id, name, branch, year, section, student_scores(academic_risk_level, success_score)")
    .or(`name.ilike.%${q}%,id.ilike.%${q}%`)
    .order("name")
    .limit(limit);

  if (branch && branch !== "all") {
    queryBuilder = queryBuilder.eq("branch", branch);
  }
  if (year) {
    queryBuilder = queryBuilder.eq("year", year);
  }

  const { data } = await queryBuilder;

  return (data ?? []).map((s: any) => {
    const scoreRecord = Array.isArray(s.student_scores) ? s.student_scores[0] : s.student_scores;
    return {
      id: s.id,
      name: s.name,
      branch: s.branch,
      year: s.year,
      section: s.section,
      risk: scoreRecord?.academic_risk_level ?? null,
      score: scoreRecord?.success_score ?? null,
    };
  });
}
