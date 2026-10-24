"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Loader2, Sparkles, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SEGMENT_PLAYBOOKS } from "@/lib/segment-playbooks";
import { queuePlaybookAction } from "@/app/(app)/actions";
import { campusDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface PlaybookCardActionsProps {
  persona: string;
  studentIds: string[];
}

export function PlaybookCardActions({ persona, studentIds }: PlaybookCardActionsProps) {
  const playbook = SEGMENT_PLAYBOOKS[persona];
  const [open, setOpen] = useState(false);
  const owner = playbook?.institutionalOwner || "Faculty Mentor";
  const due = campusDate(7);
  const [pending, start] = useTransition();

  if (!playbook) return null;

  const handleQueue = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      // Take up to 25 highest priority students from cohort to queue safely
      const targetIds = studentIds.slice(0, 25);
      const res = await queuePlaybookAction({
        persona,
        intervention_type: playbook.interventionType,
        owner_name: owner,
        due_date: due,
        driver: `Playbook: ${playbook.topDrivers[0]}`,
        target_student_ids: targetIds,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to queue playbook recommendations");
        return;
      }

      toast.success(
        `Queued ${res.queued} playbook intervention${res.queued === 1 ? "" : "s"}${
          res.skipped > 0 ? ` (${res.skipped} skipped due to active duplicate)` : ""
        }`
      );
      setOpen(false);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
      <Button asChild variant="outline" size="sm">
        <Link href={`/students?persona=${encodeURIComponent(persona)}`}>
          Filter {studentIds.length} Students in Segment <ArrowRight className="size-3.5 ml-1" />
        </Link>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="default" className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Sparkles className="size-3.5 mr-1" /> Queue Playbook for Cohort
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <form onSubmit={handleQueue} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Queue Playbook: {persona}</DialogTitle>
              <DialogDescription>
                Confirm batch intervention queue for {studentIds.length} eligible students in this segment. Existing active interventions will be preserved to prevent duplicates.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-lg bg-muted/50 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prescribed Action:</span>
                <span className="font-semibold text-foreground text-right max-w-[240px]">{playbook.prescribedIntervention}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Designated Owner:</span>
                <span className="font-semibold text-foreground">{playbook.institutionalOwner}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Priority Tier:</span>
                <span className="font-semibold text-foreground">{playbook.priorityTier} ({playbook.sla})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Batch Candidate Count:</span>
                <span className="font-semibold text-foreground">{Math.min(25, studentIds.length)} students</span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-3.5 mr-1 animate-spin" />}
                Confirm & Queue Interventions
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PlaybookCardDetails({ persona }: { persona: string }) {
  const playbook = SEGMENT_PLAYBOOKS[persona];
  if (!playbook) return null;

  return (
    <div className="space-y-2.5 rounded-lg border border-brand/20 bg-brand/5 p-3.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand/10 pb-2">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <UserCheck className="size-3.5 text-brand" /> Prescriptive Institutional Playbook
        </span>
        <span
          className={cn(
            "rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            playbook.priorityTier === "P0 Critical"
              ? "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/20"
              : playbook.priorityTier === "P1 High"
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20"
              : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20"
          )}
        >
          {playbook.priorityTier} · {playbook.sla}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <div>
          <span className="text-muted-foreground block text-[11px]">Primary Predicted Risk:</span>
          <span className="font-medium text-foreground">{playbook.primaryRisk}</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[11px]">Designated Institutional Owner:</span>
          <span className="font-medium text-foreground">{playbook.institutionalOwner}</span>
        </div>
      </div>

      <div>
        <span className="text-muted-foreground block text-[11px]">Top Evidence-Supported Drivers:</span>
        <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-[11px]">
          <li>{playbook.topDrivers[0]}</li>
          <li>{playbook.topDrivers[1]}</li>
        </ul>
      </div>

      <div className="rounded bg-background/80 p-2 border border-border/50">
        <span className="text-brand font-semibold block text-[11px]">Specific Recommended Action:</span>
        <p className="font-medium text-foreground text-xs mt-0.5">{playbook.prescribedIntervention}</p>
      </div>

      <div className="flex items-center gap-1 text-[11px] text-muted-foreground italic">
        <Clock className="size-3 text-brand" /> {playbook.expectedLift}
      </div>
    </div>
  );
}
