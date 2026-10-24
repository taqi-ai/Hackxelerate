"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createIntervention } from "@/app/(app)/actions";
import { buildPlan, validateCapacity } from "@/lib/mission-control";
import { loadMission, PLAN_DATES } from "./load";

const ApproveSchema = z.object({
  capacity: z.unknown(),
  student_ids: z.array(z.string().regex(/^CU\d{2}[A-Z]{2,4}\d{4}$/)).min(1, "Select at least one recommendation").max(500),
});

export type ApproveResult =
  | { ok: true; created: number; existing: number }
  | { ok: false; error: string; created: number; existing: number; failed: { student_id: string; error: string }[] };

/** Turns approved recommendations into real interventions through the same server action every other screen uses.
 *  The browser sends only the capacity and the chosen student ids. The plan is recomputed here from data read as the
 *  caller, so a forged id, a student outside the caller's scope, a changed allocation or an overspent capacity cannot
 *  get through. Retrying is safe: a student who already has the open intervention counts as "existing". */
export async function approveMissionPlan(input: z.infer<typeof ApproveSchema>): Promise<ApproveResult> {
  const fail = (error: string): ApproveResult => ({ ok: false, error, created: 0, existing: 0, failed: [] });
  const parsed = ApproveSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request");
  const cap = validateCapacity(parsed.data.capacity);
  if (!cap.ok) return fail(cap.error);
  const data = await loadMission();
  if (!data) return fail("Mission Control is for mentors and administrators. Sign in with a staff account.");

  const dates = PLAN_DATES();
  const plan = buildPlan(data.students, cap.value, dates);
  const byId = new Map(plan.selected.map((a) => [a.student_id, a]));
  const known = new Map(data.students.map((s) => [s.id, s]));

  let created = 0;
  let existing = 0;
  const failed: { student_id: string; error: string }[] = [];
  for (const id of [...new Set(parsed.data.student_ids)]) {
    const a = byId.get(id);
    if (!a) {
      if (known.get(id)?.hasActive) existing++; // a retry after success: the intervention is already there
      else failed.push({ student_id: id, error: "Not part of the current plan, or outside your authorised students" });
      continue;
    }
    const res = await createIntervention({
      student_id: a.student_id,
      type: a.type,
      driver: a.evidence[0]?.slice(0, 200) ?? null,
      owner_name: a.owner_name,
      due_date: a.due_date,
      notes: `Mission Control plan (${a.dimension} risk ${(a.risk_prob * 100).toFixed(0)}%, planning scenario on synthetic data). Follow-up review by ${a.followup_date}.`,
    });
    if (res.ok) created++;
    else if (res.error.includes("already has an open intervention")) existing++;
    else failed.push({ student_id: id, error: res.error });
  }
  revalidatePath("/mission-control");
  revalidatePath("/this-week");
  if (failed.length) return { ok: false, error: `${failed.length} recommendation(s) could not be saved`, created, existing, failed };
  return { ok: true, created, existing };
}
