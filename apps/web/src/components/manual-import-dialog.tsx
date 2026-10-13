"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importManualAcademicRecordAction } from "@/app/(app)/actions";
import { play } from "@/lib/sound";

export function ManualImportDialog({
  studentId,
  currentCgpa,
  currentAttendance,
  triggerText = "Manual Record Import",
  triggerVariant = "outline",
}: {
  studentId?: string;
  currentCgpa?: number;
  currentAttendance?: number;
  triggerText?: string;
  triggerVariant?: "default" | "outline" | "secondary";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rollId, setRollId] = useState(studentId || "CU24AIML0001");
  const [source, setSource] = useState("CUIMS Official Transcript Export");
  const [attendancePct, setAttendancePct] = useState(
    currentAttendance !== undefined ? String(currentAttendance) : "82.5"
  );
  const [cgpa, setCgpa] = useState(currentCgpa !== undefined ? String(currentCgpa) : "7.45");
  const [notes, setNotes] = useState("Mid-semester marks verified from student portal.");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const attNum = Number(attendancePct);
    const cgpaNum = Number(cgpa);

    if (isNaN(attNum) || attNum < 0 || attNum > 100) {
      play("error");
      setError("Attendance percentage must be a number between 0 and 100.");
      return;
    }

    if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
      play("error");
      setError("CGPA must be a valid number between 0.0 and 10.0.");
      return;
    }

    startTransition(async () => {
      const res = await importManualAcademicRecordAction({
        student_id: rollId,
        source,
        attendancePct: attNum,
        cgpa: cgpaNum,
        notes,
      });

      if (res.ok) {
        play("success");
        setOpen(false);
        router.refresh();
      } else {
        play("error");
        setError(res.error || "Failed to import record.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} className="press h-10 rounded-xl text-xs font-medium">
          <FileUp className="mr-2 size-3.5" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-6 sm:rounded-2xl">
        <DialogHeader className="space-y-1.5 pb-2">
          <DialogTitle className="font-display text-lg font-semibold">Manual Academic Record Import</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Submit verified academic and attendance numbers. All manual submissions are tagged with clear data provenance and submission timestamps.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid gap-1.5">
            <Label htmlFor="rollId" className="text-xs">Student Roll Identifier</Label>
            <Input
              id="rollId"
              value={rollId}
              onChange={(e) => setRollId(e.target.value)}
              placeholder="e.g. CU24AIML0001"
              required
              className="h-9 text-xs font-mono"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="source" className="text-xs">Verification Source</Label>
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. CUIMS Portal Grade Sheet / ERP Printout"
              required
              className="h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="att" className="text-xs">Current Attendance %</Label>
              <Input
                id="att"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={attendancePct}
                onChange={(e) => setAttendancePct(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cgpa" className="text-xs">Current CGPA</Label>
              <Input
                id="cgpa"
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes" className="text-xs">Verification Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes or semester remarks..."
              className="h-9 text-xs"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-brand" />
            <span>Records are stored under verified student provenance with cryptographic audit trail.</span>
          </div>

          <Button type="submit" disabled={pending} className="press h-10 w-full rounded-xl text-xs font-medium">
            {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-3.5" />}
            Save Verified Record
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
