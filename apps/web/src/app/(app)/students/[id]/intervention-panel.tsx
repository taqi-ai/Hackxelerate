"use client";

import { play } from "@/lib/sound";

import { useState, useTransition } from "react";
import { CalendarPlus, ClipboardCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/kit";
import { createIntervention, recordInterventionFollowup, updateInterventionStatus } from "@/app/(app)/actions";
import { INTERVENTION_LABEL } from "@/lib/format";
import type { Intervention } from "@/lib/types";
import { cn } from "@/lib/utils";
import { campusDate } from "@/lib/dates";
import { canTransition } from "@/lib/intervention-rules";

const STATUS_LABEL = { open: "Open", in_progress: "In progress", done: "Done", cancelled: "Cancelled" } as const;
const OUTCOME_LABEL = {
  improved: "Measurable Improvement",
  stable: "Stable / Maintaining",
  escalated: "Escalated for Further Review",
  unresolved: "Unresolved / Continuing Concern",
  inconclusive: "Inconclusive / More Data Needed",
} as const;

function inDays(n: number) {
  return campusDate(n);
}

export function InterventionPanel({
  studentId,
  studentName,
  interventions,
  suggestedType,
  suggestedDriver,
  current,
}: {
  studentId: string;
  studentName: string;
  interventions: Intervention[];
  suggestedType: string;
  suggestedDriver: string | null;
  current: { success_score: number; academic_risk_prob: number; placement_risk_prob: number | null };
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(suggestedType);
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState(inDays(7));
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const r = await createIntervention({
        student_id: studentId,
        type: type as any,
        driver: suggestedDriver,
        owner_name: owner,
        due_date: due,
        notes,
      });
      if (!r.ok) {
        play("error");
        setErr(r.error);
        return;
      }
      play("success");
      toast.success(`Intervention logged for ${studentName}`);
      setOpen(false);
      setNotes("");
    });
  }

  return (
    <Panel
      title="Interventions & Follow-up Tracking"
      description="Connect detection with mentorship actions. Logged with a baseline so observed changes can be evaluated during follow-up reviews."
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <CalendarPlus className="size-4" /> Plan intervention
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={submit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Plan an intervention for {studentName}</DialogTitle>
                <DialogDescription>
                  {suggestedDriver ? `Suggested from the top driver: ${suggestedDriver}.` : "Pick the support that fits."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Label htmlFor="int-type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="int-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INTERVENTION_LABEL).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                        {v === suggestedType ? " (suggested)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="int-owner">Owner</Label>
                  <Input id="int-owner" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. Prof. Manne" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="int-due">Due date</Label>
                  <Input id="int-due" type="date" value={due} min={inDays(0)} onChange={(e) => setDue(e.target.value)} required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="int-notes">Notes</Label>
                <Textarea id="int-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} />
                <p className="text-xs text-muted-foreground">Keep notes factual. Never record health or personal details here.</p>
              </div>
              {err && (
                <p role="alert" className="text-sm text-destructive">
                  {err}
                </p>
              )}
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 className="size-4 animate-spin" />} Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {interventions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No interventions yet. Plan one to close the loop on this student&apos;s flags.</p>
      ) : (
        <ul className="divide-y">
          {interventions.map((i) => (
            <InterventionRow key={i.id} i={i} current={current} studentName={studentName} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function InterventionRow({
  i,
  current,
  showStudent,
  studentName,
}: {
  i: Intervention & { student_name?: string };
  current?: { success_score: number; academic_risk_prob: number } | null;
  showStudent?: boolean;
  studentName?: string;
}) {
  const [pending, start] = useTransition();
  const [followupOpen, setFollowupOpen] = useState(false);

  // Compare follow-up or current against baseline
  const evaluatedRisk = i.followup?.academic_risk_prob ?? (current ? current.academic_risk_prob : null);
  const delta = evaluatedRisk !== null && i.baseline ? evaluatedRisk - i.baseline.academic_risk_prob : null;
  const pctChange =
    delta !== null && i.baseline && i.baseline.academic_risk_prob > 0
      ? Math.round((delta / i.baseline.academic_risk_prob) * 100)
      : null;

  return (
    <li className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">
            {INTERVENTION_LABEL[i.type] ?? i.type}
            {showStudent && i.student_name && (
              <a href={`/students/${i.student_id}`} className="font-normal text-muted-foreground hover:underline">
                {" "}
                for {i.student_name}
              </a>
            )}
          </p>
          {i.outcome && (
            <span className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              i.outcome === "improved" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
              i.outcome === "stable" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400" :
              i.outcome === "escalated" ? "bg-red-500/15 text-red-700 dark:text-red-400" :
              "bg-muted text-muted-foreground"
            )}>
              {OUTCOME_LABEL[i.outcome] ?? i.outcome}
            </span>
          )}
        </div>

        <p className="truncate text-xs text-muted-foreground">
          Assigned to <strong>{i.owner_name || "Mentor"}</strong> · Target: {i.due_date || "Not set"}
          {i.driver ? ` · Driver: ${i.driver}` : ""}
        </p>

        {/* Baseline vs Follow-up Comparison Box */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          {i.baseline && (
            <span className="rounded bg-muted/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              Baseline Risk: {(i.baseline.academic_risk_prob * 100).toFixed(0)}%
            </span>
          )}

          {i.followup ? (
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground">
                Follow-up ({i.followup.date}):
              </span>
              {i.followup.academic_risk_prob !== null && i.followup.academic_risk_prob !== undefined && (
                <span className="font-mono font-semibold text-foreground">
                  {(i.followup.academic_risk_prob * 100).toFixed(0)}%
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground italic">No follow-up logged yet</span>
          )}

          {delta !== null && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-medium text-[11px]",
                delta < 0 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-red-500/15 text-red-700 dark:text-red-400"
              )}
            >
              Observed change: {delta < 0 ? "-" : "+"}{Math.abs(delta * 100).toFixed(0)} pts
              {pctChange !== null && ` (${pctChange > 0 ? "+" : ""}${pctChange}%)`}
            </span>
          )}
        </div>

        {i.followup?.notes && (
          <p className="mt-1 text-xs text-muted-foreground italic">
            Review note: &ldquo;{i.followup.notes}&rdquo;
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 self-start sm:self-center">
        {/* Record Follow-up Action Button */}
        <FollowupDialog
          open={followupOpen}
          setOpen={setFollowupOpen}
          intervention={i}
          current={current}
          studentName={studentName || i.student_name || i.student_id}
        />

        <Select
          value={i.status}
          disabled={pending}
          onValueChange={(status) =>
            start(async () => {
              const r = await updateInterventionStatus({ id: i.id, status: status as any });
              if (!r.ok) {
                play("error");
                toast.error(r.error);
              } else if (status === "done") {
                play("success");
                toast.success("Intervention marked done. Record follow-up measurements to verify progress.");
              }
            })
          }
        >
          <SelectTrigger className="h-8 w-32 text-xs" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <SelectItem key={v} value={v} className="text-xs" disabled={!canTransition(i.status, v as keyof typeof STATUS_LABEL)}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </li>
  );
}

function FollowupDialog({
  open,
  setOpen,
  intervention: i,
  current,
  studentName,
}: {
  open: boolean;
  setOpen: (o: boolean) => void;
  intervention: Intervention;
  current?: { success_score: number; academic_risk_prob: number } | null;
  studentName: string;
}) {
  const [pending, start] = useTransition();
  const [date, setDate] = useState(campusDate(0));
  const [risk, setRisk] = useState<string>(
    i.followup?.academic_risk_prob !== undefined && i.followup?.academic_risk_prob !== null
      ? String(Math.round(i.followup.academic_risk_prob * 100))
      : current
      ? String(Math.round(current.academic_risk_prob * 100))
      : i.baseline
      ? String(Math.max(5, Math.round(i.baseline.academic_risk_prob * 100 - 15)))
      : "35"
  );
  const [score, setScore] = useState<string>(
    i.followup?.success_score !== undefined && i.followup?.success_score !== null
      ? String(Math.round(i.followup.success_score))
      : current
      ? String(Math.round(current.success_score))
      : i.baseline
      ? String(Math.min(95, Math.round(i.baseline.success_score + 8)))
      : "65"
  );
  const [attendance, setAttendance] = useState<string>(
    i.followup?.attendance_pct ? String(i.followup.attendance_pct) : "82"
  );
  const [outcome, setOutcome] = useState<string>(i.outcome || "improved");
  const [reviewDate, setReviewDate] = useState(i.review_date || campusDate(14));
  const [notes, setNotes] = useState(i.followup?.notes || "");
  const [err, setErr] = useState<string | null>(null);

  const baselineRiskPct = i.baseline ? Math.round(i.baseline.academic_risk_prob * 100) : null;
  const currentInputRisk = Number(risk) || 0;
  const deltaRisk = baselineRiskPct !== null ? currentInputRisk - baselineRiskPct : null;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const res = await recordInterventionFollowup({
        id: i.id,
        followup_date: date,
        observed_risk_prob: Number(risk) / 100,
        observed_score: Number(score) || null,
        observed_attendance: Number(attendance) || null,
        outcome: outcome as any,
        review_date: reviewDate || null,
        status: "done",
        notes: notes || null,
      });

      if (!res.ok) {
        play("error");
        setErr(res.error);
        return;
      }

      play("success");
      toast.success("Follow-up review and observed metrics recorded successfully");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
          <ClipboardCheck className="size-3.5 text-brand" />
          <span>Follow-up</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSave} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Record Follow-up Review</DialogTitle>
            <DialogDescription>
              Record post-intervention observations for {studentName} ({INTERVENTION_LABEL[i.type] ?? i.type}).
            </DialogDescription>
          </DialogHeader>

          {/* Baseline Reference Header */}
          <div className="rounded-lg border bg-muted/30 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-muted-foreground">Frozen Baseline at Logging:</span>
              <span className="font-mono text-muted-foreground">
                {i.baseline ? `Risk ${(i.baseline.academic_risk_prob * 100).toFixed(0)}% · Score ${i.baseline.success_score.toFixed(0)}` : "No baseline"}
              </span>
            </div>
            {deltaRisk !== null && (
              <p className={cn("mt-1.5 font-medium", deltaRisk < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                Observed risk change: {deltaRisk < 0 ? "" : "+"}{deltaRisk} percentage points ({deltaRisk < 0 ? "Favorable decrease" : "Increase / No change"})
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="fol-date" className="text-xs">Follow-up Review Date</Label>
              <Input id="fol-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="text-xs" />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="fol-outcome" className="text-xs">Observed Outcome</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger id="fol-outcome" className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OUTCOME_LABEL).map(([val, lbl]) => (
                    <SelectItem key={val} value={val} className="text-xs">
                      {lbl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="fol-risk" className="text-xs">Academic Risk %</Label>
              <Input
                id="fol-risk"
                type="number"
                min={0}
                max={100}
                value={risk}
                onChange={(e) => setRisk(e.target.value)}
                required
                className="text-xs font-mono"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="fol-score" className="text-xs">Success Score</Label>
              <Input
                id="fol-score"
                type="number"
                min={0}
                max={100}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="fol-att" className="text-xs">Attendance %</Label>
              <Input
                id="fol-att"
                type="number"
                min={0}
                max={100}
                value={attendance}
                onChange={(e) => setAttendance(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="fol-next" className="text-xs">Next Follow-up Review Date</Label>
            <Input id="fol-next" type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className="text-xs" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="fol-notes" className="text-xs">Review & Assessment Notes</Label>
            <Textarea
              id="fol-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record mentor observations on student engagement, tutoring attendance, and progress..."
              rows={3}
              maxLength={1000}
              className="text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Factual educational progress only. Do not record confidential medical or personal details.
            </p>
          </div>

          <p className="text-[10px] text-muted-foreground italic">
            Note: Records observed before-and-after tracking. Observational improvements reflect correlated outcomes and do not establish sole causality.
          </p>

          {err && <p className="text-xs text-destructive">{err}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending} className="gap-1.5">
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              Save Follow-up
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
