"use client";

import { useMemo, useState } from "react";
import {
  GraduationCap,
  Clock,
  Award,
  UserCheck,
  Layers,
  FileCheck2,
} from "lucide-react";
import { SimpleLine, TimelineChart } from "@/components/charts";
import { buildStudentJourney, filterJourneyEvents } from "@/lib/journey-utils";
import type { JourneyCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StudentTimelineProps {
  student: any;
  lms: any;
  attendance: any;
  academic: any;
  engagement?: any;
  feedback?: any;
  interventions?: any[];
}

const CATEGORY_TABS: Array<{ id: JourneyCategory | "all"; label: string; icon: any }> = [
  { id: "all", label: "All Events", icon: Layers },
  { id: "academic", label: "Academics", icon: GraduationCap },
  { id: "attendance_lms", label: "Attendance & LMS", icon: Clock },
  { id: "support_intervention", label: "Mentorship & Interventions", icon: UserCheck },
  { id: "milestone_skill", label: "Skills & Milestones", icon: Award },
];

export function StudentTimeline({
  student,
  lms,
  attendance,
  academic,
  engagement,
  feedback,
  interventions = [],
}: StudentTimelineProps) {
  const [activeCategory, setActiveCategory] = useState<JourneyCategory | "all">("all");

  // Build verified chronological events
  const allEvents = useMemo(
    () =>
      buildStudentJourney({
        student,
        academic,
        attendance,
        lms,
        engagement,
        feedback,
        interventions,
      }),
    [student, academic, attendance, lms, engagement, feedback, interventions]
  );

  const filteredEvents = useMemo(
    () => filterJourneyEvents(allEvents, activeCategory),
    [allEvents, activeCategory]
  );

  // Trend chart series
  const weekly = (lms?.weekly ?? []).map((w: any) => ({
    x: `W${w.week}`,
    logins: w.logins,
    submitted: w.due ? Math.round((100 * w.submitted) / w.due) : null,
  }));
  const months = Object.entries(attendance?.by_month ?? {}).map(([m, v]) => ({ month: m, pct: v as number }));
  const sgpa = Object.entries(academic?.sgpa ?? {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([s, v]) => ({ sem: `Sem ${s}`, sgpa: v as number }));

  return (
    <div className="space-y-6">
      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 border-b pb-3">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          const count = tab.id === "all" ? allEvents.length : allEvents.filter((e) => e.category === tab.id).length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              <span>{tab.label}</span>
              <span className={cn("ml-1 rounded-full px-1.5 py-0.2 text-[10px]", isActive ? "bg-black/20 text-white" : "bg-muted text-muted-foreground")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Chronological Journey Event Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Chronological Journey Events ({filteredEvents.length})
          </h3>
          <span className="text-[11px] text-muted-foreground">
            Sorted newest to oldest · Sourced from campus registers
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No historical records found for category: <strong>{activeCategory}</strong>.
          </div>
        ) : (
          <div className="relative border-l-2 border-border/80 pl-6 space-y-4 ml-3">
            {filteredEvents.map((evt) => {
              const categoryColor =
                evt.category === "academic"
                  ? "bg-blue-500 text-white ring-blue-500/20"
                  : evt.category === "attendance_lms"
                  ? "bg-amber-500 text-white ring-amber-500/20"
                  : evt.category === "support_intervention"
                  ? "bg-emerald-500 text-white ring-emerald-500/20"
                  : "bg-purple-500 text-white ring-purple-500/20";

              return (
                <div key={evt.id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div
                    className={cn(
                      "absolute -left-[31px] top-1 flex size-5 items-center justify-center rounded-full ring-4 shadow-xs",
                      categoryColor
                    )}
                  >
                    <div className="size-2 rounded-full bg-white" />
                  </div>

                  {/* Event Card */}
                  <div className="rounded-xl border bg-card/60 p-4 transition-all hover:bg-card hover:border-brand/30">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-muted-foreground">
                            {evt.date}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                            {evt.category.replace("_", " ")}
                          </span>
                          {evt.status && (
                            <span className="rounded border px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                              {evt.status}
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-foreground tracking-tight text-sm">
                          {evt.title}
                        </h4>
                      </div>

                      {evt.metric && (
                        <div className="rounded-md border bg-muted/30 px-2 py-1 text-right">
                          <span className="block font-mono text-xs font-bold text-brand">
                            {evt.metric}
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      {evt.description}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <FileCheck2 className="size-3 text-muted-foreground" />
                        Source: {evt.source || "System Register"}
                      </span>
                      {evt.isModelDerived && (
                        <span className="italic text-[10px] text-amber-600 dark:text-amber-400">
                          Model Derived Indicator
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historical Trend Charts Section */}
      <div className="mt-8 border-t pt-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Multi-Semester & Weekly Trend Visualizations
          </h3>
          <p className="text-xs text-muted-foreground">
            Correlate timeline events with observed changes in LMS logins, monthly attendance, and SGPA progression.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              LMS Activity Trend (12 Weeks)
            </p>
            {weekly.length ? (
              <TimelineChart
                data={weekly}
                lines={[
                  { key: "logins", name: "Logins", color: "var(--chart-1)" },
                  { key: "submitted", name: "Assignments submitted %", color: "var(--chart-2)", yAxis: "r" },
                ]}
              />
            ) : (
              <p className="text-xs text-muted-foreground">No LMS identity linked yet.</p>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Attendance by Month
            </p>
            {months.length ? (
              <SimpleLine
                data={months}
                xKey="month"
                lines={[{ key: "pct", name: "Attendance %", color: "var(--chart-4)" }]}
                yDomain={[0, 100]}
              />
            ) : (
              <p className="text-xs text-muted-foreground">No attendance rows.</p>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SGPA Progression
            </p>
            {sgpa.length ? (
              <SimpleLine
                data={sgpa}
                xKey="sem"
                lines={[{ key: "sgpa", name: "SGPA", color: "var(--chart-3)" }]}
                yDomain={[0, 10]}
              />
            ) : (
              <p className="text-xs text-muted-foreground">No completed semesters yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
