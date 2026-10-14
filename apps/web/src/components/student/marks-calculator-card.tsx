"use client";

import { useState, useMemo, useTransition } from "react";
import { AlertCircle, CheckCircle2, Calculator, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateSubjectMarkTarget, GRADE_BANDS } from "@/lib/academic-calc";
import { saveStudentPlanAction } from "@/app/(app)/actions";
import { play } from "@/lib/sound";
import { campusDate } from "@/lib/dates";

export interface SubjectMarksData {
  subject: string;
  internal: number;
  end_sem: number | null;
  credits?: number;
  sem?: number;
}

export function MarksCalculatorCard({
  subjects,
  studentId,
}: {
  subjects: SubjectMarksData[];
  studentId: string;
}) {
  const currentSemesterSubjects = useMemo(() => {
    if (!subjects || subjects.length === 0) return [];
    // Prioritize subjects where end_sem is pending/null, or the highest semester
    const maxSem = Math.max(...subjects.map((s) => s.sem ?? 1));
    const pendingOrMax = subjects.filter((s) => s.end_sem === null || s.sem === maxSem);
    return pendingOrMax.length > 0 ? pendingOrMax : subjects;
  }, [subjects]);

  const [selectedSubjectName, setSelectedSubjectName] = useState<string>(
    currentSemesterSubjects[0]?.subject || (subjects[0]?.subject ?? "")
  );

  const selectedSubject = useMemo(() => {
    return (
      currentSemesterSubjects.find((s) => s.subject === selectedSubjectName) ||
      subjects.find((s) => s.subject === selectedSubjectName) || {
        subject: "General Course",
        internal: 22,
        end_sem: null,
        credits: 4,
      }
    );
  }, [selectedSubjectName, currentSemesterSubjects, subjects]);

  const [internalScore, setInternalScore] = useState<number>(selectedSubject.internal ?? 0);
  const [targetTotal, setTargetTotal] = useState<number>(70);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  // Update internal score when switching subjects
  function handleSelectSubject(name: string) {
    setSelectedSubjectName(name);
    const sub = subjects.find((s) => s.subject === name);
    if (sub) {
      setInternalScore(sub.internal ?? 0);
    }
  }

  const result = useMemo(() => {
    return calculateSubjectMarkTarget({
      subject: selectedSubject.subject,
      credits: selectedSubject.credits ?? 4,
      internalScore,
      internalMax: 40,
      endSemScore: null,
      endSemMax: 60,
      targetTotal,
    });
  }, [selectedSubject, internalScore, targetTotal]);

  function handleSavePlan() {
    play("tap");
    startTransition(async () => {
      const res = await saveStudentPlanAction({
        student_id: studentId,
        title: `Aim for ${result.gradeBand} in ${selectedSubject.subject}`,
        category: "marks",
        target_value: {
          subject: selectedSubject.subject,
          credits: selectedSubject.credits ?? 4,
          targetTotal,
          targetGrade: result.gradeBand,
          requiredEndSemScore: result.requiredEndSemScore,
          isAchievable: result.isAchievable,
        },
        current_value: {
          internalScore,
          internalMax: 40,
        },
        due_date: campusDate(30),
        notes: `Simulated via Marks Target Planner. Need ${result.requiredEndSemScore}/60 in End Semester examination to secure ${result.gradeBand}.`,
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
          <span className="text-xs font-semibold text-brand tracking-wider uppercase">Exam Target Planner</span>
          <h3 className="font-display text-xl font-semibold text-foreground">End Semester Marks Calculator</h3>
          <p className="text-xs text-muted-foreground">
            Calculate the exact score required in your 60 mark end semester exam to hit your target grade.
          </p>
        </div>

        {/* Subject Selector */}
        <div className="w-full sm:w-64">
          <Label htmlFor="subject-picker" className="text-xs text-muted-foreground mb-1 block">
            Select Course
          </Label>
          <select
            id="subject-picker"
            value={selectedSubjectName}
            onChange={(e) => handleSelectSubject(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand"
          >
            {subjects.map((s) => (
              <option key={s.subject} value={s.subject}>
                {s.subject} (Internal: {s.internal}/40)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Inputs & Grade Selector */}
        <div className="space-y-5">
          <div>
            <Label htmlFor="internal-input" className="text-sm font-medium flex justify-between">
              <span>Internal Assessment Score</span>
              <span className="font-mono text-xs text-muted-foreground">{internalScore} / 40</span>
            </Label>
            <div className="mt-1.5 flex items-center gap-3">
              <Input
                id="internal-input"
                type="number"
                min="0"
                max="40"
                step="0.5"
                value={internalScore}
                onChange={(e) => setInternalScore(Math.min(40, Math.max(0, Number(e.target.value) || 0)))}
                className="w-28 font-mono text-base font-semibold"
              />
              {selectedSubject.internal == null && (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Not in the ERP export for this subject. Enter your own marks.</span>
              )}
              <span className="text-xs text-muted-foreground">
                Sum of Mid Semester Tests, assignments, quizzes, and continuous evaluation.
              </span>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium block mb-2">Target Grade Band</Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {GRADE_BANDS.filter((b) => b.grade !== "F").map((band) => {
                const isSelected = targetTotal === band.min;
                return (
                  <button
                    key={band.grade}
                    type="button"
                    onClick={() => {
                      play("tap");
                      setTargetTotal(band.min);
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? "border-brand bg-brand/10 text-brand shadow-xs ring-1 ring-brand font-semibold"
                        : "border-border hover:border-brand/40 hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <span className="text-base font-bold">{band.grade}</span>
                    <span className="text-[10px] text-muted-foreground">{band.min}+ pts</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Calculator className="h-4 w-4 text-brand" />
              <span>Assessment Breakdown</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-background/80 p-2 border">
                <span className="text-muted-foreground block text-[10px]">Internal (40%)</span>
                <span className="font-mono font-semibold text-foreground">{internalScore}</span>
              </div>
              <div className="rounded-lg bg-background/80 p-2 border">
                <span className="text-muted-foreground block text-[10px]">Target Total</span>
                <span className="font-mono font-semibold text-brand">{targetTotal}</span>
              </div>
              <div className="rounded-lg bg-background/80 p-2 border">
                <span className="text-muted-foreground block text-[10px]">Max Possible</span>
                <span className="font-mono font-semibold text-foreground">{(internalScore + 60).toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Simulation Result & Guidance */}
        <div className="flex flex-col justify-between space-y-4 rounded-xl border p-5 bg-background/50">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Calculation Result
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  result.isAchievable
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                }`}
              >
                {result.isAchievable ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Achievable
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3.5 w-3.5" /> Requires Adjustment
                  </>
                )}
              </span>
            </div>

            <div className="text-center py-2">
              <span className="text-xs text-muted-foreground block">Required End Semester Score</span>
              <div className="flex items-baseline justify-center gap-1 mt-1">
                <span
                  className={`font-mono text-4xl font-extrabold tracking-tight ${
                    result.isAchievable ? "text-foreground" : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {result.requiredEndSemScore !== null ? Math.max(0, result.requiredEndSemScore) : 0}
                </span>
                <span className="text-muted-foreground text-sm font-mono">/ 60</span>
              </div>
              <span className="text-xs text-muted-foreground mt-1 block">
                {result.requiredEndSemScore !== null && result.requiredEndSemScore <= 0
                  ? "Target already achieved with existing internal marks alone."
                  : `Equivalent to ${(
                      (Math.max(0, result.requiredEndSemScore ?? 0) / 60) *
                      100
                    ).toFixed(1)}% in the terminal exam.`}
              </span>
            </div>

            <div
              className={`rounded-lg p-3 text-xs leading-relaxed border ${
                result.isAchievable
                  ? "bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900"
                  : "bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900"
              }`}
            >
              {result.isAchievable ? (
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Securing {Math.max(0, result.requiredEndSemScore ?? 0)} out of 60 guarantees a total of{" "}
                    {targetTotal} points, yielding Grade <strong>{result.gradeBand}</strong> (Grade Point{" "}
                    {result.projectedGradePoint}).
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Even with a perfect 60/60 on the end semester exam, your maximum possible aggregate is{" "}
                    {(internalScore + 60).toFixed(1)}, which falls short of the {targetTotal} points needed for{" "}
                    {result.gradeBand}. Consider targeting the next achievable grade band.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleSavePlan}
              disabled={pending}
              className="w-full flex items-center justify-center gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <Sparkles className="h-4 w-4" />
              <span>{pending ? "Saving Target..." : savedSuccess ? "Target Saved to Plan!" : "Commit Target to My Plan"}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
