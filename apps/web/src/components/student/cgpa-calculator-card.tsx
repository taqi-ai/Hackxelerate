"use client";

import { toast } from "sonner";

import { useState, useMemo, useTransition } from "react";
import { AlertCircle, CheckCircle2, Sparkles, BookOpen } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { calculateCGPAScenario, calculateSGPA } from "@/lib/academic-calc";
import { saveStudentPlanAction } from "@/app/(app)/actions";
import { play } from "@/lib/sound";
import { campusDate } from "@/lib/dates";

export interface CGPASubjectInput {
  subject: string;
  credits: number;
  gradePoint: number;
}

export function CGPACalculatorCard({
  studentId,
  currentCGPA,
  completedCredits = 80,
  currentSemesterCredits = 20,
  subjects = [],
}: {
  studentId: string;
  currentCGPA: number;
  completedCredits?: number;
  currentSemesterCredits?: number;
  subjects?: { subject: string; credits?: number }[];
}) {
  const [targetCGPA, setTargetCGPA] = useState<number>(
    Math.min(10.0, Number((currentCGPA + 0.5).toFixed(1)))
  );

  // Default subject credits mapping
  const initialSubjects: CGPASubjectInput[] = useMemo(() => {
    if (subjects.length > 0) {
      return subjects.map((s) => ({
        subject: s.subject,
        credits: s.credits ?? 4,
        gradePoint: 8, // Default Grade B+
      }));
    }
    return [
      { subject: "Core Course 1", credits: 4, gradePoint: 8 },
      { subject: "Core Course 2", credits: 4, gradePoint: 8 },
      { subject: "Elective 1", credits: 4, gradePoint: 7 },
      { subject: "Elective 2", credits: 4, gradePoint: 8 },
      { subject: "Laboratory Practice", credits: 4, gradePoint: 9 },
    ];
  }, [subjects]);

  const [subjectList, setSubjectList] = useState<CGPASubjectInput[]>(initialSubjects);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  // Dynamic semester SGPA computed from individual subject grade points
  const interactiveSGPA = useMemo(() => {
    return calculateSGPA(subjectList);
  }, [subjectList]);

  // Overall scenario calculations
  const scenario = useMemo(() => {
    return calculateCGPAScenario({
      currentCGPA,
      completedCredits,
      currentSemesterCredits,
      targetCGPA,
      semesterSubjects: subjectList.map((s) => ({
        subject: s.subject,
        credits: s.credits,
        targetGradePoint: s.gradePoint,
      })),
    });
  }, [currentCGPA, completedCredits, currentSemesterCredits, targetCGPA, subjectList]);

  function handleGradeChange(index: number, newPoint: number) {
    play("tap");
    setSubjectList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], gradePoint: newPoint };
      return updated;
    });
  }

  function handleSavePlan() {
    play("tap");
    startTransition(async () => {
      const res = await saveStudentPlanAction({
        student_id: studentId,
        title: `Achieve CGPA ${targetCGPA} (Target SGPA ${interactiveSGPA})`,
        category: "cgpa",
        target_value: {
          targetCGPA,
          requiredSGPA: scenario.requiredSGPA,
          projectedSGPA: interactiveSGPA,
          projectedCGPA: scenario.projectedCGPA,
          subjectList,
        },
        current_value: {
          currentCGPA,
          completedCredits,
          currentSemesterCredits,
        },
        due_date: campusDate(60),
        notes: `Simulated via SGPA/CGPA Planner. Planned semester SGPA: ${interactiveSGPA}, yielding cumulative CGPA: ${scenario.projectedCGPA}.`,
      });

      if (res.ok) {
        play("success");
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        play("error");
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="rounded-2xl border bg-card/70 p-6 shadow-xs backdrop-blur-sm space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <span className="text-xs font-semibold text-brand tracking-wider uppercase">Academic Projection</span>
          <h3 className="font-display text-xl font-semibold text-foreground">SGPA & CGPA Goal Planner</h3>
          <p className="text-xs text-muted-foreground">
            Simulate course grade points to reach your target cumulative grade point average this semester.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border bg-background/80 px-3.5 py-2 text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Current CGPA</span>
            <span className="font-mono text-lg font-bold text-foreground">{currentCGPA.toFixed(2)}</span>
          </div>
          <div className="rounded-xl border bg-background/80 px-3.5 py-2 text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Completed Credits</span>
            <span className="font-mono text-lg font-bold text-foreground">{completedCredits}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Target Slider & Mathematical Summary */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-xl border p-4 bg-background/50 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Target Cumulative CGPA</Label>
              <span className="font-mono text-2xl font-bold text-brand">{targetCGPA.toFixed(2)}</span>
            </div>

            <Slider
              min={Math.max(4.0, Number((currentCGPA - 0.5).toFixed(1)))}
              max={10.0}
              step={0.05}
              value={[targetCGPA]}
              onValueChange={([val]) => setTargetCGPA(Number(val.toFixed(2)))}
              className="py-2"
            />

            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Min Realistic: {Math.max(4.0, Number((currentCGPA - 0.5).toFixed(1)))}</span>
              <span>Max: 10.00</span>
            </div>
          </div>

          {/* Feasibility Indicator */}
          <div
            className={`rounded-xl border p-4 space-y-2.5 ${
              scenario.isAchievable
                ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200"
                : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                {scenario.isAchievable ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                )}
                <span>Required Semester SGPA</span>
              </span>
              <span className="font-mono text-base font-bold">
                {scenario.requiredSGPA > 0 ? scenario.requiredSGPA.toFixed(2) : "0.00"}
              </span>
            </div>

            <p className="text-xs leading-relaxed">
              {scenario.isAchievable ? (
                <>
                  To raise your cumulative CGPA from <strong>{currentCGPA.toFixed(2)}</strong> to{" "}
                  <strong>{targetCGPA.toFixed(2)}</strong> across this semester&#39;s {currentSemesterCredits} credits, you need
                  a minimum semester SGPA of <strong>{scenario.requiredSGPA.toFixed(2)}</strong>.
                </>
              ) : (
                <>
                  Target requires an SGPA of <strong>{scenario.requiredSGPA.toFixed(2)}</strong> (which exceeds the 10.00 scale).
                  Even with a perfect 10.00 SGPA this semester, your maximum achievable cumulative CGPA is{" "}
                  <strong>
                    {(
                      (completedCredits * currentCGPA + currentSemesterCredits * 10.0) /
                      (completedCredits + currentSemesterCredits)
                    ).toFixed(2)}
                  </strong>
                  .
                </>
              )}
            </p>
          </div>

          {/* Interactive Projection Card */}
          <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Configured Grade Projection
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-background p-3 border">
                <span className="text-[11px] text-muted-foreground block">Simulated SGPA</span>
                <span className="font-mono text-2xl font-bold text-foreground">{interactiveSGPA.toFixed(2)}</span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Based on selections below</span>
              </div>
              <div className="rounded-lg bg-background p-3 border">
                <span className="text-[11px] text-muted-foreground block">Projected CGPA</span>
                <span className="font-mono text-2xl font-bold text-brand">{scenario.projectedCGPA.toFixed(2)}</span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  {scenario.projectedCGPA >= targetCGPA ? "Hits or exceeds target" : "Short of target"}
                </span>
              </div>
            </div>

            <Button
              onClick={handleSavePlan}
              disabled={pending}
              className="w-full flex items-center justify-center gap-2 bg-brand text-brand-foreground hover:bg-brand/90 mt-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>{pending ? "Saving Target..." : savedSuccess ? "Target Saved to Plan!" : "Commit Target to My Plan"}</span>
            </Button>
          </div>
        </div>

        {/* Right Column: Course by Course Grade Point Allocator */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-brand" />
              <span>Current Semester Courses & Expected Grades</span>
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Total Credits: {subjectList.reduce((acc, s) => acc + s.credits, 0)}
            </span>
          </div>

          <div className="space-y-2.5">
            {subjectList.map((subj, index) => {
              return (
                <div
                  key={subj.subject}
                  className="rounded-xl border bg-background/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{subj.subject}</p>
                    <span className="text-xs text-muted-foreground font-mono">{subj.credits} Credits</span>
                  </div>

                  {/* Grade Point Select Buttons */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                    {[
                      { grade: "A+", pt: 10 },
                      { grade: "A", pt: 9 },
                      { grade: "B+", pt: 8 },
                      { grade: "B", pt: 7 },
                      { grade: "C", pt: 6 },
                      { grade: "P", pt: 4 },
                    ].map((btn) => {
                      const isSelected = subj.gradePoint === btn.pt;
                      return (
                        <button
                          key={btn.grade}
                          type="button"
                          onClick={() => handleGradeChange(index, btn.pt)}
                          className={`px-2.5 py-1 text-xs rounded-md font-mono font-medium transition-all ${
                            isSelected
                              ? "bg-brand text-brand-foreground shadow-xs font-bold"
                              : "border bg-background hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {btn.grade}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
