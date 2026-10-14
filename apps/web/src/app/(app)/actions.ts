"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { OFFLINE, offlineConnections, offlineInterventions, offlinePlans, one, visibleIds } from "@/lib/offline";
import { getProfile, isPreview } from "@/lib/data";
import { DEMO_PLAN_LIMIT, readDemoPlans, writeDemoImport, writeDemoPlans } from "@/lib/demo-preview";

const TYPES = ["mentor_meeting", "peer_tutoring", "mock_interview", "counselling_referral", "parent_call", "skill_workshop"] as const;

const CreateSchema = z.object({
  student_id: z.string().regex(/^CU\d{2}[A-Z]{2,4}\d{4}$/),
  type: z.enum(TYPES),
  driver: z.string().max(200).optional().nullable(),
  owner_name: z.string().trim().min(2, "Add an owner").max(80),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a due date"),
  notes: z.string().max(1000).optional().nullable(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createIntervention(input: z.infer<typeof CreateSchema>): Promise<ActionResult> {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const v = parsed.data;

  if (OFFLINE) {
    if (!visibleIds().has(v.student_id)) return { ok: false, error: "You can only create interventions for your students." };
    const s = one("student_scores", v.student_id);
    const now = new Date().toISOString();
    offlineInterventions.unshift({
      id: randomUUID(),
      ...v,
      driver: v.driver ?? null,
      notes: v.notes ?? null,
      status: "open",
      baseline: s ? { success_score: s.success_score, academic_risk_prob: s.academic_risk_prob, placement_risk_prob: s.placement_risk_prob } : null,
      created_at: now,
      updated_at: now,
    });
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Your session has expired. Sign in again." };
    const { data: s } = await supabase
      .from("student_scores")
      .select("success_score, academic_risk_prob, placement_risk_prob")
      .eq("student_id", v.student_id)
      .maybeSingle();
    const { error } = await supabase.from("interventions").insert({ ...v, created_by: user.id, baseline: s ?? null });
    if (error) return { ok: false, error: error.message.includes("row-level security") ? "You can only create interventions for your students." : error.message };
    await supabase.from("audit_log").insert({ action: "create_intervention", student_id: v.student_id });
  }
  revalidatePath(`/students/${v.student_id}`);
  revalidatePath("/interventions");
  revalidatePath("/overview");
  return { ok: true };
}

const StatusSchema = z.object({ id: z.string().uuid(), status: z.enum(["open", "in_progress", "done", "cancelled"]), notes: z.string().max(1000).optional() });

export async function updateInterventionStatus(input: z.infer<typeof StatusSchema>): Promise<ActionResult> {
  const parsed = StatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid update" };
  const { id, status, notes } = parsed.data;
  if (OFFLINE) {
    const it = offlineInterventions.find((i) => i.id === id);
    if (!it) return { ok: false, error: "Not found" };
    it.status = status;
    if (notes !== undefined) it.notes = notes;
    it.updated_at = new Date().toISOString();
  } else {
    const supabase = await createClient();
    const { error } = await supabase
      .from("interventions")
      .update({ status, ...(notes !== undefined ? { notes } : {}), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/interventions");
  revalidatePath("/overview");
  return { ok: true };
}

export async function selectDemoStudentAction(studentId: string): Promise<ActionResult> {
  if (!/^CU\d{2}[A-Z]{2,4}\d{4}$/.test(studentId)) {
    return { ok: false, error: "Invalid student identifier format" };
  }
  const cookieStore = await cookies();
  cookieStore.set("ascora_demo_student", studentId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  revalidatePath("/student");
  revalidatePath("/student/academics");
  revalidatePath("/student/calculator");
  revalidatePath("/student/schedule");
  revalidatePath("/student/connection");
  return { ok: true };
}

export async function exitDemoStudentAction(): Promise<ActionResult> {
  const cookieStore = await cookies();
  cookieStore.delete("ascora_demo_student");
  revalidatePath("/");
  revalidatePath("/login");
  revalidatePath("/student");
  return { ok: true };
}

const PlanSchema = z.object({
  student_id: z.string().regex(/^CU\d{2}[A-Z]{2,4}\d{4}$/),
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
  category: z.enum(["attendance", "marks", "cgpa", "deadline", "general"]),
  target_value: z.record(z.string(), z.any()),
  current_value: z.record(z.string(), z.any()),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

/** Where a student's own writes go: the database (real accounts, RLS), the visitor's cookie (public preview),
 *  or memory (local offline mode only). */
async function studentWriteMode(studentId: string): Promise<"offline" | "preview" | "db" | "denied"> {
  if (OFFLINE) return "offline";
  const profile = await getProfile();
  if (!profile) return "denied";
  if (isPreview(profile)) return profile.student_id === studentId ? "preview" : "denied";
  return "db";
}

const PREVIEW_PATHS = ["/student", "/student/calculator", "/student/schedule", "/student/academics"];
function revalidateStudent() {
  PREVIEW_PATHS.forEach((p) => revalidatePath(p));
}

export async function saveStudentPlanAction(input: z.infer<typeof PlanSchema>): Promise<ActionResult> {
  const parsed = PlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const v = parsed.data;
  const now = new Date().toISOString();
  const plan = {
    id: randomUUID(),
    student_id: v.student_id,
    title: v.title,
    category: v.category,
    target_value: v.target_value,
    current_value: v.current_value,
    due_date: v.due_date ?? null,
    status: "active" as const,
    notes: v.notes ? v.notes.slice(0, 300) : null,
    created_at: now,
    updated_at: now,
  };

  const mode = await studentWriteMode(v.student_id);
  if (mode === "denied") return { ok: false, error: "You can only save plans for your own profile." };
  if (mode === "offline") {
    offlinePlans.unshift(plan);
  } else if (mode === "preview") {
    const current = await readDemoPlans(v.student_id);
    if (current.length >= DEMO_PLAN_LIMIT) {
      return { ok: false, error: `Preview mode keeps up to ${DEMO_PLAN_LIMIT} plans in this browser. Complete or delete one first.` };
    }
    if (!(await writeDemoPlans(v.student_id, [plan, ...current]))) return { ok: false, error: "This plan is too large to keep in preview mode." };
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("student_plans").insert({
      student_id: plan.student_id,
      title: plan.title,
      category: plan.category,
      target_value: plan.target_value,
      current_value: plan.current_value,
      due_date: plan.due_date,
      status: plan.status,
      notes: plan.notes,
    });
    if (error) return { ok: false, error: `Could not save the plan: ${error.message}` };
  }
  revalidateStudent();
  return { ok: true };
}

const PlanStatus = z.enum(["active", "completed", "archived"]);

export async function updateStudentPlanStatusAction(planId: string, status: "active" | "completed" | "archived"): Promise<ActionResult> {
  if (!PlanStatus.safeParse(status).success) return { ok: false, error: "Invalid status" };
  const profile = OFFLINE ? null : await getProfile();
  if (OFFLINE) {
    const p = offlinePlans.find((x) => x.id === planId);
    if (!p) return { ok: false, error: "Plan not found" };
    p.status = status;
    p.updated_at = new Date().toISOString();
  } else if (isPreview(profile)) {
    const plans = await readDemoPlans(profile!.student_id!);
    const p = plans.find((x) => x.id === planId);
    if (!p) return { ok: false, error: "Plan not found" };
    p.status = status;
    p.updated_at = new Date().toISOString();
    await writeDemoPlans(profile!.student_id!, plans);
  } else {
    const supabase = await createClient();
    const { error, count } = await supabase
      .from("student_plans")
      .update({ status, updated_at: new Date().toISOString() }, { count: "exact" })
      .eq("id", planId);
    if (error) return { ok: false, error: `Could not update the plan: ${error.message}` };
    if (!count) return { ok: false, error: "Plan not found" };
  }
  revalidateStudent();
  return { ok: true };
}

export async function deleteStudentPlanAction(planId: string): Promise<ActionResult> {
  const profile = OFFLINE ? null : await getProfile();
  if (OFFLINE) {
    const idx = offlinePlans.findIndex((x) => x.id === planId);
    if (idx === -1) return { ok: false, error: "Plan not found" };
    offlinePlans.splice(idx, 1);
  } else if (isPreview(profile)) {
    const plans = await readDemoPlans(profile!.student_id!);
    if (!plans.some((x) => x.id === planId)) return { ok: false, error: "Plan not found" };
    await writeDemoPlans(profile!.student_id!, plans.filter((x) => x.id !== planId));
  } else {
    const supabase = await createClient();
    const { error, count } = await supabase.from("student_plans").delete({ count: "exact" }).eq("id", planId);
    if (error) return { ok: false, error: `Could not delete the plan: ${error.message}` };
    if (!count) return { ok: false, error: "Plan not found" };
  }
  revalidateStudent();
  return { ok: true };
}

const ImportSchema = z.object({
  student_id: z.string().regex(/^CU\d{2}[A-Z]{2,4}\d{4}$/),
  source: z.string().trim().min(2).max(120),
  notes: z.string().max(300).optional(),
  attendancePct: z.number().min(0).max(100).optional(),
  cgpa: z.number().min(0).max(10).optional(),
});

export async function importManualAcademicRecordAction(input: z.infer<typeof ImportSchema>): Promise<ActionResult> {
  const parsed = ImportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const v = parsed.data;
  const now = new Date().toISOString();
  const details = { source: v.source, notes: v.notes, attendancePct: v.attendancePct, cgpa: v.cgpa, entered_by: "student" };

  const mode = await studentWriteMode(v.student_id);
  if (mode === "denied") return { ok: false, error: "You can only import records for your own profile." };
  const conn = {
    id: `conn-${v.student_id}`,
    student_id: v.student_id,
    provider: "manual_import",
    status: "manual_import" as const,
    last_synced_at: now,
    provenance: "manual_import" as const,
    details,
    created_at: now,
    updated_at: now,
  };
  if (mode === "offline") {
    offlineConnections.set(v.student_id, conn);
  } else if (mode === "preview") {
    await writeDemoImport(conn);
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("external_connections").upsert(
      { student_id: v.student_id, provider: "manual_import", status: "manual_import", last_synced_at: now, provenance: "manual_import", details, updated_at: now },
      { onConflict: "student_id" },
    );
    if (error) return { ok: false, error: `Could not save the import: ${error.message}` };
  }
  revalidatePath("/student");
  revalidatePath("/student/connection");
  return { ok: true };
}
