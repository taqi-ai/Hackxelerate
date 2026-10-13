"use client";

import { SimpleLine, TimelineChart } from "@/components/charts";

export function StudentTimeline({ lms, attendance, academic }: { lms: any; attendance: any; academic: any }) {
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
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr_1fr]">
      <div>
        <p className="mb-2 text-sm font-medium">LMS activity</p>
        {weekly.length ? (
          <TimelineChart
            data={weekly}
            lines={[
              { key: "logins", name: "Logins", color: "var(--chart-1)" },
              { key: "submitted", name: "Assignments submitted %", color: "var(--chart-2)", yAxis: "r" },
            ]}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No LMS identity linked yet. The email may be waiting in the review queue.</p>
        )}
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Attendance by month</p>
        {months.length ? (
          <SimpleLine data={months} xKey="month" lines={[{ key: "pct", name: "Attendance %", color: "var(--chart-4)" }]} yDomain={[0, 100]} />
        ) : (
          <p className="text-sm text-muted-foreground">No attendance rows.</p>
        )}
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">SGPA by semester</p>
        {sgpa.length ? (
          <SimpleLine data={sgpa} xKey="sem" lines={[{ key: "sgpa", name: "SGPA", color: "var(--chart-3)" }]} yDomain={[0, 10]} />
        ) : (
          <p className="text-sm text-muted-foreground">No completed semesters yet.</p>
        )}
      </div>
    </div>
  );
}
