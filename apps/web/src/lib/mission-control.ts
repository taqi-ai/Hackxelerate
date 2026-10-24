/** Mission Control: a transparent, deterministic weekly intervention allocation.
 *
 *  This is a GREEDY HEURISTIC, not a globally optimal solver. Rules, in order:
 *   1. A student is considered when at least one risk dimension is Medium or High
 *      (academic always; placement only for students whose declared intent is placement).
 *   2. A considered student is held back (never allocated) when: they have no assigned mentor, an identity match
 *      awaits review, or they already have an open / in-progress intervention.
 *   3. Each dimension gets a candidate intervention from its strongest actionable driver, restricted to the types
 *      valid for that dimension. value = risk probability x (0.5 + 0.5 x actionable share of the raising drivers).
 *   4. Students are served in order of their best candidate value (ties: existing priority, then id). Each student
 *      receives at most ONE intervention per planning period: their best candidate that still fits capacity.
 *   5. Capacity: mentor meetings draw minutes from the student's own mentor; peer tutoring, mock interviews and
 *      workshops draw institution-wide slots.
 *  "Need covered" is the summed value of selected candidates over the summed best value of all considered
 *  students. It is an allocation metric, not a forecast of recovery. Nothing here is a causal effect.
 */
import { suggestIntervention } from "./format";

export const PLAN_TYPES = ["mentor_meeting", "peer_tutoring", "mock_interview", "skill_workshop"] as const;
export type PlanType = (typeof PLAN_TYPES)[number];
export type Dimension = "academic" | "placement";

export const ALLOWED: Record<Dimension, PlanType[]> = {
  academic: ["mentor_meeting", "peer_tutoring"],
  placement: ["mock_interview", "skill_workshop", "mentor_meeting"],
};

export interface Capacity {
  mentorHoursPerMentor: number;
  meetingMinutes: number;
  peerSlots: number;
  mockSlots: number;
  workshopSlots: number;
}

/** Illustrative defaults for the synthetic demonstration cohort. They are assumptions, not measurements. */
export const DEFAULT_CAPACITY: Capacity = { mentorHoursPerMentor: 3, meetingMinutes: 30, peerSlots: 12, mockSlots: 10, workshopSlots: 8 };

export const CAPACITY_BOUNDS: Record<keyof Capacity, { min: number; max: number; integer: boolean; label: string }> = {
  mentorHoursPerMentor: { min: 0, max: 40, integer: false, label: "Mentor hours per mentor" },
  meetingMinutes: { min: 10, max: 120, integer: true, label: "Minutes per mentor meeting" },
  peerSlots: { min: 0, max: 200, integer: true, label: "Peer-tutoring slots" },
  mockSlots: { min: 0, max: 200, integer: true, label: "Mock-interview slots" },
  workshopSlots: { min: 0, max: 200, integer: true, label: "Skill-workshop slots" },
};

export function validateCapacity(input: unknown): { ok: true; value: Capacity } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Capacity is missing" };
  const out: Partial<Capacity> = {};
  for (const k of Object.keys(CAPACITY_BOUNDS) as (keyof Capacity)[]) {
    const b = CAPACITY_BOUNDS[k];
    const v = (input as Record<string, unknown>)[k];
    if (typeof v !== "number" || !Number.isFinite(v)) return { ok: false, error: `${b.label} must be a number` };
    if (v < b.min || v > b.max) return { ok: false, error: `${b.label} must be between ${b.min} and ${b.max}` };
    if (b.integer && !Number.isInteger(v)) return { ok: false, error: `${b.label} must be a whole number` };
    out[k] = v;
  }
  return { ok: true, value: out as Capacity };
}

export interface MissionDriver {
  feature: string;
  text: string;
  impact: number;
  actionable: boolean;
}

export interface MissionStudent {
  id: string;
  name: string;
  branch: string;
  year: number;
  mentor_id: string | null;
  mentor_name: string | null;
  intent: string;
  academic_prob: number;
  academic_level: string;
  placement_prob: number | null;
  placement_level: string;
  priority: number;
  drivers: Record<Dimension, MissionDriver[]>; // drivers that RAISE risk, strongest first
  hasActive: boolean;
  identityReview: boolean;
}

export interface Allocation {
  student_id: string;
  name: string;
  dimension: Dimension;
  type: PlanType;
  risk_prob: number;
  value: number;
  owner_id: string;
  owner_name: string;
  cost: { resource: string; amount: number; unit: string };
  evidence: string[];
  driver_feature: string | null;
  why_feasible: string;
  warnings: string[];
  due_date: string;
  followup_date: string;
}

export interface Skipped {
  student_id: string;
  name: string;
  code: "no_mentor" | "identity_review" | "has_active" | "no_capacity";
  reason: string;
}

export interface Plan {
  selected: Allocation[];
  skipped: Skipped[];
  considered: number;
  usage: { resource: string; label: string; used: number; capacity: number; unit: string }[];
  mentorUsage: { mentor_id: string; mentor_name: string; usedMinutes: number; capacityMinutes: number }[];
  needCovered: number;
  needTotal: number;
  highPriority: { covered: number; total: number };
  baseline: { selected: number; needCovered: number; highCovered: number };
  fairness: { group: string; eligible: number; selected: number; rate: number; comparable: boolean; note: string }[];
}

const isLevel = (l: string) => l === "Medium" || l === "High";
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const RESOURCE_LABEL: Record<string, string> = {
  peer_tutoring: "Peer-tutoring slots",
  mock_interview: "Mock-interview slots",
  skill_workshop: "Skill-workshop slots",
};

interface Candidate {
  dimension: Dimension;
  type: PlanType;
  prob: number;
  value: number;
  driver: MissionDriver | null;
}

function candidateFor(s: MissionStudent, dimension: Dimension): Candidate | null {
  const prob = dimension === "academic" ? s.academic_prob : s.placement_prob;
  const level = dimension === "academic" ? s.academic_level : s.placement_level;
  if (prob === null || !isLevel(level)) return null;
  if (dimension === "placement" && s.intent !== "placement") return null; // placement actions need a declared pathway
  const drivers = s.drivers[dimension] ?? [];
  const total = drivers.reduce((a, d) => a + Math.max(0, d.impact), 0);
  const act = drivers.filter((d) => d.actionable).reduce((a, d) => a + Math.max(0, d.impact), 0);
  const share = total > 0 ? act / total : 0;
  const top = drivers.find((d) => d.actionable) ?? null;
  const fallback: PlanType = dimension === "academic" ? "mentor_meeting" : "mock_interview";
  const sug = suggestIntervention(top?.feature) as PlanType;
  const type = ALLOWED[dimension].includes(sug) ? sug : fallback;
  return { dimension, type, prob, value: r3(prob * (0.5 + 0.5 * share)), driver: top };
}

export function buildPlan(
  students: MissionStudent[],
  cap: Capacity,
  dates: { due: string; followup: string },
): Plan {
  const mentorBudget = new Map<string, { name: string; cap: number; used: number }>();
  const slots: Record<string, { cap: number; used: number }> = {
    peer_tutoring: { cap: cap.peerSlots, used: 0 },
    mock_interview: { cap: cap.mockSlots, used: 0 },
    skill_workshop: { cap: cap.workshopSlots, used: 0 },
  };

  const skipped: Skipped[] = [];
  let totalNeed = 0;
  const pool: { s: MissionStudent; cands: Candidate[] }[] = [];
  for (const s of students) {
    const cands = (["academic", "placement"] as Dimension[])
      .map((d) => candidateFor(s, d))
      .filter((c): c is Candidate => c !== null)
      .sort((a, b) => b.value - a.value || (a.dimension === "academic" ? -1 : 1));
    if (!cands.length) continue; // not at Medium/High risk: nothing to plan
    totalNeed += cands[0].value; // held-back students still count towards total need, so coverage is not flattered
    if (!s.mentor_id) skipped.push({ student_id: s.id, name: s.name, code: "no_mentor", reason: "No assigned mentor, so there is no authorised owner" });
    else if (s.identityReview) skipped.push({ student_id: s.id, name: s.name, code: "identity_review", reason: "Identity match is waiting for review; confirm it before planning support" });
    else if (s.hasActive) skipped.push({ student_id: s.id, name: s.name, code: "has_active", reason: "Already has an open intervention" });
    else {
      pool.push({ s, cands });
      if (!mentorBudget.has(s.mentor_id)) mentorBudget.set(s.mentor_id, { name: s.mentor_name ?? s.mentor_id, cap: cap.mentorHoursPerMentor * 60, used: 0 });
    }
  }
  const considered = pool.length + skipped.length;

  const order = [...pool].sort((a, b) => b.cands[0].value - a.cands[0].value || b.s.priority - a.s.priority || a.s.id.localeCompare(b.s.id));
  const fits = (mid: string, t: PlanType) =>
    t === "mentor_meeting" ? mentorBudget.get(mid)!.used + cap.meetingMinutes <= mentorBudget.get(mid)!.cap : slots[t].used + 1 <= slots[t].cap;

  const selected: Allocation[] = [];
  for (const { s, cands } of order) {
    const pick = cands.find((c) => fits(s.mentor_id!, c.type));
    if (!pick) {
      const types = [...new Set(cands.map((c) => c.type))].map((t) => (t === "mentor_meeting" ? "mentor time" : RESOURCE_LABEL[t].toLowerCase())).join(" / ");
      skipped.push({ student_id: s.id, name: s.name, code: "no_capacity", reason: `Capacity for ${types} is used up by higher-need students` });
      continue;
    }
    const mb = mentorBudget.get(s.mentor_id!)!;
    let cost: Allocation["cost"];
    let why: string;
    if (pick.type === "mentor_meeting") {
      mb.used += cap.meetingMinutes;
      cost = { resource: "mentor_minutes", amount: cap.meetingMinutes, unit: "min of mentor time" };
      why = `${mb.name} still has ${mb.cap - mb.used} of ${mb.cap} minutes free after this meeting.`;
    } else {
      slots[pick.type].used += 1;
      cost = { resource: pick.type, amount: 1, unit: "slot" };
      why = `${slots[pick.type].cap - slots[pick.type].used} of ${slots[pick.type].cap} ${RESOURCE_LABEL[pick.type].toLowerCase()} remain after this one.`;
    }
    const drivers = s.drivers[pick.dimension].slice(0, 3);
    const warnings: string[] = [];
    if (!pick.driver) warnings.push("No actionable driver in the model explanation; treat the suggested type as a starting point for a conversation.");
    if (pick.dimension === "placement") warnings.push("Placement risk applies to students on the placement track only.");
    selected.push({
      student_id: s.id,
      name: s.name,
      dimension: pick.dimension,
      type: pick.type,
      risk_prob: pick.prob,
      value: pick.value,
      owner_id: s.mentor_id!,
      owner_name: mb.name,
      cost,
      evidence: drivers.map((d) => d.text),
      driver_feature: pick.driver?.feature ?? null,
      why_feasible: why,
      warnings,
      due_date: dates.due,
      followup_date: dates.followup,
    });
  }

  const needCovered = r3(selected.reduce((a, x) => a + x.value, 0));

  const isHigh = (s: MissionStudent) => s.academic_level === "High" || (s.intent === "placement" && s.placement_level === "High");
  const consideredIds = new Set([...pool.map((p) => p.s.id), ...skipped.map((k) => k.student_id)]);
  const highIds = new Set(students.filter((s) => consideredIds.has(s.id) && isHigh(s)).map((s) => s.id));
  const highCovered = selected.filter((a) => highIds.has(a.student_id)).length;

  // comparison: the existing manual order (priority score, highest first) given the same capacity, taking each
  // student's top candidate only and not looking for an alternative when it does not fit
  const b = { mentor: new Map<string, number>(), slots: { peer_tutoring: 0, mock_interview: 0, skill_workshop: 0 } as Record<string, number> };
  let bSel = 0, bNeed = 0, bHigh = 0;
  for (const { s, cands } of [...pool].sort((x, y) => y.s.priority - x.s.priority || x.s.id.localeCompare(y.s.id))) {
    const c = cands[0];
    if (c.type === "mentor_meeting") {
      const u = b.mentor.get(s.mentor_id!) ?? 0;
      if (u + cap.meetingMinutes > cap.mentorHoursPerMentor * 60) continue;
      b.mentor.set(s.mentor_id!, u + cap.meetingMinutes);
    } else {
      if (b.slots[c.type] + 1 > slots[c.type].cap) continue;
      b.slots[c.type] += 1;
    }
    bSel++;
    bNeed += c.value;
    if (highIds.has(s.id)) bHigh++;
  }

  const group = (name: string, key: (s: MissionStudent) => string) => {
    const g = new Map<string, { e: number; s: number }>();
    const sel = new Set(selected.map((a) => a.student_id));
    for (const s of students) {
      if (!consideredIds.has(s.id)) continue;
      const k = `${name} ${key(s)}`;
      const v = g.get(k) ?? { e: 0, s: 0 };
      v.e++;
      if (sel.has(s.id)) v.s++;
      g.set(k, v);
    }
    return [...g.entries()].sort().map(([group, v]) => ({ group, eligible: v.e, selected: v.s, rate: v.e ? v.s / v.e : 0, comparable: v.e >= 10, note: "" }));
  };
  const overall = considered ? selected.length / considered : 0;
  const fairness = [...group("Branch", (s) => s.branch), ...group("Year", (s) => String(s.year))].map((f) => ({
    ...f,
    note: !f.comparable ? "Fewer than 10 eligible students: too small to compare" : Math.abs(f.rate - overall) > 0.15 ? "Selection rate differs from the overall rate by more than 15 points: review" : "Within 15 points of the overall rate",
  }));

  const usage: Plan["usage"] = [
    { resource: "mentor_minutes", label: "Mentor time (all mentors)", used: [...mentorBudget.values()].reduce((a, m) => a + m.used, 0), capacity: [...mentorBudget.values()].reduce((a, m) => a + m.cap, 0), unit: "min" },
    ...(["peer_tutoring", "mock_interview", "skill_workshop"] as const).map((t) => ({ resource: t, label: RESOURCE_LABEL[t], used: slots[t].used, capacity: slots[t].cap, unit: "slots" })),
  ];
  return {
    selected: selected.sort((a, b2) => b2.value - a.value || a.student_id.localeCompare(b2.student_id)),
    skipped: skipped.sort((a, b2) => a.student_id.localeCompare(b2.student_id)),
    considered,
    usage,
    mentorUsage: [...mentorBudget.entries()].map(([mentor_id, m]) => ({ mentor_id, mentor_name: m.name, usedMinutes: m.used, capacityMinutes: m.cap })),
    needCovered,
    needTotal: r3(totalNeed),
    highPriority: { covered: highCovered, total: highIds.size },
    baseline: { selected: bSel, needCovered: r3(bNeed), highCovered: bHigh },
    fairness,
  };
}
