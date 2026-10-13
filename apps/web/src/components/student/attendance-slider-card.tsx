"use client";

import { useState, useMemo, useTransition } from "react";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { calculateAttendance } from "@/lib/academic-calc";
import { saveStudentPlanAction } from "@/app/(app)/actions";
import { play } from "@/lib/sound";

interface SubjectAttendance {
  subject: string;
  attended: number;
  conducted: number;
  pct: number;
}

export function AttendanceSliderCard({
  subjects,
  studentId,
}: {
  subjects: SubjectAttendance[];
  studentId: string;
}) {
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.subject || "");
  const [futureAttended, setFutureAttended] = useState(0);
  const [futureMissed, setFutureMissed] = useState(0);
  const [requiredThreshold, setRequiredThreshold] = useState(75);
  const [safeZone, setSafeZone] = useState(80);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const currentSubjectData = useMemo(() => {
    return subjects.find((s) => s.subject === selectedSubject) || subjects[0] || {
      subject: "Selected Subject",
      attended: 30,
      conducted: 40,
      pct: 75,
    };
  }, [subjects, selectedSubject]);

  const calc = useMemo(() => {
    return calculateAttendance({
      attended: currentSubjectData.attended,
      conducted: currentSubjectData.conducted,
      requiredPct: requiredThreshold,
      safeZonePct: safeZone,
      futureAttended,
      futureMissed,
    });
  }, [currentSubjectData, requiredThreshold, safeZone, futureAttended, futureMissed]);

  function handleSavePlan() {
    play("tap");
    startTransition(async () => {
      const res = await saveStudentPlanAction({
        student_id: studentId,
        title: `Attend ${calc.classesNeededForRequired > 0 ? calc.classesNeededForRequired : futureAttended} sessions in ${currentSubjectData.subject}`,
        category: "attendance",
        target_value: {
          subject: currentSubjectData.subject,
          requiredThreshold,
          safeZone,
          classesNeeded: calc.classesNeededForRequired,
          futureAttended,
          futureMissed,
          projectedPct: calc.projectedPct,
        },
        current_value: {
          currentPct: calc.currentPct,
          attended: calc.attended,
          conducted: calc.conducted,
        },
        due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        notes: `Simulated via What-If Calculator. Projected attendance: ${calc.projectedPct}%.`,
      });

      if (res.ok) {
        play("success");
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        play("error");
      }
    });
  }

  return (
    <div className="rounded-2xl border bg-card/70 p-6 shadow-xs backdrop-blur-sm space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <span className="text-xs font-semibold text-brand tracking-wider uppercase">Interactive Simulator</span>
          <h3 className="font-display text-xl font-semibold text-foreground">Attendance Recovery & Safe Buffer</h3>
          <p className="text-xs text-muted-foreground">
            Explore future lecture scenarios to recover from attendance deficits or build a safety cushion.
          </p>
        </div>

        {/* Subject Selector */}
        <div className="w-full sm:w-64">
          <select
            value={selectedSubject}
            onChange={(e) => {
              play("tap");
              setSelectedSubject(e.target.value);
              setFutureAttended(0);
              setFutureMissed(0);
            }}
            className="w-full h-10 rounded-xl border bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-ring"
          >
            {subjects.map((s) => (
              <option key={s.subject} value={s.subject}>
                {s.subject} ({s.pct}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-muted/20 p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">Current Attendance</p>
          <p className="font-display text-2xl font-bold text-foreground">{calc.currentPct}%</p>
          <p className="text-[10px] text-muted-foreground">
            {calc.attended} / {calc.conducted} classes conducted
          </p>
        </div>

        <div className="rounded-xl border bg-muted/20 p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">Projected Attendance</p>
          <p
            className={`font-display text-2xl font-bold ${
              calc.projectedPct >= safeZone
                ? "text-risk-low"
                : calc.projectedPct >= requiredThreshold
                ? "text-foreground"
                : "text-risk-high"
            }`}
          >
            {calc.projectedPct}%
          </p>
          <p className="text-[10px] text-muted-foreground">
            +{futureAttended} attended, +{futureMissed} missed
          </p>
        </div>

        <div className="rounded-xl border bg-muted/20 p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">Classes to Hit {requiredThreshold}%</p>
          <p
            className={`font-display text-2xl font-bold ${
              calc.classesNeededForRequired === 0 ? "text-risk-low" : "text-risk-high"
            }`}
          >
            {calc.classesNeededForRequired}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {calc.classesNeededForRequired === 0 ? "Threshold satisfied" : "Consecutive future sessions"}
          </p>
        </div>

        <div className="rounded-xl border bg-muted/20 p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">Permissible Missed Classes</p>
          <p className="font-display text-2xl font-bold text-brand">{calc.allowedAbsencesAtTarget}</p>
          <p className="text-[10px] text-muted-foreground">Remaining buffer at {requiredThreshold}%</p>
        </div>
      </div>

      {/* Dynamic Calculated Insight Callout */}
      <div
        className={`rounded-xl border p-4 flex items-start gap-3 ${
          calc.status === "critically_low" || calc.status === "below_target"
            ? "border-risk-high/30 bg-risk-high/5 text-risk-high"
            : "border-risk-low/30 bg-risk-low/5 text-risk-low"
        }`}
      >
        {calc.status === "critically_low" || calc.status === "below_target" ? (
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
        )}
        <div className="space-y-1">
          <p className="text-sm font-semibold">{calc.message}</p>
          <p className="text-xs opacity-90">{calc.safeMessage}</p>
          <p className="text-xs opacity-80">{calc.absenceMessage}</p>
        </div>
      </div>

      {/* Interactive Scenario Sliders */}
      <div className="grid gap-6 pt-2 sm:grid-cols-2">
        <div className="rounded-xl border bg-background/50 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Future Classes to Attend (x)</span>
            <span className="font-mono font-bold text-brand text-sm">+{futureAttended}</span>
          </div>
          <Slider
            value={[futureAttended]}
            min={0}
            max={30}
            step={1}
            onValueChange={([val]) => {
              play("tick");
              setFutureAttended(val);
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            Drag to simulate attending up to 30 forthcoming lectures.
          </p>
        </div>

        <div className="rounded-xl border bg-background/50 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Planned Missed Classes (y)</span>
            <span className="font-mono font-bold text-risk-high text-sm">+{futureMissed}</span>
          </div>
          <Slider
            value={[futureMissed]}
            min={0}
            max={15}
            step={1}
            onValueChange={([val]) => {
              play("tick");
              setFutureMissed(val);
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            Drag to evaluate how planned absences will impact your percentage.
          </p>
        </div>
      </div>

      {/* Target Configuration & Save Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t pt-4">
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1.5 font-medium text-muted-foreground">
            Required Threshold:
            <select
              value={requiredThreshold}
              onChange={(e) => setRequiredThreshold(Number(e.target.value))}
              className="h-8 rounded-lg border bg-background px-2 text-xs font-semibold text-foreground"
            >
              <option value={75}>75% (Official)</option>
              <option value={70}>70%</option>
              <option value={80}>80%</option>
            </select>
          </label>

          <label className="flex items-center gap-1.5 font-medium text-muted-foreground">
            Safe Zone:
            <select
              value={safeZone}
              onChange={(e) => setSafeZone(Number(e.target.value))}
              className="h-8 rounded-lg border bg-background px-2 text-xs font-semibold text-foreground"
            >
              <option value={80}>80% Safe Buffer</option>
              <option value={85}>85% Strong Buffer</option>
              <option value={90}>90% Honors Zone</option>
            </select>
          </label>
        </div>

        <Button
          onClick={handleSavePlan}
          disabled={pending}
          className="press h-10 rounded-xl px-5 text-xs font-medium"
        >
          {savedSuccess ? (
            <>
              <CheckCircle2 className="mr-1.5 size-4 text-risk-low" />
              Scenario Saved to Plan
            </>
          ) : (
            <>
              <Sparkles className="mr-1.5 size-4" />
              Save Scenario as Target Plan
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
