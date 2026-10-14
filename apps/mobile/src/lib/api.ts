import { supabase, isSupabaseConfigured } from "./supabase";
import type {
  Intervention,
  LMSActivity,
  Profile,
  StudentRow,
  StudentScore,
} from "./types";

const ROW_COLS =
  "student_id, success_score, academic_risk_prob, academic_risk_level, placement_risk_prob, placement_risk_level, intent, segment_id, persona, priority, alerts, components, metrics, students!inner(name, email, branch, year, section, mentor_id)";

function toRow(r: any, st: any): StudentRow {
  return {
    id: r.student_id,
    name: st?.name ?? "Unknown",
    email: st?.email ?? null,
    branch: st?.branch ?? "",
    year: st?.year ?? 1,
    section: st?.section ?? "",
    mentor_id: st?.mentor_id ?? null,
    success_score: Number(r.success_score || 0),
    academic_risk_prob: Number(r.academic_risk_prob || 0),
    academic_risk_level: r.academic_risk_level || "Low",
    placement_risk_prob:
      r.placement_risk_prob === null || r.placement_risk_prob === undefined
        ? null
        : Number(r.placement_risk_prob),
    placement_risk_level: r.placement_risk_level || "N/A",
    intent: r.intent || "undecided",
    segment_id: Number(r.segment_id || 0),
    persona: r.persona || "",
    priority: Number(r.priority || 0),
    alerts: Array.isArray(r.alerts) ? r.alerts : [],
    components: r.components || {
      academic: 50,
      placement: 50,
      attendance: 50,
      lms: 50,
      skills: 50,
      engagement: 50,
    },
    metrics: r.metrics || {},
  };
}

export async function fetchCurrentProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, mentor_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return {
      id: user.id,
      full_name: user.email?.split("@")[0] || "User",
      role: (user.email?.includes("admin") ? "admin" : "mentor") as "admin" | "mentor",
      mentor_id: null,
      email: user.email || "",
    };
  }
  return { ...(data as Profile), email: user.email || "" };
}

export interface StudentQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  filter?: "all" | "academic_high" | "placement_high" | "silent_decliner";
  orderByPriority?: boolean;
}

export async function fetchStudentRows(
  options: StudentQueryOptions = {}
): Promise<{ rows: StudentRow[]; hasMore: boolean; totalApprox?: number }> {
  const {
    page = 0,
    pageSize = 50,
    search = "",
    filter = "all",
    orderByPriority = false,
  } = options;

  if (!isSupabaseConfigured) {
    return {
      rows: [],
      hasMore: false,
      totalApprox: 0,
    };
  }

  let query = supabase.from("student_scores").select(ROW_COLS, { count: "exact" });

  if (orderByPriority) {
    query = query.order("priority", { ascending: false });
  } else {
    query = query.order("student_id", { ascending: true });
  }

  if (filter === "academic_high") {
    query = query.eq("academic_risk_level", "High");
  } else if (filter === "placement_high") {
    query = query.eq("placement_risk_level", "High");
  }

  // PostgREST search filter if provided
  const trimmed = search.trim();
  if (trimmed) {
    if (/^CU/i.test(trimmed)) {
      query = query.ilike("student_id", `%${trimmed}%`);
    } else {
      query = query.ilike("students.name", `%${trimmed}%`);
    }
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);
  if (error) {
    console.error("fetchStudentRows error:", error.message);
    throw new Error(error.message);
  }

  let mapped = (data || []).map((r: any) => toRow(r, r.students));

  // Client-side filter for silent decliner if needed (based on alert type)
  if (filter === "silent_decliner") {
    mapped = mapped.filter((r) =>
      r.alerts.some(
        (a) => a.type === "silent_decliner" || a.type === "lms_silent"
      )
    );
  }

  return {
    rows: mapped,
    hasMore: data ? data.length === pageSize : false,
    totalApprox: count ?? undefined,
  };
}

export async function fetchTopPriorityStudents(limit = 5): Promise<StudentRow[]> {
  if (!isSupabaseConfigured) {
    return [];
  }
  const { data, error } = await supabase
    .from("student_scores")
    .select(ROW_COLS)
    .order("priority", { ascending: false })
    .limit(limit);

  if (error) {
    // Only log if not an unconfigured key warning
    if (!error.message?.includes("Invalid API key")) {
      console.error("fetchTopPriorityStudents error:", error.message);
    }
    return [];
  }
  return (data || []).map((r: any) => toRow(r, r.students));
}

export async function fetchDashboardStats(): Promise<{
  totalStudents: number;
  avgScore: number;
  highAcademic: number;
  highPlacement: number;
  silentDecliners: number;
}> {
  if (!isSupabaseConfigured) {
    return {
      totalStudents: 0,
      avgScore: 0,
      highAcademic: 0,
      highPlacement: 0,
      silentDecliners: 0,
    };
  }
  // Query all accessible rows (or up to 1200) for exact metric aggregates
  const { data, error } = await supabase
    .from("student_scores")
    .select("success_score, academic_risk_level, placement_risk_level, alerts")
    .limit(1500);

  if (error || !data || data.length === 0) {
    return {
      totalStudents: 0,
      avgScore: 0,
      highAcademic: 0,
      highPlacement: 0,
      silentDecliners: 0,
    };
  }

  const total = data.length;
  let scoreSum = 0;
  let highAcad = 0;
  let highPlace = 0;
  let silent = 0;

  for (const r of data) {
    scoreSum += Number(r.success_score || 0);
    if (r.academic_risk_level === "High") highAcad++;
    if (r.placement_risk_level === "High") highPlace++;
    if (
      Array.isArray(r.alerts) &&
      r.alerts.some((a: any) => a?.type === "silent_decliner" || a?.type === "lms_silent")
    ) {
      silent++;
    }
  }

  return {
    totalStudents: total,
    avgScore: Math.round(scoreSum / total),
    highAcademic: highAcad,
    highPlacement: highPlace,
    silentDecliners: silent,
  };
}

export async function fetchStudent360(studentId: string) {
  const [studentRes, scoreRes, lmsRes] = await Promise.all([
    supabase
      .from("students")
      .select("*, mentors(name)")
      .eq("id", studentId)
      .maybeSingle(),
    supabase
      .from("student_scores")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle(),
    supabase
      .from("lms_activity")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle(),
  ]);

  if (studentRes.error || !studentRes.data) return null;

  // Log audit view
  supabase.from("audit_log").insert({
    action: "view_student_360_mobile",
    student_id: studentId,
  }).then(() => {});

  return {
    student: studentRes.data,
    score: (scoreRes.data as StudentScore) ?? null,
    lms: (lmsRes.data as LMSActivity) ?? null,
  };
}

export async function fetchInterventions(studentId?: string): Promise<Intervention[]> {
  if (!isSupabaseConfigured) {
    return [];
  }
  let query = supabase
    .from("interventions")
    .select("*")
    .order("created_at", { ascending: false });

  if (studentId) {
    query = query.eq("student_id", studentId);
  }

  const { data, error } = await query;
  if (error) {
    if (!error.message?.includes("Invalid API key")) {
      console.error("fetchInterventions error:", error.message);
    }
    return [];
  }

  return (data || []).map((i: any) => ({
    id: i.id,
    student_id: i.student_id,
    type: i.type,
    driver: i.driver,
    owner_name: i.owner_name,
    due_date: i.due_date,
    status: i.status,
    notes: i.notes,
    baseline: i.baseline,
    created_at: i.created_at,
    updated_at: i.updated_at,
  }));
}

export async function createIntervention(payload: {
  student_id: string;
  type: string;
  driver?: string | null;
  owner_name: string;
  due_date: string;
  notes?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Authentication required" };

  // Fetch baseline score
  const { data: score } = await supabase
    .from("student_scores")
    .select("success_score, academic_risk_prob, placement_risk_prob")
    .eq("student_id", payload.student_id)
    .maybeSingle();

  const baseline = score
    ? {
        success_score: score.success_score,
        academic_risk_prob: score.academic_risk_prob,
        placement_risk_prob: score.placement_risk_prob,
      }
    : null;

  const { error } = await supabase.from("interventions").insert({
    student_id: payload.student_id,
    type: payload.type,
    driver: payload.driver ?? null,
    owner_name: payload.owner_name,
    due_date: payload.due_date,
    notes: payload.notes ?? null,
    created_by: user.id,
    baseline,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  supabase.from("audit_log").insert({
    action: "create_intervention_mobile",
    student_id: payload.student_id,
  }).then(() => {});

  return { ok: true };
}

export async function updateInterventionStatus(
  id: string,
  status: "open" | "in_progress" | "done" | "cancelled"
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("interventions")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
