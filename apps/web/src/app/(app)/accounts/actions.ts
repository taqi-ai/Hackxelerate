"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { OFFLINE } from "@/lib/offline";
import type { ActionResult } from "@/app/(app)/actions";

/** Every rule (admin only, own institution, not a shared evaluation account, no self-deactivation) is enforced by the
 *  database functions in migration 0013; these actions only validate input and translate refusals. */

const InviteSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    fullName: z.string().trim().min(2, "Enter the person's name").max(120),
    role: z.enum(["admin", "mentor", "student"]),
    mentorId: z.string().trim().max(20).optional(),
    studentId: z.string().trim().toUpperCase().max(20).optional(),
  })
  .refine((v) => v.role !== "mentor" || !!v.mentorId, { message: "Pick the mentor record this account belongs to" })
  .refine((v) => v.role !== "student" || !!v.studentId, { message: "Enter the student's roll number" });

function accountError(error: { code?: string; message: string }): string {
  if (error.code === "42501") return "Only an institution admin with a personal account can manage accounts.";
  if (error.code === "23505" || error.code === "22023") return error.message;
  return "The change could not be saved. Try again.";
}

const offlineRefusal: ActionResult = { ok: false, error: "Account management needs the live database; this copy runs offline." };

export async function inviteAccountAction(input: z.input<typeof InviteSchema>): Promise<ActionResult> {
  const parsed = InviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (OFFLINE) return offlineRefusal;
  const v = parsed.data;
  const { error } = await (await createClient()).rpc("invite_account", {
    p_email: v.email,
    p_full_name: v.fullName,
    p_role: v.role,
    p_mentor_id: v.role === "mentor" ? v.mentorId : null,
    p_student_id: v.role === "student" ? v.studentId : null,
  });
  if (error) return { ok: false, error: accountError(error) };
  revalidatePath("/accounts");
  return { ok: true };
}

export async function revokeInviteAction(inviteId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(inviteId).success) return { ok: false, error: "Unknown invite" };
  if (OFFLINE) return offlineRefusal;
  const { error } = await (await createClient()).rpc("revoke_invite", { p_invite: inviteId });
  if (error) return { ok: false, error: accountError(error) };
  revalidatePath("/accounts");
  return { ok: true };
}

export async function setAccountDisabledAction(userId: string, disabled: boolean): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(userId).success) return { ok: false, error: "Unknown account" };
  if (OFFLINE) return offlineRefusal;
  const { error } = await (await createClient()).rpc("set_account_disabled", { p_user: userId, p_disabled: disabled });
  if (error) return { ok: false, error: accountError(error) };
  revalidatePath("/accounts");
  return { ok: true };
}
