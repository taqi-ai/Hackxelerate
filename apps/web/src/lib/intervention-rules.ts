/** Intervention state machine. The database enforces the same rules (migration 0011); this copy gives offline mode
 *  the same behaviour and lets the UI explain a refusal without a round trip. */
export type InterventionStatus = "open" | "in_progress" | "done" | "cancelled";

const NEXT: Record<InterventionStatus, InterventionStatus[]> = {
  open: ["in_progress", "done", "cancelled"],
  in_progress: ["open", "done", "cancelled"],
  done: ["open"],
  cancelled: ["open"],
};

export function canTransition(from: InterventionStatus, to: InterventionStatus) {
  return from === to || NEXT[from].includes(to);
}

export const ACTIVE_STATUSES: InterventionStatus[] = ["open", "in_progress"];
