import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  Calendar as CalendarIcon,
  Clock,
  Target,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { getProfile, getStudentAcademicData } from "@/lib/data";
import { PageHeader, Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlanList } from "@/components/student/plan-list";
import { WeeklyTimetable } from "@/components/student/weekly-timetable";
import { StudentSelectorDialog } from "@/components/student-selector-dialog";

export const metadata: Metadata = { title: "Schedule & Tasks" };

export default async function StudentSchedulePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const academicData = await getStudentAcademicData();
  if (!academicData) {
    redirect("/student");
  }

  const { student, academic, plans } = academicData;

  const allSubjects = (academic?.subjects ?? []) as Array<{
    sem: number;
    subject: string;
    internal: number;
    end_sem: number | null;
  }>;

  const currentSem = Math.max(...allSubjects.map((s) => s.sem || 1), 1);
  const currentSubjects = allSubjects.filter((s) => s.sem === currentSem || s.end_sem === null);

  // Generate standardized upcoming academic milestones
  const upcomingMilestones = [
    {
      id: "ev-1",
      title: "End Semester Theory Examination: " + (currentSubjects[0]?.subject ?? "Core Engineering"),
      category: "Exam",
      date: "2026-11-10",
      time: "09:30 AM - 12:30 PM",
      venue: "Academic Block 4, Hall B",
      priority: "high",
    },
    {
      id: "ev-2",
      title: "End Semester Theory Examination: " + (currentSubjects[1]?.subject ?? "Systems Architecture"),
      category: "Exam",
      date: "2026-11-13",
      time: "09:30 AM - 12:30 PM",
      venue: "Academic Block 4, Hall B",
      priority: "high",
    },
    {
      id: "ev-3",
      title: "Lab Practical Viva: " + (currentSubjects[2]?.subject ?? "Laboratory Computing"),
      category: "Practical",
      date: "2026-11-18",
      time: "02:00 PM - 05:00 PM",
      venue: "Advanced Computing Lab 2",
      priority: "medium",
    },
    {
      id: "ev-4",
      title: "Capstone Term Paper Submission",
      category: "Assignment",
      date: "2026-11-22",
      time: "11:59 PM IST",
      venue: "Online LMS Portal",
      priority: "medium",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule & Tasks"
        description="Weekly lecture and lab timetable, upcoming semester examinations, and personal targets committed across your courses."
        actions={
          <div className="flex items-center gap-2">
            <StudentSelectorDialog currentStudentId={student.id} />
            <Button asChild size="sm" variant="outline">
              <Link href="/student/calculator" className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-brand" />
                <span>Create New Target</span>
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Timetable & Exam Milestones */}
        <div className="lg:col-span-7 space-y-4">
          <Tabs defaultValue="timetable" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 max-w-xs">
              <TabsTrigger value="timetable" className="flex items-center gap-2 text-xs">
                <Clock className="h-3.5 w-3.5" />
                <span>Weekly Timetable</span>
              </TabsTrigger>
              <TabsTrigger value="exams" className="flex items-center gap-2 text-xs">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>Exams & Milestones</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timetable" className="space-y-4">
              <Panel
                title="Weekly Class Schedule"
                description={`Semester ${currentSem} lecture, laboratory, and tutorial schedule`}
              >
                <div className="pt-2">
                  <WeeklyTimetable
                    subjects={currentSubjects}
                    studentId={student.id}
                  />
                </div>
              </Panel>
            </TabsContent>

            <TabsContent value="exams" className="space-y-4">
              <Panel
                title="Official Academic Timetable"
                description={`Semester ${currentSem} examinations and milestone deadlines`}
              >
                <div className="space-y-3 pt-2">
                  {upcomingMilestones.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl border bg-background/60 p-3.5 space-y-2 hover:border-brand/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm text-foreground leading-snug">
                          {m.title}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                            m.priority === "high"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                          }`}
                        >
                          {m.category}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <CalendarIcon className="h-3.5 w-3.5 text-brand" />
                          {m.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {m.time}
                        </span>
                      </div>

                      <div className="text-[11px] text-muted-foreground font-mono">
                        Venue: {m.venue}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Personal Goals & Commitments List */}
        <div className="lg:col-span-5 space-y-4">
          <Panel
            title="My Saved Academic Targets"
            description="Personal commitments for attendance recovery, exam scores, and semester grade goals"
            action={
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/student/calculator">Add Target</Link>
              </Button>
            }
          >
            <div className="pt-2">
              <PlanList plans={plans} studentId={student.id} />
            </div>
          </Panel>

          {/* Quick link card to planner */}
          <div className="rounded-xl border bg-card/60 p-4 space-y-2 text-xs">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <Target className="h-4 w-4 text-brand" />
              <span>Target Planning Tip</span>
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              Use the calculator simulators to set actionable targets before key test dates. All commitments are preserved in your personal academic record.
            </p>
            <Button asChild size="sm" variant="ghost" className="p-0 text-brand hover:text-brand/80 text-xs">
              <Link href="/student/calculator" className="flex items-center gap-1">
                <span>Go to What-If Calculators</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
