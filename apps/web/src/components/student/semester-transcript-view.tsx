"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { CGPATrendChart } from "@/components/student/cgpa-trend-chart";
import { PerformanceAnalytics } from "@/components/student/performance-analytics";
import { getGradePointFromTotal } from "@/lib/academic-calc";
import { Panel } from "@/components/kit";
import { play } from "@/lib/sound";

export interface TranscriptCourse {
  sem: number;
  subject: string;
  internal: number;
  end_sem: number | null;
  total: number | null;
  ref?: string;
  credits?: number;
}

export function SemesterTranscriptView({
  allSubjects,
  sgpaHistory,
  overallAttendance,
  bySubjectAttendance,
  currentCGPA,
}: {
  allSubjects: TranscriptCourse[];
  sgpaHistory: Record<string, number>;
  overallAttendance: number;
  bySubjectAttendance: Record<string, number>;
  currentCGPA: number;
}) {
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);

  const semesters = Array.from(new Set(allSubjects.map((s) => s.sem))).sort((a, b) => b - a);
  const currentSem = semesters[0] ?? 1;

  // Filter subjects based on selected semester
  const displayedSemesters = selectedSemester
    ? [selectedSemester]
    : semesters;

  // Prepare subjects for performance analytics (current semester or all)
  const currentSemesterSubjects = allSubjects
    .filter((s) => s.sem === currentSem)
    .map((s) => ({
      subject: s.subject,
      internal: s.internal,
      attendancePct: bySubjectAttendance[s.subject] ?? overallAttendance,
      end_sem: s.end_sem,
    }));

  return (
    <div className="space-y-6">
      {/* Two Column Section: CGPA Trend Visualizer & Performance Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <CGPATrendChart
            sgpaHistory={sgpaHistory}
            currentCGPA={currentCGPA}
            selectedSemester={selectedSemester}
            onSelectSemester={(sem) => setSelectedSemester(sem)}
          />
        </div>

        <div className="lg:col-span-5 space-y-4">
          <PerformanceAnalytics
            subjects={currentSemesterSubjects}
            overallAttendance={overallAttendance}
            cgpa={currentCGPA}
          />
        </div>
      </div>

      {/* Courses by Semester Tables */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
          <div>
            <h3 className="font-display text-xl font-semibold text-foreground">
              Official Course Transcript & Grade Records
            </h3>
            <p className="text-xs text-muted-foreground">
              {selectedSemester
                ? `Showing evaluated courses for Semester ${selectedSemester}`
                : `Comprehensive course history across all ${semesters.length} semesters`}
            </p>
          </div>

          {selectedSemester && (
            <button
              type="button"
              onClick={() => {
                play("tap");
                setSelectedSemester(null);
              }}
              className="text-xs text-brand hover:underline self-start sm:self-auto font-medium"
            >
              Reset to view all semesters
            </button>
          )}
        </div>

        {displayedSemesters.map((semNum) => {
          const semCourses = allSubjects.filter((s) => s.sem === semNum);
          const isCurrent = semNum === currentSem;
          const semSGPA = sgpaHistory[String(semNum)];

          return (
            <Panel
              key={semNum}
              title={
                <div className="flex items-center gap-2">
                  <span>Semester {semNum} Evaluation Record</span>
                  {isCurrent ? (
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
                      Ongoing Semester
                    </span>
                  ) : semSGPA ? (
                    <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-muted border text-muted-foreground">
                      SGPA: {Number(semSGPA).toFixed(2)}
                    </span>
                  ) : null}
                </div>
              }
              description={`${semCourses.length} registered courses`}
            >
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-muted/40 text-muted-foreground uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Course Title</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Attendance</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Internal (40)</th>
                      <th className="py-2.5 px-3 font-semibold text-right">End-Sem (60)</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Total (100)</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Grade Band</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {semCourses.map((c) => {
                      const att = bySubjectAttendance[c.subject] ?? overallAttendance;
                      const hasEndSem = c.end_sem !== null && c.end_sem !== undefined;
                      const totalVal = c.total ?? (hasEndSem ? c.internal + (c.end_sem ?? 0) : null);
                      const grade = totalVal !== null ? getGradePointFromTotal(totalVal).grade : "Pending";
                      const isFail = totalVal !== null && totalVal < 40;

                      return (
                        <tr key={c.subject} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-semibold text-sm text-foreground block">{c.subject}</span>
                            {c.ref && (
                              <span className="text-[10px] text-muted-foreground font-mono block">{c.ref}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`font-mono font-semibold px-2 py-0.5 rounded-md text-xs border ${
                                att < 75
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              }`}
                            >
                              {att.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-foreground">
                            {c.internal.toFixed(1)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-foreground">
                            {hasEndSem ? (c.end_sem ?? 0).toFixed(1) : <span className="text-muted-foreground italic">Scheduled</span>}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                            {totalVal !== null ? totalVal.toFixed(1) : <span className="text-muted-foreground italic">-</span>}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                                isFail
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                  : totalVal === null
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-brand/10 text-brand"
                              }`}
                            >
                              {grade}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {totalVal === null ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" /> Ongoing
                              </span>
                            ) : isFail ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 font-medium">
                                <AlertCircle className="h-3.5 w-3.5" /> Backlog
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Passed
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
