import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { artifact, offlineInterventions, OFFLINE, OFFLINE_MENTOR, OFFLINE_ROLE, one, snapshot, visibleIds } from "@/lib/offline";
import type { Insight, Intervention, Profile, Segment, StudentRow, StudentScore } from "@/lib/types";

type Supa = Awaited<ReturnType<typeof createClient>>;

/** PostgREST caps a response at 1,000 rows: page through with range(). */
async function fetchAll<T>(build: (s: Supa) => any, pageSize = 1000): Promise<T[]> {
  const supabase = await createClient();
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(supabase).range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

export const getProfile = cache(async (): Promise<(Profile & { email: string }) | null> => {
  if (OFFLINE) {
    return OFFLINE_ROLE === "admin"
      ? { id: "offline-admin", full_name: "Dr. Meera Iyer", role: "admin", mentor_id: null, email: "admin@ascora.test" }
      : { id: "offline-mentor", full_name: "Prof. Eiravati Manne", role: "mentor", mentor_id: OFFLINE_MENTOR, email: "mentor@ascora.test" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("id, full_name, role, mentor_id").eq("id", user.id).single();
  if (!data) return null;
  return { ...(data as Profile), email: user.email ?? "" };
});

const ROW_COLS =
  "student_id, success_score, academic_risk_prob, academic_risk_level, placement_risk_prob, placement_risk_level, intent, segment_id, persona, priority, alerts, components, metrics, students!inner(name, email, branch, year, section, mentor_id)";

function toRow(r: any, st: any): StudentRow {
  return {
    id: r.student_id,
    name: st.name,
    email: st.email,
    branch: st.branch,
    year: st.year,
    section: st.section,
    mentor_id: st.mentor_id,
    success_score: Number(r.success_score),
    academic_risk_prob: Number(r.academic_risk_prob),
    academic_risk_level: r.academic_risk_level,
    placement_risk_prob: r.placement_risk_prob === null ? null : Number(r.placement_risk_prob),
    placement_risk_level: r.placement_risk_level,
    intent: r.intent,
    segment_id: r.segment_id,
    persona: r.persona,
    priority: Number(r.priority),
    alerts: r.alerts ?? [],
    components: r.components,
    metrics: r.metrics ?? {},
  };
}

export const getStudentRows = cache(async (): Promise<StudentRow[]> => {
  if (OFFLINE) {
    const s = snapshot();
    const ids = visibleIds();
    const students = new Map(s.students.map((st) => [st.id, st]));
    return s.student_scores.filter((r) => ids.has(r.student_id)).map((r) => toRow(r, students.get(r.student_id)));
  }
  const rows = await fetchAll<any>((s) => s.from("student_scores").select(ROW_COLS).order("student_id"));
  return rows.map((r) => toRow(r, r.students));
});

export const getArtifacts = cache(async (keys: string[]): Promise<Record<string, any>> => {
  if (OFFLINE) return Object.fromEntries(keys.map((k) => [k, artifact(k)]));
  const supabase = await createClient();
  const { data, error } = await supabase.from("analytics_artifacts").select("key, payload").in("key", keys);
  if (error) throw new Error(error.message);
  return Object.fromEntries((data ?? []).map((r) => [r.key, r.payload]));
});

export const getInsights = cache(async (): Promise<Insight[]> => {
  if (OFFLINE) return snapshot().insights.map((i, idx) => ({ id: idx + 1, ...i })) as Insight[];
  const supabase = await createClient();
  const { data, error } = await supabase.from("insights").select("*").order("rank");
  if (error) throw new Error(error.message);
  return (data ?? []) as Insight[];
});

export const getSegments = cache(async (): Promise<Segment[]> => {
  if (OFFLINE) return snapshot().segments as Segment[];
  const supabase = await createClient();
  const { data, error } = await supabase.from("segments").select("*").order("id");
  if (error) throw new Error(error.message);
  return (data ?? []) as Segment[];
});

export const getMentors = cache(async (): Promise<{ id: string; name: string; department: string }[]> => {
  if (OFFLINE) return snapshot().mentors;
  const supabase = await createClient();
  const { data } = await supabase.from("mentors").select("*").order("id");
  return data ?? [];
});

export const getQualityReport = cache(async () => {
  if (OFFLINE) {
    const q = snapshot().data_quality_log[0];
    return q ? { run_id: q.run_id, created_at: new Date().toISOString(), report: q.report } : null;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("data_quality_log")
    .select("run_id, created_at, report")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { run_id: string; created_at: string; report: any } | null;
});

export async function getConflicts(limit = 200) {
  if (OFFLINE) {
    const names = new Map(snapshot().students.map((s) => [s.id, s.name]));
    return snapshot()
      .conflicts.slice(0, limit)
      .map((c, i) => ({ id: i + 1, ...c, students: { name: names.get(c.student_id) } }));
  }
  const supabase = await createClient();
  const { data } = await supabase.from("conflicts").select("*, students(name)").order("attribute").limit(limit);
  return data ?? [];
}

export async function getReviewQueue(limit = 300) {
  if (OFFLINE) {
    const st = new Map(snapshot().students.map((s) => [s.id, s]));
    const all = snapshot()
      .source_links.filter((l) => l.status === "review")
      .sort((a, b) => b.match_confidence - a.match_confidence);
    return {
      rows: all.slice(0, limit).map((l, i) => ({ id: i + 1, ...l, students: st.get(l.student_id) })),
      total: all.length,
    };
  }
  const supabase = await createClient();
  const { data, count } = await supabase
    .from("source_links")
    .select("id, source, raw_ref, raw_key, match_method, match_confidence, student_id, students(name, branch, year)", { count: "exact" })
    .eq("status", "review")
    .order("match_confidence", { ascending: false })
    .limit(limit);
  return { rows: data ?? [], total: count ?? 0 };
}

export async function getInterventions(studentId?: string): Promise<Intervention[]> {
  if (OFFLINE) {
    const ids = visibleIds();
    return offlineInterventions.filter((i) => ids.has(i.student_id) && (!studentId || i.student_id === studentId));
  }
  const supabase = await createClient();
  let q = supabase.from("interventions").select("*").order("created_at", { ascending: false });
  if (studentId) q = q.eq("student_id", studentId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Intervention[];
}

export async function getStudent360(id: string) {
  if (OFFLINE) {
    if (!visibleIds().has(id)) return null;
    const s = snapshot();
    const st = s.students.find((x) => x.id === id);
    const mentor = s.mentors.find((m) => m.id === st.mentor_id);
    return {
      student: { ...st, mentors: mentor ? { name: mentor.name } : null },
      score: one("student_scores", id) as StudentScore | null,
      academic: one("academic", id),
      attendance: one("attendance", id),
      lms: one("lms_activity", id),
      engagement: one("engagement", id),
      placement: one("placement", id),
      skills: one("skills", id),
      feedback: s.feedback.filter((f) => f.student_id === id),
      conflicts: s.conflicts.filter((c) => c.student_id === id),
      links: s.source_links.filter((l) => l.student_id === id),
    };
  }
  const supabase = await createClient();
  const [student, score, academic, attendance, lms, engagement, placement, skills, feedback, conflicts, links] = await Promise.all([
    supabase.from("students").select("*, mentors(name)").eq("id", id).maybeSingle(),
    supabase.from("student_scores").select("*").eq("student_id", id).maybeSingle(),
    supabase.from("academic").select("*").eq("student_id", id).maybeSingle(),
    supabase.from("attendance").select("*").eq("student_id", id).maybeSingle(),
    supabase.from("lms_activity").select("*").eq("student_id", id).maybeSingle(),
    supabase.from("engagement").select("*").eq("student_id", id).maybeSingle(),
    supabase.from("placement").select("*").eq("student_id", id).maybeSingle(),
    supabase.from("skills").select("*").eq("student_id", id).maybeSingle(),
    supabase.from("feedback").select("course, rating, comment, language, theme, sentiment, lineage").eq("student_id", id),
    supabase.from("conflicts").select("*").eq("student_id", id),
    supabase.from("source_links").select("source, raw_ref, raw_key, match_method, match_confidence, status").eq("student_id", id),
  ]);
  if (!student.data) return null;
  // DPDP: record who viewed which profile (RLS lets users write only their own audit rows)
  await supabase.from("audit_log").insert({ action: "view_student_360", student_id: id });
  return {
    student: student.data,
    score: score.data as StudentScore | null,
    academic: academic.data,
    attendance: attendance.data,
    lms: lms.data,
    engagement: engagement.data,
    placement: placement.data,
    skills: skills.data,
    feedback: feedback.data ?? [],
    conflicts: conflicts.data ?? [],
    links: links.data ?? [],
  };
}

export type Student360 = NonNullable<Awaited<ReturnType<typeof getStudent360>>>;
