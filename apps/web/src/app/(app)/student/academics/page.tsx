import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  History,
} from "lucide-react";
import { getProfile, getStudentAcademicData } from "@/lib/data";
import { PageHeader, Panel, Stat } from "@/components/kit";
import { Stagger, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { getGradePointFromTotal } from "@/lib/academic-calc";
import { StudentSelectorDialog } from "@/components/student-selector-dialog";
import { ManualImportDialog } from "@/components/manual-import-dialog";

export const metadata: Metadata = { title: "My Academics" };

export default async function StudentAcademicsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const academicData = await getStudentAcademicData();
  if (!academicData) {
    redirect("/student");
  }

  const { student, academic, attendance } = academicData;

  const allSubjects = (academic?.subjects ?? []) as Array<{
    sem: number;
    subject: string;
    internal: number;
    end_sem: number | null;
    total: number | null;
    ref?: string;
  }>;

  const sgpaHistory = (academic?.sgpa ?? {}) as Record<string, number>;
  const semesters = Array.from(new Set(allSubjects.map((s) => s.sem))).sort((a, b) => b - a);
  const currentSem = semesters[0] ?? 1;

  const bySubjectAttendance = (attendance?.by_subject ?? {}) as Record<string, number>;
  const byMonthAttendance = (attendance?.by_month ?? {}) as Record<string, number>;

  const overallAtt = attendance?.overall_pct ?? 0;
  const cgpaValue = academic?.cgpa ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Academics"
        description="Comprehensive course evaluations, historical semester transcripts, and verified attendance breakdown."
        actions={
          <div className="flex items-center gap-2">
            <StudentSelectorDialog currentStudentId={student.id} />
            <ManualImportDialog studentId={student.id} currentCgpa={cgpaValue} currentAttendance={overallAtt} />
          </div>
        }
      />

      {/* Overview Stats */}
      <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StaggerItem>
          <Stat
            label="Cumulative CGPA"
            value={cgpaValue}
            decimals={2}
            hint="Weighted average grade points"
            tone="brand"
            icon={GraduationCap}
          />
        </StaggerItem>
        <StaggerItem>
          <Stat
            label="Active Backlogs"
            value={academic?.backlogs ?? 0}
            decimals={0}
            hint={academic?.backlogs && academic.backlogs > 0 ? "Requires re-examination" : "Clean academic record"}
            tone={academic?.backlogs && academic.backlogs > 0 ? "high" : "low"}
            icon={AlertCircle}
          />
        </StaggerItem>
        <StaggerItem>
          <Stat
            label="Overall Attendance"
            value={overallAtt}
            decimals={1}
            hint={overallAtt >= 75 ? "Meets exam criteria" : "Attendance shortage alert"}
            tone={overallAtt >= 80 ? "low" : overallAtt >= 75 ? "medium" : "high"}
            icon={Clock}
          />
        </StaggerItem>
        <StaggerItem>
          <Stat
            label="Core Attendance"
            value={attendance?.core_pct ?? overallAtt}
            decimals={1}
            hint="Department technical courses"
            tone="low"
            icon={BookOpen}
          />
        </StaggerItem>
      </Stagger>

      {/* SGPA Semester Progression */}
      {Object.keys(sgpaHistory).length > 0 && (
        <Panel
          title="Semester Progression (SGPA History)"
          description="Term-by-term performance record across completed examination sessions"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
            {Object.entries(sgpaHistory).map(([sem, sgpa]) => (
              <div key={sem} className="rounded-xl border bg-background/60 p-3.5 text-center space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                  Semester {sem}
                </span>
                <span className="font-mono text-2xl font-bold text-foreground block">
                  {Number(sgpa).toFixed(2)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {Number(sgpa) >= 7.5 ? "First Class with Distinction" : Number(sgpa) >= 6.0 ? "First Class" : "Pass"}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Monthly Attendance Timeline */}
      {Object.keys(byMonthAttendance).length > 0 && (
        <Panel
          title="Monthly Attendance Register"
          description="Classroom participation trend recorded across academic months"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {Object.entries(byMonthAttendance).map(([month, pct]) => {
              const isShort = Number(pct) < 75;
              return (
                <div key={month} className="rounded-xl border bg-background/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground uppercase">{month} 2026</span>
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${
                        isShort
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      {Number(pct).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isShort ? "bg-rose-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(100, Number(pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Courses by Semester */}
      <div className="space-y-6">
        {semesters.map((semNum) => {
          const semCourses = allSubjects.filter((s) => s.sem === semNum);
          const isCurrent = semNum === currentSem;

          return (
            <Panel
              key={semNum}
              title={
                <div className="flex items-center gap-2">
                  <span>Semester {semNum} Courses</span>
                  {isCurrent && (
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
                      Ongoing Semester
                    </span>
                  )}
                </div>
              }
              description={`${semCourses.length} registered subjects`}
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
                      <th className="py-2.5 px-3 font-semibold text-center">Grade</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {semCourses.map((c) => {
                      const att = bySubjectAttendance[c.subject] ?? overallAtt;
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

      {/* Data Provenance Audit Note */}
      <div className="rounded-xl border bg-muted/20 p-4 text-xs text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-brand shrink-0" />
          <span>
            Lineage verified from campus repository: <strong>{academic?.lineage?.file ?? "erp_academics.csv"}</strong> (
            {academic?.lineage?.rows ?? allSubjects.length} records).
          </span>
        </div>
        <Button asChild size="sm" variant="ghost" className="text-xs shrink-0">
          <Link href="/student/connection" className="flex items-center gap-1">
            <span>Verify Source</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
