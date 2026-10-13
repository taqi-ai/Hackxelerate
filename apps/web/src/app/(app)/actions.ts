"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { OFFLINE, offlineInterventions, one, visibleIds } from "@/lib/offline";

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
