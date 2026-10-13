"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { play } from "@/lib/sound";
import { getPrefs } from "@/lib/prefs";
import { CalendarPlus, Clock, Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, RiskBadge, ScoreValue } from "@/components/kit";
import { INTERVENTION_LABEL } from "@/lib/format";
import { createIntervention } from "@/app/(app)/actions";
import { toast } from "sonner";
import type { StudentRow } from "@/lib/types";
import { campusDate } from "@/lib/dates";

const ALERT_TO_TYPE: Record<string, string> = {
  silent_decliner: "mentor_meeting",
  lms_silent: "mentor_meeting",
  core_attendance: "mentor_meeting",
  attendance_drop: "mentor_meeting",
  backlogs: "peer_tutoring",
  no_mock: "mock_interview",
  assignments: "peer_tutoring",
};

function inDays(n: number) {
  return campusDate(n);
}

/** minutes a meeting is likely to need: more for high risk and for several alerts */
function minutesFor(r: StudentRow) {
  const base = r.academic_risk_level === "High" || r.placement_risk_level === "High" ? 40 : 25;
  return base + Math.min(10, 5 * Math.max(0, r.alerts.length - 1));
}

export function Planner({ rows }: { rows: StudentRow[] }) {
  const [hours, setHours] = useState(3);
  // start from the default set in Settings (read after mount: it lives in this browser only)
  useEffect(() => setHours(getPrefs().hours), []);

  const [scheduleTarget, setScheduleTarget] = useState<{
    student: StudentRow;
    type: string;
    driver: string | null;
  } | null>(null);

  const [owner, setOwner] = useState("Prof. Eiravati Manne");
  const [due, setDue] = useState(inDays(3));
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const plan = useMemo(() => {
    const budget = hours * 60;
    // value per minute: greedy knapsack on priority / minutes, then show in priority order
    const scored = rows.map((r) => ({ r, m: minutesFor(r), value: r.priority / minutesFor(r) })).sort((a, b) => b.value - a.value);
    const picked: typeof scored = [];
    let used = 0;
    for (const s of scored) {
      if (used + s.m <= budget) {
        picked.push(s);
        used += s.m;
      }
    }
    picked.sort((a, b) => b.r.priority - a.r.priority);
    const covered = picked.reduce((a, b) => a + b.r.priority, 0);
    const total = rows.reduce((a, b) => a + b.priority, 0);
    return { picked, used, share: total ? covered / total : 0 };
  }, [rows, hours]);

  function submitSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleTarget) return;
    setErr(null);
    start(async () => {
      const res = await createIntervention({
        student_id: scheduleTarget.student.id,
        type: scheduleTarget.type as any,
        driver: scheduleTarget.driver,
        owner_name: owner,
        due_date: due,
        notes: notes.trim() || undefined,
      });
      if (!res.ok) {
        play("error");
        setErr(res.error);
        return;
      }
      play("success");
      toast.success(`Check-in scheduled for ${scheduleTarget.student.name} on ${due}`);
      setScheduleTarget(null);
      setNotes("");
    });
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="h-fit space-y-5 rounded-xl border bg-card p-5 lg:sticky lg:top-20">
          <div className="space-y-1">
            <label htmlFor="hours" className="text-sm font-medium">
              Hours available this week
            </label>
            <p className="tabular text-4xl font-semibold tracking-tight">{hours}h</p>
          </div>
          <Slider
            id="hours"
            min={1}
            max={10}
            step={0.5}
            value={[hours]}
            onValueChange={([v]) => {
              play("tick");
              setHours(v);
            }}
            aria-label="Hours available"
          />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Meetings</dt>
              <dd className="tabular text-xl font-semibold">{plan.picked.length}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Time planned</dt>
              <dd className="tabular text-xl font-semibold">{(plan.used / 60).toFixed(1)}h</dd>
            </div>
          </dl>
          <p className="text-xs leading-relaxed text-muted-foreground">
            These meetings cover {(plan.share * 100).toFixed(0)}% of the total priority among the 80 highest-priority students. Meeting length is
            estimated at 25 to 50 minutes from risk level and number of alerts.
          </p>
        </aside>

        <section aria-label="Suggested meetings">
          {plan.picked.length === 0 ? (
            <EmptyState icon={Clock} title="Not enough time for a single meeting">
              Increase the hours available to see who to meet first.
            </EmptyState>
          ) : (
            <ol className="divide-y rounded-xl border bg-card">
              {plan.picked.map(({ r, m }, i) => {
                const a = r.alerts[0];
                const type = a ? ALERT_TO_TYPE[a.type] : r.placement_risk_level === "High" ? "mock_interview" : "mentor_meeting";
                return (
                  <li key={r.id} className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent/40 sm:px-5">
                    <Link href={`/students/${r.id}`} className="grid grid-cols-[2rem_1fr] items-center gap-3 min-w-0 flex-1">
                      <span className="tabular text-sm text-muted-foreground">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-medium">{r.name}</span>
                          <ScoreValue score={r.success_score} className="text-sm" />
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">{a?.text ?? r.persona}</span>
                        <span className="mt-1 block text-xs text-brand">
                          Suggested: {INTERVENTION_LABEL[type]} · about {m} min
                        </span>
                      </span>
                    </Link>

                    <div className="flex shrink-0 items-center gap-3">
                      <div className="flex flex-col items-end gap-1">
                        <RiskBadge level={r.academic_risk_level} label="Acad." />
                        {r.placement_risk_level !== "N/A" && <RiskBadge level={r.placement_risk_level} label="Place." />}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs"
                        onClick={(e) => {
                          e.preventDefault();
                          play("open");
                          setScheduleTarget({ student: r, type, driver: a?.text ?? null });
                        }}
                      >
                        <CalendarPlus className="size-3.5 text-brand" />
                        <span>Schedule</span>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      {scheduleTarget && (
        <Dialog open={!!scheduleTarget} onOpenChange={(open) => !open && setScheduleTarget(null)}>
          <DialogContent>
            <form onSubmit={submitSchedule} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Schedule Check-in: {scheduleTarget.student.name}</DialogTitle>
                <DialogDescription>
                  {scheduleTarget.driver
                    ? `Addressing risk driver: ${scheduleTarget.driver}.`
                    : "Plan an intervention and track progress in Agenda and Interventions."}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-2">
                <Label htmlFor="sched-type">Intervention Type</Label>
                <Select
                  value={scheduleTarget.type}
                  onValueChange={(val) => setScheduleTarget({ ...scheduleTarget, type: val })}
                >
                  <SelectTrigger id="sched-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INTERVENTION_LABEL).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="sched-owner">Mentor / Owner</Label>
                  <Input
                    id="sched-owner"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="e.g. Prof. Eiravati Manne"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sched-due">Due Date</Label>
                  <Input
                    id="sched-due"
                    type="date"
                    value={due}
                    min={inDays(0)}
                    onChange={(e) => setDue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sched-notes">Notes & Focus Areas</Label>
                <Textarea
                  id="sched-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Factual notes on review topics, targets or action items."
                  rows={3}
                  maxLength={1000}
                />
              </div>

              {err && (
                <p role="alert" className="text-sm text-destructive font-medium">
                  {err}
                </p>
              )}

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setScheduleTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Confirm Check-in
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
