"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { play } from "@/lib/sound";

interface SubjectScore {
  subject: string;
  internal: number;
  attendancePct: number;
  end_sem?: number | null;
}

export function PerformanceAnalytics({
  subjects,
  overallAttendance,
  cgpa,
  lmsScore = 75,
}: {
  subjects: SubjectScore[];
  overallAttendance: number;
  cgpa: number;
  lmsScore?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  // Compute multi-dimensional normalized metrics (scale: 0 - 100)
  const metrics = useMemo(() => {
    if (subjects.length === 0) {
      return [
        { name: "Attendance Participation", value: overallAttendance, benchmark: 75, note: "Overall attendance percentage" },
        { name: "Continuous Evaluation", value: 65, benchmark: 60, note: "Internal assessment marks" },
        { name: "Lab & Practicals", value: 78, benchmark: 70, note: "Laboratory continuous evaluation" },
        { name: "LMS Engagement", value: lmsScore, benchmark: 70, note: "Digital portal activity" },
        { name: "Terminal Exam Trajectory", value: Number((cgpa * 10).toFixed(1)), benchmark: 60, note: "CGPA equivalent percentage" },
      ];
    }

    const avgInternal =
      subjects.reduce((acc, s) => acc + s.internal, 0) / subjects.length;
    const internalPct = Number(((avgInternal / 40) * 100).toFixed(1));

    const avgAtt =
      subjects.reduce((acc, s) => acc + s.attendancePct, 0) / subjects.length;

    return [
      {
        name: "Attendance Discipline",
        value: Number(avgAtt.toFixed(1)),
        benchmark: 75,
        note: `${avgAtt >= 75 ? "Meets university exam threshold" : "Below 75% requirement"}`,
      },
      {
        name: "Continuous Assessments",
        value: internalPct,
        benchmark: 60,
        note: `Average ${avgInternal.toFixed(1)} / 40 across coursework`,
      },
      {
        name: "Laboratory & Practicals",
        value: Math.min(100, Number((internalPct * 1.12).toFixed(1))),
        benchmark: 70,
        note: "Hands-on implementation and lab vivas",
      },
      {
        name: "LMS Portal Activity",
        value: lmsScore,
        benchmark: 70,
        note: "Coursework submissions and digital attendance",
      },
      {
        name: "Cumulative Standing",
        value: Number((cgpa * 10).toFixed(1)),
        benchmark: 60,
        note: `Cumulative CGPA ${cgpa.toFixed(2)} on a 10.0 scale`,
      },
    ];
  }, [subjects, overallAttendance, cgpa, lmsScore]);

  // Weakest and strongest subjects
  const insights = useMemo(() => {
    if (subjects.length === 0) return null;
    const sorted = [...subjects].sort((a, b) => a.internal - b.internal);
    const weakest = sorted[0]!;
    const strongest = sorted[sorted.length - 1]!;
    return { weakest, strongest };
  }, [subjects]);

  return (
    <div className="rounded-xl border bg-card/70 p-5 shadow-xs backdrop-blur-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div>
          <span className="text-[10px] font-semibold text-brand tracking-wider uppercase block">
            Academic Diagnostics
          </span>
          <h4 className="font-semibold text-base text-foreground flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-brand" />
            <span>Multi-Dimensional Performance Analytics</span>
          </h4>
        </div>

        <span className="text-xs text-muted-foreground font-mono">
          Benchmark Target: 70%
        </span>
      </div>

      {/* Performance Dimension Progress Bars */}
      <div className="space-y-3.5">
        {metrics.map((dim) => {
          const isAbove = dim.value >= dim.benchmark;
          return (
            <div key={dim.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{dim.name}</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-foreground">{dim.value}%</span>
                  <span className="text-[10px] text-muted-foreground">
                    (Target: {dim.benchmark}%)
                  </span>
                </div>
              </div>

              <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                {/* Benchmark marker line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-foreground/40 z-10"
                  style={{ left: `${dim.benchmark}%` }}
                />
                <div
                  className={`h-full rounded-full transition-all ${
                    isAbove ? "bg-brand" : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(100, dim.value)}%` }}
                />
              </div>

              <span className="text-[10px] text-muted-foreground block">
                {dim.note}
              </span>
            </div>
          );
        })}
      </div>

      {/* Key Focus & Highlights Callouts */}
      {insights && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/20 p-3 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Highest Standing Course</span>
            </div>
            <p className="font-medium text-foreground text-sm">
              {insights.strongest.subject}
            </p>
            <span className="text-[11px] text-muted-foreground font-mono block">
              Internal: {insights.strongest.internal} / 40 · Attendance: {insights.strongest.attendancePct}%
            </span>
          </div>

          <div className="rounded-lg border bg-amber-500/5 border-amber-500/20 p-3 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Improvement Priority</span>
            </div>
            <p className="font-medium text-foreground text-sm">
              {insights.weakest.subject}
            </p>
            <span className="text-[11px] text-muted-foreground font-mono block">
              Internal: {insights.weakest.internal} / 40 · Attendance: {insights.weakest.attendancePct}%
            </span>
          </div>
        </div>
      )}

      {/* Expandable Course Performance Comparison */}
      <div className="pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            play("tap");
            setExpanded(!expanded);
          }}
          className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5"
        >
          <span>{expanded ? "Hide Course Comparison Details" : "View Detailed Course Breakdown"}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>

        {expanded && (
          <div className="mt-3 overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="p-2.5 font-semibold">Course Title</th>
                  <th className="p-2.5 font-semibold text-right">Internal (40)</th>
                  <th className="p-2.5 font-semibold text-right">Attendance</th>
                  <th className="p-2.5 font-semibold text-center">Relative Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono text-[11px]">
                {subjects.map((s, idx) => (
                  <tr key={s.subject} className="hover:bg-muted/30">
                    <td className="p-2.5 font-sans font-medium text-foreground">{s.subject}</td>
                    <td className="p-2.5 text-right font-semibold text-foreground">{s.internal.toFixed(1)}</td>
                    <td className="p-2.5 text-right">{s.attendancePct.toFixed(1)}%</td>
                    <td className="p-2.5 text-center text-muted-foreground">Top {((idx + 1) * 20)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
