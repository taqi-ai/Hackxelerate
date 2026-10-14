"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  Clock,
  Filter,
  Target,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { calculateAttendance } from "@/lib/academic-calc";
import type { AttendanceCalculation } from "@/lib/types";
import { play } from "@/lib/sound";

export interface SubjectItem {
  subject: string;
  code?: string;
  credits?: number;
  internal: number | null;
  end_sem: number | null;
  total: number | null;
  sem?: number;
  attendancePct: number;
  conducted?: number;
  attended?: number;
  faculty?: string;
}

export type EnhancedSubjectItem = SubjectItem & {
  code: string;
  conducted: number;
  attended: number;
  credits: number;
  attCalc: AttendanceCalculation;
};

function getCourseCode(subject: string, sem = 5): string {
  const map: Record<string, string> = {
    "Cloud Computing": "CS501",
    "Computer Networks": "CS502",
    "Deep Learning": "AI501",
    "Machine Learning": "AI502",
    "Natural Language Processing": "AI503",
    "Operating Systems": "CS401",
    "Design & Analysis of Algorithms": "CS402",
    "Database Management Systems": "CS301",
    "Data Structures": "CS302",
    "Computer Organization": "CS303",
    "Programming in C": "CS101",
    "Mathematics-I": "MA101",
    "Mathematics-II": "MA201",
    "Engineering Physics": "PH101",
    "Engineering Chemistry": "CH201",
  };
  if (map[subject]) return map[subject];
  const words = subject.split(" ");
  const initials = words.map((w) => w[0]).join("").toUpperCase().slice(0, 3);
  return `${initials}${sem}01`;
}

export function SubjectCardGrid({
  subjects,
}: {
  subjects: SubjectItem[];
  studentId?: string;
}) {
  const [filter, setFilter] = useState<"all" | "low" | "safe">("all");
  const [sortBy, setSortBy] = useState<"attendance-asc" | "attendance-desc" | "name" | "marks">("attendance-asc");
  const [selectedSubject, setSelectedSubject] = useState<EnhancedSubjectItem | null>(null);

  const enhancedSubjects = useMemo(() => {
    return subjects.map((s) => {
      const code = s.code || getCourseCode(s.subject, s.sem);
      const conducted = s.conducted ?? 40;
      const attended = s.attended ?? Math.round((s.attendancePct / 100) * conducted);
      const credits = s.credits ?? 4;
      const attCalc = calculateAttendance({
        attended,
        conducted,
        requiredPct: 75,
        safeZonePct: 80,
      });

      return {
        ...s,
        code,
        conducted,
        attended,
        credits,
        attCalc,
      };
    });
  }, [subjects]);

  const filteredAndSorted = useMemo(() => {
    let list = [...enhancedSubjects];

    if (filter === "low") {
      list = list.filter((s) => s.attendancePct < 75);
    } else if (filter === "safe") {
      list = list.filter((s) => s.attendancePct >= 80);
    }

    list.sort((a, b) => {
      if (sortBy === "attendance-asc") return a.attendancePct - b.attendancePct;
      if (sortBy === "attendance-desc") return b.attendancePct - a.attendancePct;
      if (sortBy === "name") return a.subject.localeCompare(b.subject);
      if (sortBy === "marks") return (b.internal ?? -1) - (a.internal ?? -1);
      return 0;
    });

    return list;
  }, [enhancedSubjects, filter, sortBy]);

  return (
    <div className="space-y-4">
      {/* Filter and Sort Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: `All (${subjects.length})` },
            { id: "low", label: `Below 75% (${enhancedSubjects.filter((s) => s.attendancePct < 75).length})` },
            { id: "safe", label: `Safe Zone 80%+ (${enhancedSubjects.filter((s) => s.attendancePct >= 80).length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                play("tap");
                setFilter(tab.id as typeof filter);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filter === tab.id
                  ? "bg-brand text-brand-foreground shadow-xs font-semibold"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Filter className="h-3 w-3" /> Sort:
          </span>
          <select
            value={sortBy}
            onChange={(e) => {
              play("tap");
              setSortBy(e.target.value as typeof sortBy);
            }}
            className="rounded-lg border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-brand"
          >
            <option value="attendance-asc">Lowest Attendance First</option>
            <option value="attendance-desc">Highest Attendance First</option>
            <option value="marks">Highest Internal Score</option>
            <option value="name">Subject Title</option>
          </select>
        </div>
      </div>

      {/* Subject Cards Grid */}
      {filteredAndSorted.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center bg-card/40">
          <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-foreground">No subjects match the selected filter</p>
          <p className="text-xs text-muted-foreground mt-1">
            Switch to the All filter to inspect all active courses.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredAndSorted.map((sub) => {
            const isLow = sub.attendancePct < 75;
            const isCritical = sub.attendancePct < 65;
            const hasBuffer = sub.attCalc.allowedAbsencesAtTarget > 0;

            return (
              <div
                key={sub.subject}
                onClick={() => {
                  play("tap");
                  setSelectedSubject(sub);
                }}
                className="group relative rounded-xl border bg-card/70 p-4 shadow-xs backdrop-blur-sm transition-all hover:border-brand/40 hover:bg-card hover:shadow-md cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground uppercase border">
                        {sub.code}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {sub.credits} Credits
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm text-foreground truncate mt-1 group-hover:text-brand transition-colors">
                      {sub.subject}
                    </h4>
                  </div>

                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                      isLow
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    {sub.attendancePct.toFixed(1)}% Att.
                  </span>
                </div>

                {/* Attendance Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>
                      about {sub.attended} of {sub.conducted} classes (assumes a 40-class term)
                    </span>
                    <span className="font-medium text-foreground">
                      Target 75%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isCritical ? "bg-rose-600" : isLow ? "bg-amber-500" : "bg-brand"
                      }`}
                      style={{ width: `${Math.min(100, sub.attendancePct)}%` }}
                    />
                  </div>
                </div>

                {/* Status Badges & Quick Numbers */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-muted-foreground">Internal:</span>
                    <span className="font-semibold text-foreground">{sub.internal !== null ? `${sub.internal.toFixed(1)} / 40` : "Not recorded"}</span>
                  </div>

                  {isLow ? (
                    <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Attend {sub.attCalc.classesNeededForRequired} more
                    </span>
                  ) : hasBuffer ? (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Buffer: {sub.attCalc.allowedAbsencesAtTarget} classes
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      Exact threshold
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Subject Detail Dialog */}
      <Dialog open={!!selectedSubject} onOpenChange={(open) => !open && setSelectedSubject(null)}>
        {selectedSubject && (
          <DialogContent className="max-w-md sm:rounded-2xl">
            <DialogHeader className="space-y-1 border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground uppercase border">
                  {selectedSubject.code}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {selectedSubject.credits} Credits · Semester {selectedSubject.sem ?? 5}
                </span>
              </div>
              <DialogTitle className="font-display text-lg font-bold text-foreground">
                {selectedSubject.subject}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Detailed continuous evaluation and attendance recovery trajectory.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Attendance Card */}
              <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-brand" />
                    <span>Attendance Standing</span>
                  </span>
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                      selectedSubject.attendancePct < 75
                        ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    }`}
                  >
                    {selectedSubject.attendancePct.toFixed(1)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center pt-1 font-mono">
                  <div className="rounded-lg bg-background p-2 border">
                    <span className="text-[10px] text-muted-foreground block">Attended / Conducted (est.)</span>
                    <span className="font-bold text-foreground">
                      {selectedSubject.attended} / {selectedSubject.conducted}
                    </span>
                  </div>
                  <div className="rounded-lg bg-background p-2 border">
                    <span className="text-[10px] text-muted-foreground block">
                      {selectedSubject.attendancePct < 75 ? "Recovery Required" : "Safe Buffer"}
                    </span>
                    <span className="font-bold text-brand">
                      {selectedSubject.attendancePct < 75
                        ? `${selectedSubject.attCalc.classesNeededForRequired} classes`
                        : `${selectedSubject.attCalc.allowedAbsencesAtTarget} classes`}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                  {selectedSubject.attCalc.message}
                </p>
              </div>

              {/* Internal Marks Card */}
              <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-emerald-500" />
                    <span>Assessment Evaluation</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-foreground">
                    {selectedSubject.internal !== null ? `${selectedSubject.internal.toFixed(1)} / 40` : "Not recorded"}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {selectedSubject.internal !== null
                    ? "The ERP export holds one internal figure per subject, so no MST, assignment or quiz breakdown is shown."
                    : "The ERP export has no internal marks for this subject yet. Enter your own in the target calculator."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button
                  asChild
                  className="w-full bg-brand text-brand-foreground hover:bg-brand/90 text-xs"
                >
                  <Link href="/student/calculator">
                    <Calculator className="h-3.5 w-3.5 mr-1.5" />
                    <span>Launch Target Calculator</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full text-xs"
                >
                  <Link href="/student/schedule">
                    <span>View Schedule</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
