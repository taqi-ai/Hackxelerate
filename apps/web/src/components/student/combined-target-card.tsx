"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Clock,
  Sparkles,
  Target,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { calculateAttendance, calculateSubjectMarkTarget, GRADE_BANDS } from "@/lib/academic-calc";
import { saveStudentPlanAction } from "@/app/(app)/actions";
import { play } from "@/lib/sound";
import { campusDate } from "@/lib/dates";

export interface CombinedCourseData {
  subject: string;
  internal: number;
  end_sem: number | null;
  attendancePct: number;
  attended: number;
  conducted: number;
  credits?: number;
}

export function CombinedTargetCard({
  subjects,
  studentId,
}: {
  subjects: CombinedCourseData[];
  studentId: string;
}) {
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>(
    subjects[0]?.subject ?? ""
  );

  const selectedCourse = useMemo(() => {
    return (
      subjects.find((s) => s.subject === selectedSubjectName) ||
      subjects[0] || {
        subject: "Core Engineering",
        internal: 22,
        end_sem: null,
        attendancePct: 76,
        attended: 30,
        conducted: 40,
        credits: 4,
      }
    );
  }, [subjects, selectedSubjectName]);

  // Combined targets
  const [targetGradeBand, setTargetGradeBand] = useState<string>("B+");
  const [targetAttendancePct, setTargetAttendancePct] = useState<number>(80);

  // Internal breakdown weights (out of 40)
  const [mstScore, setMstScore] = useState<number>(
    Math.min(20, Math.round(selectedCourse.internal * 0.5))
  );
  const [assignmentScore, setAssignmentScore] = useState<number>(
    Math.min(12, Math.round(selectedCourse.internal * 0.3))
  );
  const [quizScore, setQuizScore] = useState<number>(
    Math.min(8, Math.round(selectedCourse.internal * 0.2))
  );

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const totalInternal = mstScore + assignmentScore + quizScore;

  // Grade target min score
  const targetMinScore = useMemo(() => {
    const band = GRADE_BANDS.find((b) => b.grade === targetGradeBand);
    return band ? band.min : 70;
  }, [targetGradeBand]);

  // Combined calculations
  const marksCalc = useMemo(() => {
    return calculateSubjectMarkTarget({
      subject: selectedCourse.subject,
      credits: selectedCourse.credits ?? 4,
      internalScore: totalInternal,
      internalMax: 40,
      endSemScore: null,
      endSemMax: 60,
      targetTotal: targetMinScore,
    });
  }, [selectedCourse, totalInternal, targetMinScore]);

  const attCalc = useMemo(() => {
    return calculateAttendance({
      attended: selectedCourse.attended,
      conducted: selectedCourse.conducted,
      requiredPct: 75,
      safeZonePct: targetAttendancePct,
    });
  }, [selectedCourse, targetAttendancePct]);

  function handleSaveCombinedPlan() {
    play("tap");
    startTransition(async () => {
      const res = await saveStudentPlanAction({
        student_id: studentId,
        title: `Target ${targetGradeBand} & ${targetAttendancePct}% Att. in ${selectedCourse.subject}`,
        category: "general",
        target_value: {
          subject: selectedCourse.subject,
          targetGrade: targetGradeBand,
          targetMinScore,
          requiredEndSemScore: marksCalc.requiredEndSemScore,
          targetAttendancePct,
          classesNeededForSafeZone: attCalc.classesNeededForSafeZone,
          isMarksAchievable: marksCalc.isAchievable,
        },
        current_value: {
          currentInternal: totalInternal,
          currentAttendancePct: selectedCourse.attendancePct,
        },
        due_date: campusDate(30),
        notes: `Combined goal: Secure ${marksCalc.requiredEndSemScore}/60 in End-Sem and attend ${attCalc.classesNeededForSafeZone} sessions for ${targetAttendancePct}% buffer.`,
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
          <span className="text-xs font-semibold text-brand tracking-wider uppercase">
            Holistic Optimization
          </span>
          <h3 className="font-display text-xl font-semibold text-foreground">
            Combined Attendance & Marks Goal Simulator
          </h3>
          <p className="text-xs text-muted-foreground">
            Plan both classroom presence and terminal exam scores together to ensure academic safety and honors.
          </p>
        </div>

        {/* Subject Picker */}
        <div className="w-full sm:w-64">
          <Label htmlFor="combined-subject-select" className="text-xs text-muted-foreground mb-1 block">
            Target Course
          </Label>
          <select
            id="combined-subject-select"
            value={selectedSubjectName}
            onChange={(e) => {
              play("tap");
              setSelectedSubjectName(e.target.value);
              const sub = subjects.find((s) => s.subject === e.target.value);
              if (sub) {
                setMstScore(Math.min(20, Math.round(sub.internal * 0.5)));
                setAssignmentScore(Math.min(12, Math.round(sub.internal * 0.3)));
                setQuizScore(Math.min(8, Math.round(sub.internal * 0.2)));
              }
            }}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand"
          >
            {subjects.map((s) => (
              <option key={s.subject} value={s.subject}>
                {s.subject} ({s.attendancePct.toFixed(1)}% Att.)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Assessment Breakdown & Target Sliders */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-xl border p-4 bg-background/50 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-foreground">
                <Sliders className="h-4 w-4 text-brand" />
                <span>Continuous Assessment Breakdown</span>
              </span>
              <span className="font-mono text-brand font-bold">
                Total: {totalInternal} / 40
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground flex justify-between">
                  <span>MSTs</span>
                  <span className="font-mono font-semibold">{mstScore}/20</span>
                </Label>
                <Slider
                  min={0}
                  max={20}
                  step={0.5}
                  value={[mstScore]}
                  onValueChange={([val]) => setMstScore(val)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground flex justify-between">
                  <span>Assignments</span>
                  <span className="font-mono font-semibold">{assignmentScore}/12</span>
                </Label>
                <Slider
                  min={0}
                  max={12}
                  step={0.5}
                  value={[assignmentScore]}
                  onValueChange={([val]) => setAssignmentScore(val)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground flex justify-between">
                  <span>Quizzes</span>
                  <span className="font-mono font-semibold">{quizScore}/8</span>
                </Label>
                <Slider
                  min={0}
                  max={8}
                  step={0.5}
                  value={[quizScore]}
                  onValueChange={([val]) => setQuizScore(val)}
                />
              </div>
            </div>
          </div>

          {/* Desired Grade Selector */}
          <div>
            <Label className="text-xs font-semibold mb-2 block">
              Desired Terminal Letter Grade
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {["A+", "A", "B+", "B", "C"].map((grade) => {
                const isSelected = targetGradeBand === grade;
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => {
                      play("tap");
                      setTargetGradeBand(grade);
                    }}
                    className={`py-2 px-1 rounded-xl border text-center transition-all ${
                      isSelected
                        ? "border-brand bg-brand/10 text-brand shadow-xs ring-1 ring-brand font-bold"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="text-sm block">{grade}</span>
                    <span className="text-[10px] text-muted-foreground block">
                      {GRADE_BANDS.find((b) => b.grade === grade)?.min}+ pts
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desired Attendance Buffer Slider */}
          <div className="rounded-xl border p-4 bg-background/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Desired Attendance Safe Buffer</span>
              <span className="font-mono text-base font-bold text-brand">{targetAttendancePct}%</span>
            </div>
            <Slider
              min={75}
              max={95}
              step={1}
              value={[targetAttendancePct]}
              onValueChange={([val]) => setTargetAttendancePct(val)}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>Exam Minimum: 75%</span>
              <span>Dean Honor Roll: 90%+</span>
            </div>
          </div>
        </div>

        {/* Right Column: Integrated Solution Output */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-4 rounded-xl border p-5 bg-background/60">
          <div className="space-y-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold block border-b pb-2">
              Dual Target Feasibility Solution
            </span>

            {/* Requirement 1: Marks needed */}
            <div className="rounded-xl border p-4 bg-card/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-emerald-500" />
                  <span>Terminal Examination Target</span>
                </span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                    marksCalc.isAchievable
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  }`}
                >
                  {marksCalc.isAchievable ? "Achievable" : "Adjust Grade Target"}
                </span>
              </div>

              <div className="flex items-baseline gap-2 pt-1">
                <span className="font-mono text-3xl font-extrabold text-foreground">
                  {marksCalc.requiredEndSemScore !== null
                    ? Math.max(0, marksCalc.requiredEndSemScore)
                    : 0}
                </span>
                <span className="text-xs font-mono text-muted-foreground">/ 60 marks</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                To achieve Grade {targetGradeBand} ({targetMinScore} aggregate), score at least{" "}
                {Math.max(0, marksCalc.requiredEndSemScore ?? 0)} in the 60 mark end semester examination.
              </p>
            </div>

            {/* Requirement 2: Attendance sessions needed */}
            <div className="rounded-xl border p-4 bg-card/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-sky-500" />
                  <span>Attendance Sessions Required</span>
                </span>
                <span className="text-[11px] font-semibold font-mono px-2 py-0.5 rounded-md bg-muted border text-muted-foreground">
                  Current: {selectedCourse.attendancePct.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-baseline gap-2 pt-1">
                <span className="font-mono text-3xl font-extrabold text-foreground">
                  {attCalc.classesNeededForSafeZone}
                </span>
                <span className="text-xs font-mono text-muted-foreground">sessions</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {attCalc.classesNeededForSafeZone > 0
                  ? `Attend the next ${attCalc.classesNeededForSafeZone} consecutive lectures to elevate attendance to your ${targetAttendancePct}% safe zone.`
                  : `Your current attendance (${selectedCourse.attendancePct}%) already secures your ${targetAttendancePct}% buffer.`}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleSaveCombinedPlan}
              disabled={pending}
              className="w-full flex items-center justify-center gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <Sparkles className="h-4 w-4" />
              <span>
                {pending
                  ? "Saving Combined Goal..."
                  : savedSuccess
                  ? "Combined Goal Saved!"
                  : "Commit Combined Goal to My Plan"}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
