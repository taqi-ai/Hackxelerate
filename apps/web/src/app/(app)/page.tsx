import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, ArrowRight, BriefcaseBusiness, DatabaseZap, GraduationCap, Info, Lightbulb, Users } from "lucide-react";
import { getArtifacts, getInsights, getInterventions, getProfile, getQualityReport, getSegments, getStudentRows } from "@/lib/data";
import { EmptyState, PageHeader, Panel, RiskBadge, ScoreValue, Stat } from "@/components/kit";
import { RiskByGroup, ScoreHistogram, WeeklyTrend } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const [profile, rows, insights, segments, artifacts, interventions, quality] = await Promise.all([
    getProfile(),
    getStudentRows(),
    getInsights(),
    getSegments(),
    getArtifacts(["cohort"]),
    getInterventions(),
    getQualityReport(),
  ]);

  if (rows.length === 0) {
    return (
      <>
        <PageHeader title="Overview" />
        <EmptyState icon={DatabaseZap} title="No student data yet">
          Run the integration pipeline from Data integration to load the seven campus sources.
        </EmptyState>
      </>
    );
  }

  const isMentor = profile?.role === "mentor";
  const n = rows.length;
  const avg = rows.reduce((s, r) => s + r.success_score, 0) / n;
  const highA = rows.filter((r) => r.academic_risk_level === "High").length;
  const track = rows.filter((r) => r.placement_risk_level !== "N/A");
  const highP = track.filter((r) => r.placement_risk_level === "High").length;
  const decliners = rows.filter((r) => r.alerts.some((a) => a.type === "silent_decliner")).length;
  const openInt = interventions.filter((i) => i.status === "open" || i.status === "in_progress").length;

  const bins = Array.from({ length: 20 }, (_, i) => ({ bin: `${i * 5}`, from: i * 5, count: 0 }));
  rows.forEach((r) => bins[Math.min(19, Math.floor(r.success_score / 5))].count++);

  const groupKey = isMentor ? (r: (typeof rows)[number]) => `Y${r.year} ${r.branch} ${r.section}` : (r: (typeof rows)[number]) => r.branch;
  const groups = new Map<string, { group: string; Low: number; Medium: number; High: number }>();
  rows.forEach((r) => {
    const k = groupKey(r);
    const g = groups.get(k) ?? { group: k, Low: 0, Medium: 0, High: 0 };
    g[r.academic_risk_level]++;
    groups.set(k, g);
  });

  const priority = [...rows].sort((a, b) => b.priority - a.priority).slice(0, 6);
  const segCounts = new Map<number, number>();
  rows.forEach((r) => segCounts.set(r.segment_id, (segCounts.get(r.segment_id) ?? 0) + 1));
  const cohort = artifacts.cohort;
  const sources = quality?.report?.sources ? Object.keys(quality.report.sources).length : 7;

  return (
    <>
      <PageHeader
        title={isMentor ? "Your mentees at a glance" : "Campus overview"}
        description={
          isMentor
            ? `${n} students assigned to you. Everything here is computed from your students only.`
            : `All ${fmtInt(n)} B.Tech 2nd and 3rd-year students across ${sources} integrated data sources, as of week 12 of the odd semester.`
        }
        actions={
          <Button asChild>
            <Link href="/this-week">
              Who to meet this week <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Students" value={fmtInt(n)} icon={Users} hint={isMentor ? "Your mentees" : `${cohort?.mentors ?? "-"} faculty mentors`} href="/students" />
        <Stat label="Avg Success Score" value={avg.toFixed(1)} icon={GraduationCap} hint="0-100, cohort percentile based" href="/model" />
        <Stat
          label="High academic risk"
          value={fmtInt(highA)}
          tone="high"
          icon={AlertTriangle}
          hint={`${((100 * highA) / n).toFixed(0)}% of students`}
          href="/students?academic=High"
        />
        <Stat
          label="High placement risk"
          value={fmtInt(highP)}
          tone="medium"
          icon={BriefcaseBusiness}
          hint={`of ${fmtInt(track.length)} on the placement track`}
          href="/students?placement=High"
        />
        <Stat
          label="Silent decliners"
          value={fmtInt(decliners)}
          tone="brand"
          icon={Lightbulb}
          hint={`${openInt} open interventions`}
          href="/students?alert=silent_decliner"
        />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Success Score distribution" description="Red below 40, green from 65. Hover a bar for the count.">
          <ScoreHistogram data={bins.map((b) => ({ ...b, bin: b.bin }))} />
        </Panel>
        <Panel title={isMentor ? "Academic risk by section" : "Academic risk by branch"} description="Number of students per risk level">
          <RiskByGroup data={[...groups.values()].sort((a, b) => b.High - a.High)} />
        </Panel>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Panel
          title="Meet first"
          description="Ranked by risk, urgency of alerts, and how fixable the drivers are"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/this-week">All</Link>
            </Button>
          }
          contentClassName="px-0"
        >
          <ul className="divide-y">
            {priority.map((r) => (
              <li key={r.id}>
                <Link href={`/students/${r.id}`} className="flex items-center gap-3 px-6 py-2.5 transition-colors hover:bg-accent/50">
                  <ScoreValue score={r.success_score} className="w-8 text-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {r.alerts[0]?.text ?? `${r.persona}`}
                    </span>
                  </span>
                  <RiskBadge level={r.academic_risk_level} label="Acad." />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Insights from combined data" description="Computed across sources. These only exist because the data was joined.">
          <div className="grid gap-3">
            {insights.slice(0, 4).map((ins) => (
              <article
                key={ins.id}
                className={cn(
                  "rounded-lg border-l-2 bg-muted/40 px-4 py-3",
                  ins.severity === "critical" ? "border-l-risk-high" : ins.severity === "warning" ? "border-l-risk-medium" : "border-l-brand",
                )}
              >
                <h3 className="text-sm font-medium">{ins.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{ins.body}</p>
              </article>
            ))}
            {insights.length === 0 && (
              <EmptyState icon={Info} title="No insights yet">
                Insights appear after the pipeline runs.
              </EmptyState>
            )}
          </div>
        </Panel>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Campus engagement this semester" description="Average weekly LMS logins and assignment completion. Mid-sem exams were in week 8.">
          {cohort?.weekly ? <WeeklyTrend data={cohort.weekly} /> : <EmptyState title="No weekly data" />}
        </Panel>
        <Panel
          title="Segments"
          description="Groups that need different kinds of help"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/segments">Open</Link>
            </Button>
          }
          contentClassName="px-0"
        >
          <ul className="divide-y">
            {segments.map((s) => (
              <li key={s.id}>
                <Link href={`/segments#seg-${s.id}`} className="flex items-center justify-between gap-3 px-6 py-2.5 text-sm hover:bg-accent/50">
                  <span className="truncate">{s.persona}</span>
                  <span className="tabular text-muted-foreground">{fmtInt(segCounts.get(s.id) ?? 0)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </section>
    </>
  );
}
