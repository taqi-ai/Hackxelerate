import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { PREVIEW_ENABLED, previewConnection, previewStudent, readDemoImport, readDemoPlans, searchPreview } from "@/lib/demo-preview";
import {
  artifact,
  offlineConnections,
  offlineInterventions,
  offlinePlans,
  OFFLINE,
  OFFLINE_MENTOR,
  OFFLINE_ROLE,
  one,
  snapshot,
  visibleIds,
} from "@/lib/offline";
import type {
  ExternalConnection,
  Insight,
  Intervention,
  Profile,
  Segment,
  StudentPlan,
  StudentRow,
  StudentScore,
} from "@/lib/types";

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
  const cookieStore = await cookies();
  const demoStudentId = cookieStore.get("ascora_demo_student")?.value;

  if (demoStudentId && (OFFLINE || PREVIEW_ENABLED)) {
    if (OFFLINE) {
      const st = snapshot().students.find((s) => s.id === demoStudentId);
      if (st) {
        return {
          id: `student-${st.id}`,
          full_name: st.name,
          role: "student",
          mentor_id: st.mentor_id,
          student_id: st.id,
          email: st.email ?? `${st.id.toLowerCase()}@cumail.in`,
        };
      }
    } else {
      // public student preview: read-only synthetic data, no database identity (see lib/demo-preview.ts)
      const pv = await previewStudent(demoStudentId);
      if (pv) {
        return {
          id: `student-${pv.student.id}`,
          full_name: pv.student.name,
          role: "student",
          mentor_id: pv.student.mentor_id,
          student_id: pv.student.id,
          email: pv.student.email ?? "",
        };
      }
    }
  }

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
  const { data } = await supabase.from("profiles").select("id, full_name, role, mentor_id, student_id").eq("id", user.id).single();
  if (!data) return null;
  return { ...(data as Profile), email: user.email ?? "" };
});

/** a visitor previewing a demo student (no database identity) */
export function isPreview(profile: { id: string; role: string } | null | undefined) {
  return !OFFLINE && PREVIEW_ENABLED && profile?.role === "student" && profile.id.startsWith("student-");
}

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
  const profile = await getProfile();
  if (profile?.role === "student" && profile.student_id) {
    if (OFFLINE) {
      const s = snapshot();
      const st = s.students.find((x) => x.id === profile.student_id);
      const sc = s.student_scores.find((x) => x.student_id === profile.student_id);
      return st && sc ? [toRow(sc, st)] : [];
    }
    if (isPreview(profile)) {
      const pv = await previewStudent(profile.student_id);
      return pv?.score ? [toRow(pv.score, pv.student)] : [];
    }
    const supabase = await createClient();
    const { data: sc } = await supabase.from("student_scores").select(ROW_COLS).eq("student_id", profile.student_id).maybeSingle();
    return sc ? [toRow(sc, sc.students)] : [];
  }
  if (OFFLINE) {
    const s = snapshot();
    const ids = visibleIds();
    const students = new Map(s.students.map((st) => [st.id, st]));
    return s.student_scores.filter((r) => ids.has(r.student_id)).map((r) => toRow(r, students.get(r.student_id)));
  }
  // The cohort read is the heaviest query in the app (up to 1,200 rows) and every dashboard tab needs it.
  // Cache it per user for two minutes: the key is the user id and the query runs with that user's own token,
  // so row-level security still decides the rows and one user's result is never served to another.
  const direct = async () =>
    (await fetchAll<any>((s) => s.from("student_scores").select(ROW_COLS).order("student_id"))).map((r) => toRow(r, r.students));
  const supabase = await createClient();
  const [{ data: auth }, { data: sess }] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);
  const token = sess.session?.access_token;
  if (!auth.user || !token) return direct();
  return unstable_cache(
    async () => {
      const db = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const out: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from("student_scores").select(ROW_COLS).order("student_id").range(from, from + 999);
        if (error) throw new Error(error.message);
        out.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return out.map((r) => toRow(r, r.students));
    },
    ["cohort-rows-v1", auth.user.id],
    { revalidate: 120, tags: ["cohort"] },
  )().catch(direct);
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
    // the snapshot's own timestamp, never "now": a fixed snapshot must not look freshly published
    return q ? { run_id: q.run_id, created_at: (q.created_at as string | undefined) ?? null, report: q.report } : null;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("data_quality_log")
    .select("run_id, created_at, report")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { run_id: string; created_at: string | null; report: any } | null;
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
  const profile = await getProfile();
  if (profile?.role === "student" && profile.student_id !== id) {
    return null;
  }
  if (OFFLINE) {
    if (!visibleIds(profile?.student_id ?? undefined).has(id)) return null;
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
  if (isPreview(profile)) {
    const pv = await previewStudent(id);
    return pv ? { ...pv, score: pv.score as StudentScore | null } : null;
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
  // RLS returns nothing for a student this user may not see
  if (!student.data) return null;
  try {
    // DPDP: record who viewed which profile (RLS lets users write only their own audit rows)
    await supabase.from("audit_log").insert({ action: "view_student_360", student_id: id });
  } catch {
    // Ignore audit log insert error in demo / unauthenticated mode
  }
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

/** weekly LMS logins per visible student (weeks 1 to 12), for the engagement heatmap */
export const getWeeklyLogins = cache(async (): Promise<Map<string, number[]>> => {
  const toSeries = (weekly: { week: number; logins: number }[] | null) => {
    const out = Array<number>(12).fill(0);
    (weekly ?? []).forEach((w) => {
      if (w.week >= 1 && w.week <= 12) out[w.week - 1] = Number(w.logins) || 0;
    });
    return out;
  };
  if (OFFLINE) {
    const ids = visibleIds();
    return new Map(snapshot().lms_activity.filter((r) => ids.has(r.student_id)).map((r) => [r.student_id as string, toSeries(r.weekly)]));
  }
  const rows = await fetchAll<{ student_id: string; weekly: { week: number; logins: number }[] | null }>((s) =>
    s.from("lms_activity").select("student_id, weekly").order("student_id"),
  );
  return new Map(rows.map((r) => [r.student_id, toSeries(r.weekly)]));
});

/** Search demo students across the 1,200 cohort with safe pagination and filters */
export async function searchDemoStudents(query = "", branch?: string, year?: number, limit = 20) {
  const q = query.trim().toLowerCase();
  if (OFFLINE) {
    let list = snapshot().students;
    if (q) {
      list = list.filter((s) => s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    if (branch && branch !== "all") {
      list = list.filter((s) => s.branch === branch);
    }
    if (year) {
      list = list.filter((s) => s.year === year);
    }
    return list.slice(0, limit).map((s) => ({
      id: s.id as string,
      name: s.name as string,
      branch: s.branch as string,
      year: s.year as number,
      section: s.section as string,
    }));
  }
  // the picker is public: it searches the synthetic cohort's read-only index, never the database
  if (!PREVIEW_ENABLED) return [];
  return searchPreview(query, branch, year, limit);
}

/** Retrieve personal planning targets for a student */
export async function getStudentPlans(studentId?: string): Promise<StudentPlan[]> {
  const profile = await getProfile();
  const targetId = studentId ?? profile?.student_id;
  if (!targetId) return [];

  if (OFFLINE) {
    return offlinePlans.filter((p) => p.student_id === targetId);
  }
  if (isPreview(profile)) return readDemoPlans(targetId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_plans")
    .select("*")
    .eq("student_id", targetId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load plans: ${error.message}`);
  return (data ?? []) as StudentPlan[];
}

/** Retrieve verified connection / sync provenance metadata for a student */
export async function getExternalConnection(studentId?: string): Promise<ExternalConnection | null> {
  const profile = await getProfile();
  const targetId = studentId ?? profile?.student_id;
  if (!targetId) return null;

  if (OFFLINE) {
    return (
      offlineConnections.get(targetId) ?? {
        id: `conn-${targetId}`,
        student_id: targetId,
        provider: "culko",
        status: "manual_import",
        last_synced_at: null,
        provenance: "synthetic_demo",
        details: { cohort_version: "HacXLerate 2026 Demo Frozen Cohort" },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );
  }

  if (isPreview(profile)) return (await readDemoImport(targetId)) ?? previewConnection(targetId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("external_connections")
    .select("*")
    .eq("student_id", targetId)
    .maybeSingle();

  if (error || !data) {
    return {
      id: `conn-${targetId}`,
      student_id: targetId,
      provider: "culko",
      status: "manual_import",
      last_synced_at: null,
      provenance: "synthetic_demo",
      details: { cohort_version: "HacXLerate 2026 Demo Frozen Cohort" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  return data as ExternalConnection;
}

/** Unified academic data retriever for student portal */
export async function getStudentAcademicData(studentId?: string) {
  const profile = await getProfile();
  const targetId = studentId ?? profile?.student_id;
  if (!targetId) return null;

  const data360 = await getStudent360(targetId);
  if (!data360) return null;

  const [plans, connection] = await Promise.all([
    getStudentPlans(targetId),
    getExternalConnection(targetId),
  ]);

  return {
    ...data360,
    plans,
    connection,
  };
}
