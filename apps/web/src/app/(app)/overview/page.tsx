import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, ArrowRight, BriefcaseBusiness, DatabaseZap, GraduationCap, Info, Users } from "lucide-react";
import { getArtifacts, getInsights, getInterventions, getProfile, getQualityReport, getSegments, getStudentRows, getWeeklyLogins } from "@/lib/data";
import { EmptyState, PageHeader, Panel, RiskBadge, ScoreValue, Stat } from "@/components/kit";
import { RiskByGroup, ScoreHistogram, WeeklyTrend } from "@/components/charts";
import { Stagger, StaggerItem } from "@/components/motion";
import { CampusHero } from "@/components/dashboard/campus-hero";
import { AgendaCalendar, type AgendaEvent } from "@/components/dashboard/agenda-calendar";
import { HealthHeatmap } from "@/components/dashboard/health-heatmap";
import { HelpCard } from "@/components/dashboard/help-card";
import { WeeklyEngagement } from "@/components/dashboard/weekly-engagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { fmtInt, INTERVENTION_LABEL, SOURCE_LABEL } from "@/lib/format";
import { stalest } from "@/lib/freshness";
import { cn } from "@/lib/utils";
import { istParts } from "@/lib/dates";
import type { StudentRow } from "@/lib/types";

export const metadata: Metadata = { title: "Overview" };

function firstName(full: string) {
  const clean = full.replace(/\(.*?\)/g, "").trim();
  const parts = clean.split(" ");
  return parts[0] === "Dr." || parts[0] === "Prof." ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0] || "there";
}

export default async function OverviewPage() {
  const [profile, rows, insights, segments, artifacts, interventions, quality, logins] = await Promise.all([
    getProfile(),
    getStudentRows(),
    getInsights(),
    getSegments(),
    getArtifacts(["cohort"]),
    getInterventions(),
    getQualityReport(),
    getWeeklyLogins(),
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

  const now = istParts();
  const hello = now.hour < 12 ? "Good morning" : now.hour < 17 ? "Good afternoon" : "Good evening";
  const isMentor = profile?.role === "mentor";
  const n = rows.length;
  const avg = rows.reduce((s, r) => s + r.success_score, 0) / n;
  const highA = rows.filter((r) => r.academic_risk_level === "High").length;
  const track = rows.filter((r) => r.placement_risk_level !== "N/A");
  const highP = track.filter((r) => r.placement_risk_level === "High").length;
  const decliners = rows.filter((r) => r.alerts.some((a) => a.type === "silent_decliner")).length;

  const bins = Array.from({ length: 20 }, (_, i) => ({ bin: `${i * 5}`, from: i * 5, count: 0 }));
  rows.forEach((r) => bins[Math.min(19, Math.floor(r.success_score / 5))].count++);

  const groupKey = isMentor ? (r: StudentRow) => `Y${r.year} ${r.branch} ${r.section}` : (r: StudentRow) => r.branch;
  const groups = new Map<string, { group: string; Low: number; Medium: number; High: number }>();
  rows.forEach((r) => {
    const k = groupKey(r);
    const g = groups.get(k) ?? { group: k, Low: 0, Medium: 0, High: 0 };
    g[r.academic_risk_level]++;
    groups.set(k, g);
  });

  const priority = [...rows].sort((a, b) => b.priority - a.priority).slice(0, 5);
  const segCounts = new Map<number, number>();
  rows.forEach((r) => segCounts.set(r.segment_id, (segCounts.get(r.segment_id) ?? 0) + 1));
  const cohort = artifacts.cohort;
  const sources = quality?.report?.sources ? Object.keys(quality.report.sources).length : 7;

  const names = new Map(rows.map((r) => [r.id, r.name]));
  const events: AgendaEvent[] = interventions
    .filter((i) => i.due_date && (i.status === "open" || i.status === "in_progress") && names.has(i.student_id))
    .map((i) => ({
      id: i.id,
      date: i.due_date!.slice(0, 10),
      title: names.get(i.student_id)!,
      sub: INTERVENTION_LABEL[i.type] ?? i.type,
      owner: i.owner_name,
      status: i.status,
      href: `/students/${i.student_id}`,
      overdue: i.due_date!.slice(0, 10) < now.date,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const overdue = events.filter((e) => e.overdue).length;

  // how current the data is, from dates inside the source files (the stalest dated source, or the first one past its limit)
  const old = stalest(quality?.report?.freshness);
  const freshNote = !old
    ? ""
    : old[1].stale
      ? ` ${SOURCE_LABEL[old[0]] ?? old[0]} data is ${old[1].age_days} days old, past its ${old[1].stale_after_days}-day limit: refresh that source.`
      : ` Oldest dated source: ${SOURCE_LABEL[old[0]] ?? old[0]}, ${old[1].age_days} days old.`;

  const summary = isMentor
    ? `${highA} of your ${n} mentees are at high academic risk and ${decliners} are quietly slipping. Start with the five below.${freshNote}`
    : `${fmtInt(highA)} of ${fmtInt(n)} students are at high academic risk, and ${decliners} silent decliners are hiding behind average scores. Data from ${sources} campus systems.${freshNote}`;

  return (
    <>
      <h1 className="sr-only">Overview</h1>
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <CampusHero
            greeting={`${hello}, ${firstName(profile?.full_name ?? "")}`}
            summary={summary}
            chips={[
              { label: `${decliners} silent decliners`, href: "/students?alert=silent_decliner" },
              ...(overdue ? [{ label: `${overdue} overdue`, href: "/interventions" }] : []),
            ]}
          />

          <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StaggerItem>
              <Stat label="Students" value={n} icon={Users} hint={isMentor ? "Your mentees" : `${cohort?.mentors ?? "-"} faculty mentors`} href="/students" />
            </StaggerItem>
            <StaggerItem>
              <Stat label="Avg Success Score" value={avg} decimals={1} icon={GraduationCap} hint="Out of 100" href="/model" />
            </StaggerItem>
            <StaggerItem>
              <Stat label="High academic risk" value={highA} tone="high" icon={AlertTriangle} hint={`${((100 * highA) / n).toFixed(0)}% of students`} href="/students?academic=High" />
            </StaggerItem>
            <StaggerItem>
              <Stat label="High placement risk" value={highP} tone="medium" icon={BriefcaseBusiness} hint={`of ${fmtInt(track.length)} on placement track`} href="/students?placement=High" />
            </StaggerItem>
          </Stagger>

          <Tabs defaultValue="focus" className="gap-4">
            <TabsList className="h-10 max-w-full justify-start overflow-x-auto rounded-full p-1">
              <TabsTrigger value="focus" className="rounded-full px-4">Focus</TabsTrigger>
              <TabsTrigger value="trends" className="rounded-full px-4">Trends</TabsTrigger>
              <TabsTrigger value="groups" className="rounded-full px-4">Groups</TabsTrigger>
            </TabsList>

            <TabsContent value="focus" className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
              <Panel className="lg:col-span-2" title="Weekly engagement" description={isMentor ? "LMS logins by section, weeks 1 to 12" : "LMS logins by branch, weeks 1 to 12"}>
                <WeeklyEngagement rows={rows} logins={logins} groupBy={groupKey} />
              </Panel>
              <Panel
                title="Meet first"
                description="Highest priority, with the main reason"
                action={
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/this-week">
                      Plan <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                }
                contentClassName="px-0"
              >
                <ul className="divide-y">
                  {priority.map((r) => (
                    <li key={r.id}>
                      <Link href={`/students/${r.id}`} className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-accent/50">
                        <ScoreValue score={r.success_score} className="w-8 text-lg" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{r.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{r.alerts[0]?.text ?? r.persona}</span>
                        </span>
                        <RiskBadge level={r.academic_risk_level} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel title="What the joined data shows" description="Insights that only exist because the sources were combined">
                <div className="grid gap-3">
                  {insights.slice(0, 3).map((ins) => (
                    <article
                      key={ins.id}
                      className={cn(
                        "rounded-xl border-l-2 bg-muted/40 px-4 py-3",
                        ins.severity === "critical" ? "border-l-risk-high" : ins.severity === "warning" ? "border-l-risk-medium" : "border-l-brand",
                      )}
                    >
                      <h3 className="text-sm font-medium">{ins.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{ins.body}</p>
                    </article>
                  ))}
                  {insights.length === 0 && (
                    <EmptyState icon={Info} title="No insights yet">
                      Insights appear after the pipeline runs.
                    </EmptyState>
                  )}
                </div>
              </Panel>
            </TabsContent>

            <TabsContent value="trends" className="grid gap-4 lg:grid-cols-2">
              <Panel title="Success Score distribution" description="Red below 40, green from 65">
                <ScoreHistogram data={bins} />
              </Panel>
              <Panel title="Engagement this semester" description="Weekly LMS logins and assignment completion. Mid-sem exams in week 8.">
                {cohort?.weekly ? <WeeklyTrend data={cohort.weekly} /> : <EmptyState title="No weekly data" />}
              </Panel>
            </TabsContent>

            <TabsContent value="groups" className="grid gap-4">
              <Panel title={isMentor ? "Strengths by section" : "Strengths by branch"} description="Where each group is strong, and where it needs support">
                <HealthHeatmap rows={rows} groupBy={groupKey} />
              </Panel>
              <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                <Panel title={isMentor ? "Academic risk by section" : "Academic risk by branch"} description="Students per risk level">
                  <RiskByGroup data={[...groups.values()].sort((a, b) => b.High - a.High)} />
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
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4" aria-label="Agenda">
          <AgendaCalendar events={events} today={now.date} />
          <HelpCard />
        </aside>
      </div>
    </>
  );
}
