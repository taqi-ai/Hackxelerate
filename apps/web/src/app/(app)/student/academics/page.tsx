import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  AlertCircle,
  BookOpen,
  Clock,
  ExternalLink,
  GraduationCap,
  History,
} from "lucide-react";
import { getProfile, getStudentAcademicData } from "@/lib/data";
import { PageHeader, Panel, Stat } from "@/components/kit";
import { Stagger, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { StudentSelectorDialog } from "@/components/student-selector-dialog";
import { ManualImportDialog } from "@/components/manual-import-dialog";
import { SemesterTranscriptView, type TranscriptCourse } from "@/components/student/semester-transcript-view";

export const metadata: Metadata = { title: "My Academics" };

export default async function StudentAcademicsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const academicData = await getStudentAcademicData();
  if (!academicData) {
    redirect("/student");
  }

  const { student, academic, attendance } = academicData;

  const allSubjects = (academic?.subjects ?? []) as TranscriptCourse[];
  const sgpaHistory = (academic?.sgpa ?? {}) as Record<string, number>;
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

      {/* Interactive Transcript & Performance Suite */}
      <SemesterTranscriptView
        allSubjects={allSubjects}
        sgpaHistory={sgpaHistory}
        overallAttendance={overallAtt}
        bySubjectAttendance={bySubjectAttendance}
        currentCGPA={cgpaValue}
      />

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
