"use client";

import { play } from "@/lib/sound";

import { useState, useTransition } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/kit";
import { createIntervention, updateInterventionStatus } from "@/app/(app)/actions";
import { INTERVENTION_LABEL } from "@/lib/format";
import type { Intervention } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL = { open: "Open", in_progress: "In progress", done: "Done", cancelled: "Cancelled" } as const;

function inDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
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
      const r = await createIntervention({ student_id: studentId, type: type as any, driver: suggestedDriver, owner_name: owner, due_date: due, notes });
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
      title="Interventions"
      description="The action after the flag. Logged with a baseline so the effect can be measured later."
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
                <DialogDescription>{suggestedDriver ? `Suggested from the top driver: ${suggestedDriver}.` : "Pick the support that fits."}</DialogDescription>
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
            <InterventionRow key={i.id} i={i} current={current} />
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
}: {
  i: Intervention & { student_name?: string };
  current?: { success_score: number; academic_risk_prob: number } | null;
  showStudent?: boolean;
}) {
  const [pending, start] = useTransition();
  const delta = current && i.baseline ? current.academic_risk_prob - i.baseline.academic_risk_prob : null;
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {INTERVENTION_LABEL[i.type] ?? i.type}
          {showStudent && i.student_name && (
            <a href={`/students/${i.student_id}`} className="font-normal text-muted-foreground hover:underline">
              {" "}
              for {i.student_name}
            </a>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {i.owner_name} · due {i.due_date}
          {i.driver ? ` · ${i.driver}` : ""}
        </p>
        {delta !== null && Math.abs(delta) >= 0.005 && (
          <p className={cn("text-xs", delta < 0 ? "text-risk-low" : "text-risk-high")}>
            Academic risk {delta < 0 ? "down" : "up"} {Math.abs(delta * 100).toFixed(0)} pts since logged
          </p>
        )}
      </div>
      <Select
        value={i.status}
        disabled={pending}
        onValueChange={(status) =>
          start(async () => {
            const r = await updateInterventionStatus({ id: i.id, status: status as any });
            if (!r.ok) {
              play("error");
              toast.error(r.error);
            } else if (status === "done") play("success");
          })
        }
      >
        <SelectTrigger className="h-8 w-36" aria-label="Status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(STATUS_LABEL).map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </li>
  );
}
