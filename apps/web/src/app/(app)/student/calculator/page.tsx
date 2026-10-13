import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Calendar, Clock, GraduationCap, Target, HelpCircle, Layers } from "lucide-react";
import { getProfile, getStudentAcademicData } from "@/lib/data";
import { PageHeader, Panel } from "@/components/kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AttendanceSliderCard } from "@/components/student/attendance-slider-card";
import { MarksCalculatorCard } from "@/components/student/marks-calculator-card";
import { CGPACalculatorCard } from "@/components/student/cgpa-calculator-card";
import { CombinedTargetCard } from "@/components/student/combined-target-card";
import { StudentSelectorDialog } from "@/components/student-selector-dialog";

export const metadata: Metadata = { title: "Plan & Improve" };

export default async function StudentCalculatorPage() {
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
  }>;

  const currentSem = Math.max(...allSubjects.map((s) => s.sem || 1), 1);
  const currentSubjects = allSubjects.filter((s) => s.sem === currentSem || s.end_sem === null);

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

  const subjectsForMarks = currentSubjects.map((s) => ({
    subject: s.subject,
    internal: s.internal,
    end_sem: s.end_sem,
    credits: 4,
    sem: s.sem,
  }));

  const combinedSubjects = currentSubjects.map((s) => {
    const pct = bySubjectAttendance[s.subject] ?? attendance?.overall_pct ?? 75;
    const conducted = 40;
    const attended = Math.round((pct / 100) * conducted);
    return {
      subject: s.subject,
      internal: s.internal,
      end_sem: s.end_sem,
      attendancePct: pct,
      attended,
      conducted,
      credits: 4,
    };
  });

  const currentCGPA = academic?.cgpa ?? 5.5;
  const completedCredits = (currentSem - 1) * 20;
  const currentSemesterCredits = 20;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan & Improve"
        description="Interactive What-If simulators for attendance recovery, examination marks targeting, and cumulative CGPA optimization."
        actions={
          <div className="flex items-center gap-2">
            <StudentSelectorDialog currentStudentId={student.id} />
            <Button asChild size="sm" variant="outline">
              <Link href="/student/schedule" className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>View Saved Goals</span>
              </Link>
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="attendance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-2xl">
          <TabsTrigger value="attendance" className="flex items-center gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" />
            <span>Attendance What-If</span>
          </TabsTrigger>
          <TabsTrigger value="marks" className="flex items-center gap-1.5 text-xs">
            <Target className="h-3.5 w-3.5" />
            <span>Marks Solver</span>
          </TabsTrigger>
          <TabsTrigger value="cgpa" className="flex items-center gap-1.5 text-xs">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>SGPA & CGPA</span>
          </TabsTrigger>
          <TabsTrigger value="combined" className="flex items-center gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" />
            <span>Combined Goal</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-6">
          <AttendanceSliderCard
            subjects={subjectAttendanceList}
            studentId={student.id}
          />
        </TabsContent>

        <TabsContent value="marks" className="space-y-6">
          <MarksCalculatorCard
            subjects={subjectsForMarks}
            studentId={student.id}
          />
        </TabsContent>

        <TabsContent value="cgpa" className="space-y-6">
          <CGPACalculatorCard
            studentId={student.id}
            currentCGPA={currentCGPA}
            completedCredits={completedCredits}
            currentSemesterCredits={currentSemesterCredits}
            subjects={currentSubjects.map((s) => ({ subject: s.subject, credits: 4 }))}
          />
        </TabsContent>

        <TabsContent value="combined" className="space-y-6">
          <CombinedTargetCard
            subjects={combinedSubjects}
            studentId={student.id}
          />
        </TabsContent>
      </Tabs>

      {/* Formula and Academic Rules Explanation */}
      <Panel
        title={
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-brand" />
            <span>Verified Calculation Standards</span>
          </div>
        }
        description="Mathematical specifications applied across all student success projections"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs text-muted-foreground leading-relaxed">
          <div className="rounded-xl border bg-background/50 p-4 space-y-1.5">
            <h5 className="font-semibold text-foreground">Attendance Recovery Formula</h5>
            <p>
              Given attended lectures A and conducted lectures T with minimum required threshold p (e.g. 75%), the consecutive sessions needed is calculated as:
            </p>
            <div className="font-mono bg-muted/60 p-2 rounded-lg text-foreground text-[11px]">
              Needed = max(0, ceil((p * T - A) / (1 - p)))
            </div>
          </div>

          <div className="rounded-xl border bg-background/50 p-4 space-y-1.5">
            <h5 className="font-semibold text-foreground">Terminal Exam Target Solver</h5>
            <p>
              Given internal marks earned I (out of 40) and target grade threshold G, the minimum score in the end semester examination E (out of 60) is:
            </p>
            <div className="font-mono bg-muted/60 p-2 rounded-lg text-foreground text-[11px]">
              Required End-Sem = max(0, Target - Internal)
            </div>
          </div>

          <div className="rounded-xl border bg-background/50 p-4 space-y-1.5">
            <h5 className="font-semibold text-foreground">Credit-Weighted SGPA / CGPA</h5>
            <p>
              Semester SGPA is determined by credit weighting each course grade point, and cumulative CGPA balances historic credits:
            </p>
            <div className="font-mono bg-muted/60 p-2 rounded-lg text-foreground text-[11px]">
              SGPA = sum(credits * grade_point) / sum(credits)
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
