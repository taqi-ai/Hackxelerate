"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCheck, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, Panel, Stat } from "@/components/kit";
import { INTERVENTION_LABEL } from "@/lib/format";
import {
  buildPlan,
  CAPACITY_BOUNDS,
  DEFAULT_CAPACITY,
  validateCapacity,
  type Capacity,
  type MissionStudent,
} from "@/lib/mission-control";
import { approveMissionPlan } from "./actions";

const pct = (n: number) => `${Math.round(n * 100)}%`;

function scaled(c: Capacity, f: number): Capacity {
  return {
    mentorHoursPerMentor: Math.round(c.mentorHoursPerMentor * f * 2) / 2,
    meetingMinutes: c.meetingMinutes,
    peerSlots: Math.round(c.peerSlots * f),
    mockSlots: Math.round(c.mockSlots * f),
    workshopSlots: Math.round(c.workshopSlots * f),
  };
}

export function MissionControl({ students, role, mentors, dates }: { students: MissionStudent[]; role: "admin" | "mentor"; mentors: number; dates: { due: string; followup: string } }) {
  const [raw, setRaw] = useState<Record<keyof Capacity, string>>(() =>
    Object.fromEntries(Object.entries(DEFAULT_CAPACITY).map(([k, v]) => [k, String(v)])) as Record<keyof Capacity, string>,
  );
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  const parsed = useMemo(() => validateCapacity(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v.trim() === "" ? NaN : Number(v)]))), [raw]);
  const cap = parsed.ok ? parsed.value : null;
  const plan = useMemo(() => (cap ? buildPlan(students, cap, dates) : null), [students, cap, dates]);
  const scenarios = useMemo(
    () => (cap ? ([0.5, 0.75, 1, 1.25, 1.5] as const).map((f) => ({ f, c: scaled(cap, f), p: buildPlan(students, scaled(cap, f), dates) })) : []),
    [students, cap, dates],
  );
  const chosen = plan ? plan.selected.filter((a) => !skip.has(a.student_id)) : [];

  function approve() {
    if (!cap) return;
    setResult(null);
    start(async () => {
      const r = await approveMissionPlan({ capacity: cap, student_ids: chosen.map((a) => a.student_id) });
      if (r.ok) {
        const msg = `${r.created} intervention${r.created === 1 ? "" : "s"} created${r.existing ? `, ${r.existing} already existed` : ""}.`;
        toast.success(msg);
        setResult(msg);
        setOpen(false);
      } else {
        const msg = `${r.error}. Created ${r.created}${r.existing ? `, already existed ${r.existing}` : ""}. ${r.failed.slice(0, 3).map((f) => `${f.student_id}: ${f.error}`).join("; ")}`;
        toast.error(msg);
        setResult(msg);
      }
    });
  }

  return (
    <div className="space-y-6">
      <p className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <strong className="text-foreground">Planning scenario, not a prediction.</strong> The plan is a transparent greedy heuristic, not a
        guaranteed-optimal schedule. Coverage figures count students and risk weight; they do not forecast recovery. Capacity numbers
        below are <strong>illustrative assumptions</strong> for the synthetic cohort. {role === "mentor" ? "You see only your own students." : `${mentors} mentors are in scope.`}
      </p>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Panel title="Weekly capacity" description="Edit any number; the plan recomputes instantly." className="h-fit lg:sticky lg:top-20">
          <form className="space-y-3" onSubmit={(e) => e.preventDefault()} aria-label="Weekly capacity">
            {(Object.keys(CAPACITY_BOUNDS) as (keyof Capacity)[]).map((k) => {
              const b = CAPACITY_BOUNDS[k];
              return (
                <div key={k} className="space-y-1">
                  <Label htmlFor={`cap-${k}`}>{b.label}</Label>
                  <Input
                    id={`cap-${k}`}
                    inputMode="decimal"
                    value={raw[k]}
                    onChange={(e) => setRaw((r) => ({ ...r, [k]: e.target.value }))}
                    aria-describedby={`cap-${k}-hint`}
                  />
                  <p id={`cap-${k}-hint`} className="text-xs text-muted-foreground">
                    {b.min} to {b.max}
                    {b.integer ? ", whole number" : ""}
                  </p>
                </div>
              );
            })}
            {!parsed.ok && (
              <p role="alert" className="text-sm text-risk-high">
                {parsed.error}
              </p>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => setRaw(Object.fromEntries(Object.entries(DEFAULT_CAPACITY).map(([k, v]) => [k, String(v)])) as Record<keyof Capacity, string>)}>
              <RotateCcw className="size-3.5" aria-hidden /> Reset to defaults
            </Button>
          </form>
        </Panel>

        <div className="space-y-4">
          {!plan ? (
            <EmptyState title="Fix the capacity values">Enter valid numbers on the left to build a plan.</EmptyState>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Students considered" value={plan.considered} hint="Medium or High risk" />
                <Stat label="Selected for support" value={plan.selected.length} tone="brand" hint={`${plan.selected.length} of ${plan.considered}`} />
                <Stat label="Need covered" value={plan.needTotal ? pct(plan.needCovered / plan.needTotal) : "0%"} hint="risk-weighted, not a forecast" />
                <Stat
                  label="High-risk students covered"
                  value={`${plan.highPriority.covered}/${plan.highPriority.total}`}
                  tone={plan.highPriority.covered === plan.highPriority.total ? "low" : "medium"}
                />
              </div>

              <Panel title="Capacity used and remaining" description="Every selected action draws from one of these. None can go over.">
                <ul className="space-y-3">
                  {plan.usage.map((u) => (
                    <li key={u.resource} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{u.label}</span>
                        <span className="tabular text-muted-foreground">
                          {u.used} of {u.capacity} {u.unit} used, {u.capacity - u.used} remaining
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted" role="img" aria-label={`${u.label}: ${u.used} of ${u.capacity} used`}>
                        <div className="h-full rounded-full bg-brand/80" style={{ width: `${u.capacity ? Math.min(100, (u.used / u.capacity) * 100) : 0}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel
                title="Recommended plan"
                description={`Ranked by risk-weighted need. Follow-up proposed for ${dates.followup}; first contact due ${dates.due}.`}
                action={
                  <Button onClick={() => setOpen(true)} disabled={!chosen.length || pending}>
                    <CheckCheck className="size-4" aria-hidden /> Review and approve ({chosen.length})
                  </Button>
                }
              >
                {result && (
                  <p role="status" className="mb-3 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
                    {result}
                  </p>
                )}
                {!plan.selected.length ? (
                  <EmptyState title="No recommendations">With this capacity nothing fits, or no eligible students remain. See the reasons below.</EmptyState>
                ) : (
                  <ol className="space-y-2">
                    {plan.selected.map((a) => (
                      <li key={a.student_id} className="rounded-xl border p-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`sel-${a.student_id}`}
                            checked={!skip.has(a.student_id)}
                            onCheckedChange={(v) =>
                              setSkip((s) => {
                                const n = new Set(s);
                                if (v) n.delete(a.student_id);
                                else n.add(a.student_id);
                                return n;
                              })
                            }
                            aria-label={`Include ${a.name} in the approval`}
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-baseline gap-x-2">
                              <Link href={`/students/${a.student_id}`} className="font-medium underline-offset-2 hover:underline">
                                {a.name}
                              </Link>
                              <span className="text-xs text-muted-foreground">{a.student_id}</span>
                            </div>
                            <p className="text-sm">
                              <strong>{INTERVENTION_LABEL[a.type]}</strong> for <strong>{a.dimension}</strong> risk ({pct(a.risk_prob)}), owner {a.owner_name}, cost {a.cost.amount} {a.cost.unit}
                            </p>
                            <details className="text-sm text-muted-foreground">
                              <summary className="cursor-pointer text-foreground">Why this student, why this action</summary>
                              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                                {a.evidence.length ? a.evidence.map((e, i) => <li key={i}>{e}</li>) : <li>No driver detail available.</li>}
                                <li>Feasible: {a.why_feasible}</li>
                                <li>
                                  Due {a.due_date}, follow-up review {a.followup_date}
                                </li>
                                <li>
                                  Rank value {a.value.toFixed(3)} = {a.dimension} risk × (0.5 + 0.5 × share of actionable drivers)
                                </li>
                                {a.warnings.map((w, i) => (
                                  <li key={i} className="text-risk-medium">
                                    {w}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </Panel>

              <Panel title="Not selected, and why" description="Students at Medium or High risk who did not get an action this week.">
                {plan.skipped.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Everyone considered is in the plan.</p>
                ) : (
                  <>
                    <p className="mb-2 text-sm text-muted-foreground">
                      {(["no_capacity", "has_active", "identity_review", "no_mentor"] as const)
                        .map((code) => ({ code, n: plan.skipped.filter((s) => s.code === code).length }))
                        .filter((x) => x.n)
                        .map((x) => `${x.n} ${{ no_capacity: "out of capacity", has_active: "already have an open intervention", identity_review: "need identity review (data-quality exception)", no_mentor: "have no assigned mentor" }[x.code]}`)
                        .join(" · ")}
                    </p>
                    <details>
                      <summary className="cursor-pointer text-sm">Show the first 50</summary>
                      <ul className="mt-2 space-y-1 text-sm">
                        {plan.skipped.slice(0, 50).map((s) => (
                          <li key={s.student_id}>
                            <Link href={`/students/${s.student_id}`} className="underline-offset-2 hover:underline">
                              {s.name}
                            </Link>{" "}
                            <span className="text-muted-foreground">{s.reason}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </>
                )}
              </Panel>

              <Panel title="Scenario comparison" description="Same students, different capacity. Counts only; no outcome is predicted.">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Plan size at different capacity levels</caption>
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th scope="col" className="py-1 pr-3 font-medium">Capacity</th>
                        <th scope="col" className="py-1 pr-3 font-medium">Mentor h each</th>
                        <th scope="col" className="py-1 pr-3 font-medium">Selected</th>
                        <th scope="col" className="py-1 pr-3 font-medium">Need covered</th>
                        <th scope="col" className="py-1 font-medium">High-risk covered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarios.map(({ f, c, p }) => (
                        <tr key={f} className={f === 1 ? "font-medium" : ""}>
                          <th scope="row" className="py-1 pr-3 text-left font-normal">{f === 1 ? "Current" : f < 1 ? `${Math.round((1 - f) * 100)}% less` : `${Math.round((f - 1) * 100)}% more`}</th>
                          <td className="tabular py-1 pr-3">{c.mentorHoursPerMentor}</td>
                          <td className="tabular py-1 pr-3">{p.selected.length}</td>
                          <td className="tabular py-1 pr-3">{p.needTotal ? pct(p.needCovered / p.needTotal) : "0%"}</td>
                          <td className="tabular py-1">{p.highPriority.covered}/{p.highPriority.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Against the manual order (existing priority score, same capacity, each student&apos;s first choice only): manual order selects {plan.baseline.selected} students
                  and covers {plan.baseline.highCovered} high-risk; this plan selects {plan.selected.length} and covers {plan.highPriority.covered}. A count comparison on a synthetic cohort, not evidence of better outcomes.
                </p>
              </Panel>

              <Panel title="Selection by group" description="Share of considered students who received an action. Descriptive; groups under 10 are not compared.">
                <ul className="grid gap-1 text-sm sm:grid-cols-2">
                  {plan.fairness.map((f) => (
                    <li key={f.group} className="flex justify-between gap-2">
                      <span>{f.group}</span>
                      <span className="tabular text-muted-foreground" title={f.note}>
                        {f.selected}/{f.eligible} {f.comparable ? `(${pct(f.rate)})` : "(too few)"}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve {chosen.length} intervention{chosen.length === 1 ? "" : "s"}?</DialogTitle>
            <DialogDescription>
              This creates real intervention records (status open) owned by each student&apos;s mentor, with today&apos;s score and risk saved as the baseline. Students you
              unticked are left out. Records you do not approve are never saved. Approving twice will not create duplicates.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button onClick={approve} disabled={pending || !chosen.length}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Approve and create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
