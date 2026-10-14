import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  GraduationCap,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { getProfile, getStudentAcademicData } from "@/lib/data";
import { PageHeader, Panel, Stat } from "@/components/kit";
import { Stagger, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { StudentSelectorDialog } from "@/components/student-selector-dialog";
import { ManualImportDialog } from "@/components/manual-import-dialog";
import { AttendanceSliderCard } from "@/components/student/attendance-slider-card";
import { SubjectCardGrid } from "@/components/student/subject-card-grid";

export const metadata: Metadata = { title: "Student Overview" };

export default async function StudentOverviewPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const academicData = await getStudentAcademicData();
  if (!academicData) {
    return (
      <div className="py-12 text-center space-y-4">
        <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
        <h2 className="text-xl font-semibold">No Student Profile Linked</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Please select a student from the cohort selector or connect your student credentials.
        </p>
        <div className="pt-2">
          <StudentSelectorDialog currentStudentId="" />
        </div>
      </div>
    );
  }

  const { student, score, academic, attendance, plans, connection } = academicData;

  // Extract current semester subjects
  const allSubjects = (academic?.subjects ?? []) as Array<{
    sem: number;
    subject: string;
    internal: number | null;
    end_sem: number | null;
    total: number | null;
  }>;
  const currentSem = Math.max(...allSubjects.map((s) => s.sem || 1), 1);
  const currentSubjects = allSubjects.filter((s) => s.sem === currentSem || s.end_sem === null);

  // Subject attendance array
  const bySubjectAttendance = (attendance?.by_subject ?? {}) as Record<string, number>;
  const subjectAttendanceList = currentSubjects.map((s) => {
    const pct = bySubjectAttendance[s.subject] ?? attendance?.overall_pct ?? 75;
    const conducted = 40;
    const attended = Math.round((pct / 100) * conducted);
    return {
      subject: s.subject,
      attended,
      conducted,
      pct,
    };
  });

  const overallAtt = attendance?.overall_pct ?? 0;
  const attTone = overallAtt >= 80 ? "low" : overallAtt >= 75 ? "medium" : "high";
  const cgpaValue = academic?.cgpa ?? 0;
  const activePlansCount = plans.filter((p) => p.status === "active").length;

  const subjectCardItems = currentSubjects.map((s) => ({
    subject: s.subject,
    internal: s.internal,
    end_sem: s.end_sem,
    total: s.total,
    sem: s.sem,
    attendancePct: bySubjectAttendance[s.subject] ?? overallAtt,
    credits: 4,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Overview"
        description={
          <span>
            Academic standing, live attendance metrics, and personalized success trajectories for{" "}
            <strong className="text-foreground">{student.name}</strong> ({student.id})
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <StudentSelectorDialog currentStudentId={student.id} />
            <ManualImportDialog studentId={student.id} currentCgpa={cgpaValue} currentAttendance={overallAtt} />
          </div>
        }
      />

      {/* Provenance and Profile Metadata Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card/60 p-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Branch: </span>
            <span className="font-semibold text-foreground">{student.branch}</span>
          </div>
          <span className="text-muted-foreground/40">•</span>
          <div>
            <span className="text-muted-foreground">Year / Section: </span>
            <span className="font-semibold text-foreground">
              Year {student.year}, Section {student.section}
            </span>
          </div>
          <span className="text-muted-foreground/40">•</span>
          <div>
            <span className="text-muted-foreground">Mentor: </span>
            <span className="font-semibold text-foreground">
              {student.mentors?.name ?? student.mentor_id ?? "Academic Advisor"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/student/connection"
            className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground hover:border-brand/40 hover:text-foreground transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="capitalize">
              {connection?.provenance === "synthetic_demo"
                ? "Frozen Demo Cohort"
                : connection?.provenance === "manual_import"
                ? "Manual Import"
                : "Portal Record"}
            </span>
            {connection?.last_synced_at && (
              <span className="text-[10px] text-muted-foreground font-mono">
                ({new Date(connection.last_synced_at).toLocaleDateString()})
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StaggerItem>
          <Stat
            label="Overall Attendance"
            value={overallAtt}
            decimals={1}
            hint={
              overallAtt < 75
                ? "Below 75% threshold"
                : overallAtt < 80
                ? "Near threshold margin"
                : "Safe zone attendance"
            }
            tone={attTone}
            icon={Clock}
            href="/student/calculator"
          />
        </StaggerItem>

        <StaggerItem>
          <Stat
            label="Cumulative CGPA"
            value={cgpaValue}
            decimals={2}
            hint={
              academic?.backlogs && academic.backlogs > 0
                ? `${academic.backlogs} active backlog registered`
                : "No active backlogs"
            }
            tone={cgpaValue >= 7.5 ? "low" : cgpaValue >= 6.0 ? "medium" : "high"}
            icon={GraduationCap}
            href="/student/academics"
          />
        </StaggerItem>

        <StaggerItem>
          <Stat
            label="Success Readiness"
            value={score?.success_score ?? 70}
            decimals={0}
            hint={score ? `Category: ${score.persona}` : "AI trajectory rating"}
            tone="brand"
            icon={TrendingUp}
          />
        </StaggerItem>

        <StaggerItem>
          <Stat
            label="Active Goals"
            value={activePlansCount}
            decimals={0}
            hint="Scheduled plans & targets"
            tone="low"
            icon={Target}
            href="/student/schedule"
          />
        </StaggerItem>
      </Stagger>

      {/* Actionable Alert Banner (if needed) */}
      {overallAtt < 75 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-sm font-semibold">Attendance Threshold Alert</h4>
              <p className="text-xs text-muted-foreground dark:text-amber-300/80">
                Your cumulative attendance is currently {overallAtt}%, which is below the mandatory 75% university eligibility requirement.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="border-amber-500/40 hover:bg-amber-500/20 shrink-0">
            <Link href="/student/calculator">Launch What-If Recovery Simulator</Link>
          </Button>
        </div>
      )}

      {/* Two Column Layout: Subject Outlook & What-If Slider */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Courses with Filtering and Detail Dialogs */}
        <div className="lg:col-span-7 space-y-4">
          <Panel
            title={`Active Courses & Attendance (Semester ${currentSem})`}
            description="Continuous evaluation marks, interactive filtering, and recovery targets"
            action={
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/student/academics" className="flex items-center gap-1">
                  <span>Full History</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            }
          >
            <div className="pt-2">
              <SubjectCardGrid subjects={subjectCardItems} studentId={student.id} />
            </div>
          </Panel>
        </div>

        {/* Right Column: Interactive Attendance Simulator */}
        <div className="lg:col-span-5 space-y-6">
          <AttendanceSliderCard
            subjects={subjectAttendanceList}
            studentId={student.id}
          />

          {/* Quick Guidance Card */}
          <div className="rounded-2xl border bg-muted/20 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              <h4 className="font-semibold text-sm text-foreground">Personalized Academic Guidance</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {score?.recourse?.academic?.steps?.[0] ??
                "Focus on securing above 80% attendance in core technical modules to build an examination buffer before terminal tests."}
            </p>
            <div className="pt-1 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="text-xs">
                <Link href="/student/calculator">End-Sem Marks Calculator</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="text-xs">
                <Link href="/student/schedule">My Target List</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
