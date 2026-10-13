"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { OFFLINE, offlineConnections, offlineInterventions, offlinePlans, one, visibleIds } from "@/lib/offline";

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

export async function saveStudentPlanAction(input: z.infer<typeof PlanSchema>): Promise<ActionResult> {
  const parsed = PlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const v = parsed.data;
  const now = new Date().toISOString();

  if (OFFLINE) {
    offlinePlans.unshift({
      id: randomUUID(),
      student_id: v.student_id,
      title: v.title,
      category: v.category,
      target_value: v.target_value,
      current_value: v.current_value,
      due_date: v.due_date ?? null,
      status: "active",
      notes: v.notes ?? null,
      created_at: now,
      updated_at: now,
    });
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("student_plans").insert({
      student_id: v.student_id,
      title: v.title,
      category: v.category,
      target_value: v.target_value,
      current_value: v.current_value,
      due_date: v.due_date ?? null,
      status: "active",
      notes: v.notes ?? null,
    });
    if (error) {
      // In-memory fallback if table not yet migrated
      offlinePlans.unshift({
        id: randomUUID(),
        student_id: v.student_id,
        title: v.title,
        category: v.category,
        target_value: v.target_value,
        current_value: v.current_value,
        due_date: v.due_date ?? null,
        status: "active",
        notes: v.notes ?? null,
        created_at: now,
        updated_at: now,
      });
    }
  }

  revalidatePath("/student");
  revalidatePath("/student/calculator");
  revalidatePath("/student/schedule");
  return { ok: true };
}

export async function updateStudentPlanStatusAction(planId: string, status: "active" | "completed" | "archived"): Promise<ActionResult> {
  if (OFFLINE) {
    const p = offlinePlans.find((x) => x.id === planId);
    if (p) {
      p.status = status;
      p.updated_at = new Date().toISOString();
    }
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("student_plans").update({ status, updated_at: new Date().toISOString() }).eq("id", planId);
    if (error) {
      const p = offlinePlans.find((x) => x.id === planId);
      if (p) {
        p.status = status;
        p.updated_at = new Date().toISOString();
      }
    }
  }
  revalidatePath("/student/schedule");
  return { ok: true };
}

export async function deleteStudentPlanAction(planId: string): Promise<ActionResult> {
  if (OFFLINE) {
    const idx = offlinePlans.findIndex((x) => x.id === planId);
    if (idx !== -1) offlinePlans.splice(idx, 1);
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("student_plans").delete().eq("id", planId);
    if (error) {
      const idx = offlinePlans.findIndex((x) => x.id === planId);
      if (idx !== -1) offlinePlans.splice(idx, 1);
    }
  }
  revalidatePath("/student/schedule");
  return { ok: true };
}

export async function importManualAcademicRecordAction(input: {
  student_id: string;
  source: string;
  notes?: string;
  attendancePct?: number;
  cgpa?: number;
}): Promise<ActionResult> {
  const now = new Date().toISOString();
  const connData = {
    id: `conn-${input.student_id}`,
    student_id: input.student_id,
    provider: "manual_import",
    status: "manual_import" as const,
    last_synced_at: now,
    provenance: "manual_import" as const,
    details: {
      source: input.source,
      notes: input.notes,
      attendancePct: input.attendancePct,
      cgpa: input.cgpa,
      verified_by: "Student Verified Submission",
    },
    created_at: now,
    updated_at: now,
  };

  offlineConnections.set(input.student_id, connData);

  if (!OFFLINE) {
    const supabase = await createClient();
    await supabase.from("external_connections").upsert(connData, { onConflict: "student_id" });
  }

  revalidatePath("/student");
  revalidatePath("/student/connection");
  return { ok: true };
}
