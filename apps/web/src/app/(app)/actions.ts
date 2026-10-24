"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { OFFLINE, offlineConnections, offlineInterventions, offlinePlans, one, visibleIds } from "@/lib/offline";
import { getProfile, isPreview } from "@/lib/data";
import { ACTIVE_STATUSES, canTransition } from "@/lib/intervention-rules";
import { DEMO_PLAN_LIMIT, PREVIEW_ENABLED, readDemoPlans, writeDemoImport, writeDemoPlans } from "@/lib/demo-preview";

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

/** Database refusals in words a mentor understands (rules live in migration 0011). */
function interventionError(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "This student already has an open intervention of this type. Update that one instead.";
  if (error.code === "22023") return error.message;
  if (error.message.includes("row-level security")) return "You can only create interventions for your students.";
  return error.message;
}

export async function createIntervention(input: z.infer<typeof CreateSchema>): Promise<ActionResult> {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const v = parsed.data;

  if (OFFLINE) {
    if (!visibleIds().has(v.student_id)) return { ok: false, error: "You can only create interventions for your students." };
    if (offlineInterventions.some((i) => i.student_id === v.student_id && i.type === v.type && ACTIVE_STATUSES.includes(i.status))) {
      return { ok: false, error: interventionError({ code: "23505", message: "" }) };
    }
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
    if (error) return { ok: false, error: interventionError(error) };
    await supabase.from("audit_log").insert({ action: "create_intervention", student_id: v.student_id });
  }
  revalidatePath(`/students/${v.student_id}`);
  revalidatePath("/interventions");
  revalidatePath("/overview");
  return { ok: true };
}

export interface BulkQueueResult {
  ok: boolean;
  queued: number;
  skipped: number;
  error?: string;
}

const QueuePlaybookSchema = z.object({
  persona: z.string().min(1),
  intervention_type: z.enum(TYPES),
  owner_name: z.string().trim().min(2).max(80),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  driver: z.string().max(200).optional().nullable(),
  target_student_ids: z.array(z.string().regex(/^CU\d{2}[A-Z]{2,4}\d{4}$/)).max(100),
});

export async function queuePlaybookAction(input: z.infer<typeof QueuePlaybookSchema>): Promise<BulkQueueResult> {
  const parsed = QueuePlaybookSchema.safeParse(input);
  if (!parsed.success) return { ok: false, queued: 0, skipped: 0, error: parsed.error.issues[0]?.message ?? "Invalid playbook input" };
  const v = parsed.data;

  let queued = 0;
  let skipped = 0;

  if (OFFLINE) {
    const allowed = visibleIds();
    for (const sid of v.target_student_ids) {
      if (!allowed.has(sid)) {
        skipped++;
        continue;
      }
      const alreadyActive = offlineInterventions.some(
        (i) => i.student_id === sid && i.type === v.intervention_type && ACTIVE_STATUSES.includes(i.status)
      );
      if (alreadyActive) {
        skipped++;
        continue;
      }
      const s = one("student_scores", sid);
      const now = new Date().toISOString();
      offlineInterventions.unshift({
        id: randomUUID(),
        student_id: sid,
        type: v.intervention_type,
        driver: v.driver ?? `Segment Playbook: ${v.persona}`,
        owner_name: v.owner_name,
        due_date: v.due_date,
        notes: `Bulk queued from Prescriptive Playbook for ${v.persona}`,
        status: "open",
        baseline: s ? { success_score: s.success_score, academic_risk_prob: s.academic_risk_prob, placement_risk_prob: s.placement_risk_prob } : null,
        created_at: now,
        updated_at: now,
      });
      queued++;
    }
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, queued: 0, skipped: 0, error: "Your session has expired. Sign in again." };

    for (const sid of v.target_student_ids) {
      // Check existing active intervention to prevent duplicate
      const { data: existing } = await supabase
        .from("interventions")
        .select("id")
        .eq("student_id", sid)
        .eq("type", v.intervention_type)
        .in("status", ["open", "in_progress"])
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { data: s } = await supabase
        .from("student_scores")
        .select("success_score, academic_risk_prob, placement_risk_prob")
        .eq("student_id", sid)
        .maybeSingle();

      const { error } = await supabase.from("interventions").insert({
        student_id: sid,
        type: v.intervention_type,
        driver: v.driver ?? `Segment Playbook: ${v.persona}`,
        owner_name: v.owner_name,
        due_date: v.due_date,
        notes: `Bulk queued from Prescriptive Playbook for ${v.persona}`,
        created_by: user.id,
        baseline: s ?? null,
      });

      if (error) {
        skipped++;
      } else {
        queued++;
        await supabase.from("audit_log").insert({ action: "queue_playbook_intervention", student_id: sid });
      }
    }
  }

  revalidatePath("/interventions");
  revalidatePath("/segments");
  revalidatePath("/overview");

  return { ok: true, queued, skipped };
}

const StatusSchema = z.object({ id: z.string().uuid(), status: z.enum(["open", "in_progress", "done", "cancelled"]), notes: z.string().max(1000).optional() });

export async function updateInterventionStatus(input: z.infer<typeof StatusSchema>): Promise<ActionResult> {
  const parsed = StatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid update" };
  const { id, status, notes } = parsed.data;
  if (OFFLINE) {
    const it = offlineInterventions.find((i) => i.id === id);
    if (!it) return { ok: false, error: "Not found" };
    if (!canTransition(it.status, status)) return { ok: false, error: `Intervention status cannot change from ${it.status} to ${status}` };
    it.status = status;
    if (notes !== undefined) it.notes = notes;
    it.updated_at = new Date().toISOString();
  } else {
    const supabase = await createClient();
    const { error, count } = await supabase
      .from("interventions")
      .update({ status, ...(notes !== undefined ? { notes } : {}), updated_at: new Date().toISOString() }, { count: "exact" })
      .eq("id", id);
    if (error) return { ok: false, error: interventionError(error) };
    // RLS hides rows this user may not change: zero rows is a refusal, not a success
    if (!count) return { ok: false, error: "You can only update interventions for your own students." };
  }
  revalidatePath("/interventions");
  revalidatePath("/overview");
  return { ok: true };
}

const FollowupSchema = z.object({
  id: z.string().uuid(),
  followup_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid follow-up date"),
  observed_risk_prob: z.number().min(0).max(1).optional().nullable(),
  observed_score: z.number().min(0).max(100).optional().nullable(),
  observed_attendance: z.number().min(0).max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  outcome: z.enum(["improved", "stable", "escalated", "unresolved", "inconclusive"]).optional().nullable(),
  review_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(["open", "in_progress", "done", "cancelled"]).optional(),
});

export async function recordInterventionFollowup(input: z.infer<typeof FollowupSchema>): Promise<ActionResult> {
  const parsed = FollowupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid follow-up data" };
  const v = parsed.data;

  const followupPayload = {
    date: v.followup_date,
    academic_risk_prob: v.observed_risk_prob ?? null,
    success_score: v.observed_score ?? null,
    attendance_pct: v.observed_attendance ?? null,
    notes: v.notes ?? null,
  };

  if (OFFLINE) {
    const it = offlineInterventions.find((i) => i.id === v.id);
    if (!it) return { ok: false, error: "Intervention not found" };
    it.followup = followupPayload;
    if (v.outcome !== undefined) it.outcome = v.outcome;
    if (v.review_date !== undefined) it.review_date = v.review_date;
    if (v.status) {
      if (!canTransition(it.status, v.status)) return { ok: false, error: `Intervention status cannot change from ${it.status} to ${v.status}` };
      it.status = v.status;
    }
    it.updated_at = new Date().toISOString();
  } else {
    const supabase = await createClient();
    const updateObj: Record<string, any> = {
      followup: followupPayload,
      updated_at: new Date().toISOString(),
    };
    if (v.outcome !== undefined) updateObj.outcome = v.outcome;
    if (v.review_date !== undefined) updateObj.review_date = v.review_date;
    if (v.status) updateObj.status = v.status;

    const { error, count } = await supabase
      .from("interventions")
      .update(updateObj, { count: "exact" })
      .eq("id", v.id);
    if (error) return { ok: false, error: interventionError(error) };
    if (!count) return { ok: false, error: "You can only update interventions for your authorized students." };
  }

  revalidatePath("/interventions");
  revalidatePath("/overview");
  revalidatePath("/students");
  return { ok: true };
}

export async function selectDemoStudentAction(studentId: string): Promise<ActionResult> {
  if (!OFFLINE && !PREVIEW_ENABLED) return { ok: false, error: "Student preview is not enabled on this deployment." };
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
      // the institution is stamped by the database from the signed-in user (migration 0014)
      { onConflict: "institution_id,student_id" },
    );
    if (error) return { ok: false, error: `Could not save the import: ${error.message}` };
  }
  revalidatePath("/student");
  revalidatePath("/student/connection");
  return { ok: true };
}

/** After a pipeline run publishes new scores, drop the cached cohort so every tab shows the new data. */
export async function refreshCohortAction(): Promise<ActionResult> {
  revalidateTag("cohort");
  revalidatePath("/", "layout");
  return { ok: true };
}
