"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  ExternalLink,
  GraduationCap,
  Layers,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Panel, RiskBadge, Stat } from "@/components/kit";
import { cn } from "@/lib/utils";
import type { Role, StudentRow } from "@/lib/types";

interface BriefClientProps {
  role: Role;
  rows: StudentRow[];
}

const ACT_TITLES = [
  "Cost of Late Detection",
  "Multi-Outcome Campus Forecast",
  "Silent Decliner Case Study",
  "Institutional Action Plan",
  "Projected Impact and Judge Verification",
] as const;

export function BriefClient({ role, rows }: BriefClientProps) {
  const [act, setAct] = useState<number>(1);

  // Act 1 interactive state
  const [detectionWeek, setDetectionWeek] = useState<number>(4);

  // Act 2 interactive state
  const [forecastView, setForecastView] = useState<string>("overview");

  // Act 3 interactive state
  const [caseView, setCaseView] = useState<"traditional" | "ascora">("ascora");

  // Act 4 interactive state
  const [mentorHours, setMentorHours] = useState<number>(4);

  // Global Keyboard Navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.getAttribute?.("role") === "slider"
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        setAct((prev) => Math.max(1, prev - 1));
      } else if (e.key === "ArrowRight") {
        setAct((prev) => Math.min(5, prev + 1));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Act 1 dynamic calculations
  const remediationRate = Math.max(18, Math.round(92 - (detectionWeek - 2) * 5.4));
  const mentorHoursPerStudent = (1.2 + (detectionWeek - 2) * 0.42).toFixed(1);
  const costPerStudent = Math.round(12000 + Math.pow(detectionWeek, 1.82) * 710);
  const totalAtRiskCount = 170;
  const recoveredStudents = Math.round(totalAtRiskCount * (remediationRate / 100));
  const avertedLossLakhs = ((recoveredStudents * 120000) / 100000).toFixed(1);

  // Act 4 dynamic calculations
  const mentorCount = 21;
  const weeklyHoursTotal = mentorCount * mentorHours;
  const weeklySessions = weeklyHoursTotal * 3; // 20-min slots
  const highRiskStudents = 89;
  const highRiskCoverage = Math.min(100, Math.round((weeklySessions / highRiskStudents) * 100));
  const weeksToTriageAll = (highRiskStudents / weeklySessions).toFixed(1);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Workspace Exit */}
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-6 items-center justify-center rounded-md bg-brand/10 text-brand">
              <Sparkles className="size-3.5" />
            </span>
            <span className="font-mono text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Ascora Executive Intelligence
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Dean&apos;s Executive Decision Brief
          </h1>
          <p className="text-sm text-muted-foreground">
            Strategic diagnosis, dual-risk campus projections, and capacity-aware intervention protocols.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/overview"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground shadow-xs"
          >
            <span>Exit to Live Workspace</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* 5-Step Act Indicator Bar */}
      <nav aria-label="Executive Brief Steps" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {ACT_TITLES.map((title, idx) => {
          const stepNum = idx + 1;
          const isActive = act === stepNum;
          const isCompleted = act > stepNum;
          return (
            <button
              key={title}
              type="button"
              onClick={() => setAct(stepNum)}
              className={cn(
                "group relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                isActive
                  ? "border-brand/60 bg-brand/5 shadow-xs ring-1 ring-brand/30"
                  : isCompleted
                  ? "border-border/60 bg-card/60 hover:border-border hover:bg-accent/40"
                  : "border-border/40 bg-card/30 opacity-75 hover:opacity-100",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={cn(
                    "font-mono text-[11px] font-semibold",
                    isActive ? "text-brand" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/70",
                  )}
                >
                  Act {stepNum}
                </span>
                {isCompleted ? (
                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      isActive ? "bg-brand animate-pulse" : "bg-border",
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "line-clamp-2 text-xs font-medium leading-snug",
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground group-hover:text-foreground",
                )}
              >
                {title}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ACT 1: Cost of Late Detection */}
      {act === 1 && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="font-mono text-xs font-semibold text-brand uppercase">Act 1 of 5</span>
              <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                Cost of Late Detection: The Dean&apos;s Dilemma
              </h2>
              <p className="text-sm text-muted-foreground">
                Delayed identification turns solvable study-habit drift into irreversible semester backlogs and attrition.
              </p>
            </div>
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              Demo Data · Illustrative Baseline
            </Badge>
          </div>

          {/* Interactive Week Slider */}
          <Card className="border-border/80 bg-card/70 backdrop-blur-xs">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Interactive Intervention Timeline Simulator
                  </CardTitle>
                  <CardDescription>
                    Drag the detection week to evaluate how remediation efficacy and institutional costs shift over the term.
                  </CardDescription>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1 font-mono text-sm font-semibold">
                  <Clock className="size-4 text-brand" />
                  <span>Detection at Week {detectionWeek}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Slider
                  min={2}
                  max={16}
                  step={1}
                  value={[detectionWeek]}
                  onValueChange={(val) => setDetectionWeek(val[0] ?? 4)}
                  className="py-2"
                />
                <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                  <span>Week 2 (Early Ingest)</span>
                  <span>Week 6 (Mid-term Pre-warning)</span>
                  <span>Week 10 (Late Warning)</span>
                  <span>Week 16 (Exam Results)</span>
                </div>
              </div>

              {/* Dynamic reactive metrics */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat
                  label="Remediation Success"
                  value={`${remediationRate}%`}
                  hint={detectionWeek <= 6 ? "High recovery probability" : "Marginal recovery window"}
                  tone={remediationRate > 60 ? "brand" : "risk-high"}
                />
                <Stat
                  label="Mentor Hours / Student"
                  value={`${mentorHoursPerStudent} hrs`}
                  hint="Faculty effort required"
                />
                <Stat
                  label="Remedial Cost / Student"
                  value={`₹${costPerStudent.toLocaleString()}`}
                  hint="Tutoring and exam retake load"
                />
                <Stat
                  label="Cohort Value Preserved"
                  value={`₹${avertedLossLakhs} L`}
                  hint={`${recoveredStudents} of ${totalAtRiskCount} students saved`}
                  tone="brand"
                />
              </div>
            </CardContent>
          </Card>

          {/* Comparative analysis */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/60 bg-card/60">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="size-4" />
                  <CardTitle className="text-sm font-semibold">Traditional Post-Mortem Audits (Week 16)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
                <p>
                  Institutional ERP records student outcomes only after final grades are entered. By that date, course backlogs are permanent, delaying placement eligibility.
                </p>
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-foreground">
                  <p className="font-semibold text-destructive">Typical Semester Toll (Demo Baseline):</p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-xs text-muted-foreground">
                    <li>170 students suffer active course backlogs.</li>
                    <li>22% average retention recovery rate after official failure notice.</li>
                    <li>Estimated ₹2.04 Cr cumulative delay and remedial liability across campus.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-brand">
                  <Sparkles className="size-4" />
                  <CardTitle className="text-sm font-semibold">Ascora Continuous Multi-Signal Warning (Week 4)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
                <p>
                  By correlating weekly biometric attendance with LMS turnaround delays, Ascora detects behavioural drift 6 to 8 weeks before midterm assessments.
                </p>
                <div className="rounded-lg border border-brand/20 bg-brand/5 p-3 text-foreground">
                  <p className="font-semibold text-brand">Early Intervention Advantage:</p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-xs text-muted-foreground">
                    <li>82% of drifting students return to safe zone before exams.</li>
                    <li>Reduces required faculty mentor time from 7.0 to 1.8 hours per student.</li>
                    <li>Preserves student confidence without punitive public alerts.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* ACT 2: Multi-Outcome Campus Forecast */}
      {act === 2 && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="font-mono text-xs font-semibold text-brand uppercase">Act 2 of 5</span>
              <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                Multi-Outcome Campus Forecast: Dual Risk Models
              </h2>
              <p className="text-sm text-muted-foreground">
                Ascora deploys separate calibrated LightGBM models for academic risk and placement risk, avoiding blunt blended scores.
              </p>
            </div>
            <Badge variant="outline" className="border-brand/40 bg-brand/10 text-brand">
              Demo Cohort: 1,200 Students
            </Badge>
          </div>

          {/* Model separation rationale */}
          <Card className="border-brand/30 bg-card/70">
            <CardContent className="pt-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <GraduationCap className="size-4 text-brand" />
                    <span>Academic Model</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Predicts course failure or new backlog. Held-out ROC-AUC <strong className="text-foreground">0.881</strong> (5-fold CV 0.870).
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Briefcase className="size-4 text-brand" />
                    <span>Placement Model</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Predicts unplaced status by final year. Held-out ROC-AUC <strong className="text-foreground">0.802</strong> (5-fold CV 0.839).
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Target className="size-4 text-brand" />
                    <span>Intent Awareness</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    330 students seeking Higher Studies, Govt, or Startups receive readiness views without false placement flags.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Cohort Breakdown Tabs */}
          <Tabs value={forecastView} onValueChange={setForecastView} className="space-y-4">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="overview">Cohort Overview</TabsTrigger>
              <TabsTrigger value="academic">Academic Risk</TabsTrigger>
              <TabsTrigger value="placement">Placement Track</TabsTrigger>
              <TabsTrigger value="dual">Dual Jeopardy</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Total Enrolled" value="1,200" hint="Campus demonstration cohort" />
                <Stat label="High Academic Risk" value="89" hint="7.4% need academic support" tone="risk-high" />
                <Stat label="High Placement Risk" value="112" hint="9.3% of 870 placement seekers" tone="risk-medium" />
                <Stat label="Dual High Risk" value="34" hint="2.8% in double jeopardy" tone="risk-high" />
              </div>
              <Panel title="Cohort Risk Distribution" description="Calibrated risk segmentation across all 1,200 demo students">
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Low Risk Cohort (Safe Zone)</span>
                      <span className="font-mono font-semibold">927 students (77.3%)</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: "77.3%" }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Medium Risk Cohort (Watchlist)</span>
                      <span className="font-mono font-semibold">184 students (15.3%)</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: "15.3%" }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>High Risk Cohort (Action Required)</span>
                      <span className="font-mono font-semibold">89 students (7.4%)</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: "7.4%" }} />
                    </div>
                  </div>
                </div>
              </Panel>
            </TabsContent>

            <TabsContent value="academic" className="space-y-4">
              <Panel title="Academic Risk Focus (89 High Risk Students)" description="Driven by internal assessments, core subject attendance, and past backlogs">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground font-medium">Top Predictive Factor</p>
                    <p className="text-sm font-semibold mt-1">Core Subject Attendance</p>
                    <p className="text-xs text-muted-foreground mt-0.5">SHAP mean importance 0.28. Core attendance under 65% triggers 4x risk.</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground font-medium">Second Factor</p>
                    <p className="text-sm font-semibold mt-1">Internal Exam Variance</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Drop in internal exam scores relative to personal baseline.</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground font-medium">Recommended Action</p>
                    <p className="text-sm font-semibold mt-1">Subject Recovery Plan</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Mentor schedules targeted subject remedial sessions before finals.</p>
                  </div>
                </div>
              </Panel>
            </TabsContent>

            <TabsContent value="placement" className="space-y-4">
              <Panel title="Placement Readiness Focus (870 Track Students)" description="Evaluated on coding tests, aptitude percentiles, and mock interview practice">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground font-medium">Zero Mock Visits</p>
                    <p className="text-sm font-semibold mt-1">68 Students</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Eligible seniors who have never attended a placement cell mock trial.</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground font-medium">Aptitude Score Gap</p>
                    <p className="text-sm font-semibold mt-1">44 Students</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Aptitude percentile in bottom quartile despite passing technical tests.</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground font-medium">Exempt Intent Groups</p>
                    <p className="text-sm font-semibold mt-1">330 Students</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Higher Studies (180), Govt Exams (90), Entrepreneurship (60).</p>
                  </div>
                </div>
              </Panel>
            </TabsContent>

            <TabsContent value="dual" className="space-y-4">
              <Panel title="Dual Jeopardy (34 Critical Students)" description="Students simultaneously flagged at high risk in both academic and placement models">
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-xs text-foreground leading-relaxed">
                  <p className="font-semibold text-destructive text-sm">Dean&apos;s Priority Mandate:</p>
                  <p className="mt-1 text-muted-foreground">
                    These 34 individuals represent the highest likelihood of campus dropout and unplaced graduation. Ascora automatically flags them for joint review between department mentor and placement officer, avoiding split or contradictory advice.
                  </p>
                </div>
              </Panel>
            </TabsContent>
          </Tabs>
        </section>
      )}

      {/* ACT 3: Silent Decliner Case Study */}
      {act === 3 && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="font-mono text-xs font-semibold text-brand uppercase">Act 3 of 5</span>
              <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                Silent Decliner Case Study: Aarav Sharma
              </h2>
              <p className="text-sm text-muted-foreground">
                How strong historical grades conceal rapid mid-semester disengagement until exam failure occurs.
              </p>
            </div>
            <Badge variant="outline" className="border-brand/40 bg-brand/10 text-brand">
              Case Study Archetype · Demo Data
            </Badge>
          </div>

          {/* Student Profile Card */}
          <Card className="border-border/80 bg-card/60">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Aarav Sharma (CU220418)</CardTitle>
                  <CardDescription>B.Tech Computer Science and Engineering, 3rd Year, Section B</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Cumulative CGPA: 7.92</Badge>
                  <RiskBadge level="High" prob={0.84} label="Academic risk" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Toggle View */}
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-2">
                <span className="text-xs font-medium text-muted-foreground pl-2">Compare Diagnostic Perspectives:</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={caseView === "traditional" ? "default" : "ghost"}
                    onClick={() => setCaseView("traditional")}
                    className="text-xs h-7"
                  >
                    Traditional Silo View
                  </Button>
                  <Button
                    size="sm"
                    variant={caseView === "ascora" ? "default" : "ghost"}
                    onClick={() => setCaseView("ascora")}
                    className="text-xs h-7"
                  >
                    Ascora 360 Unified View
                  </Button>
                </div>
              </div>

              {caseView === "traditional" ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border p-3 bg-muted/20">
                    <p className="text-xs font-medium text-muted-foreground">ERP Academic Record</p>
                    <p className="text-lg font-bold text-foreground mt-1">7.92 CGPA</p>
                    <p className="text-xs text-emerald-600 mt-1">Status: Satisfactory (No flags)</p>
                  </div>
                  <div className="rounded-lg border p-3 bg-muted/20">
                    <p className="text-xs font-medium text-muted-foreground">Biometric Attendance</p>
                    <p className="text-lg font-bold text-foreground mt-1">75.4% Overall</p>
                    <p className="text-xs text-emerald-600 mt-1">Status: Above 75% cutoff rule</p>
                  </div>
                  <div className="rounded-lg border p-3 bg-muted/20">
                    <p className="text-xs font-medium text-muted-foreground">Campus Verdict</p>
                    <p className="text-lg font-bold text-muted-foreground mt-1">No Action</p>
                    <p className="text-xs text-muted-foreground mt-1">Slipped through conventional radar</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                    <p className="text-xs font-medium text-rose-700 dark:text-rose-400">Core Subject Attendance</p>
                    <p className="text-lg font-bold text-foreground mt-1">61.2% Core</p>
                    <p className="text-xs text-rose-600 mt-1">Down 27% from August baseline</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">LMS Submission Delay</p>
                    <p className="text-lg font-bold text-foreground mt-1">+4.2 Days Slip</p>
                    <p className="text-xs text-amber-600 mt-1">Completion dropped from 94% to 42%</p>
                  </div>
                  <div className="rounded-lg border border-brand/30 bg-brand/5 p-3">
                    <p className="text-xs font-medium text-brand">Ascora SHAP Explanation</p>
                    <p className="text-lg font-bold text-foreground mt-1">Silent Decliner</p>
                    <p className="text-xs text-muted-foreground mt-1">Core subjects and lab lag trigger alert</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline of the trajectory */}
          <Panel title="Longitudinal Trajectory of Silent Disengagement" description="How the alert materialized across the semester timeline">
            <div className="grid gap-3 sm:grid-cols-4 pt-1">
              <div className="rounded-lg border p-3 space-y-1">
                <span className="font-mono text-[11px] font-semibold text-muted-foreground">Week 2</span>
                <p className="text-sm font-semibold">Normal Baseline</p>
                <p className="text-xs text-muted-foreground">Attendance at 88%, submits labs on schedule, low risk score.</p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
                <span className="font-mono text-[11px] font-semibold text-amber-700 dark:text-amber-400">Week 5 (Early Drift)</span>
                <p className="text-sm font-semibold">Misses 2 Core Labs</p>
                <p className="text-xs text-muted-foreground">LMS turnaround slips by 3.4 days. Ascora flags silent decliner alert.</p>
              </div>
              <div className="rounded-lg border border-brand/40 bg-brand/5 p-3 space-y-1">
                <span className="font-mono text-[11px] font-semibold text-brand">Week 8 (Intervention)</span>
                <p className="text-sm font-semibold">Mentor Consultation</p>
                <p className="text-xs text-muted-foreground">Mentor uses Ascora recourse advice to agree on a 4-week recovery plan.</p>
              </div>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1">
                <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Week 14 (Recovery)</span>
                <p className="text-sm font-semibold">Safe Zone Restored</p>
                <p className="text-xs text-muted-foreground">Core attendance rebounds to 78%, coursework submitted, zero backlogs.</p>
              </div>
            </div>
          </Panel>
        </section>
      )}

      {/* ACT 4: Institutional Action Plan */}
      {act === 4 && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="font-mono text-xs font-semibold text-brand uppercase">Act 4 of 5</span>
              <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                Institutional Action Plan: Capacity-Aware Triage
              </h2>
              <p className="text-sm text-muted-foreground">
                Turning alerts into actionable faculty workflows without exceeding advising capacity.
              </p>
            </div>
            <Badge variant="outline" className="border-brand/40 bg-brand/10 text-brand">
              Operational Model · Campus Capacity
            </Badge>
          </div>

          {/* Mentor Capacity Slider */}
          <Card className="border-border/80 bg-card/70 backdrop-blur-xs">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Faculty Mentor Advising Capacity Model</CardTitle>
                  <CardDescription>
                    Adjust weekly mentoring hours allocated per faculty member across campus (21 designated mentors).
                  </CardDescription>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1 font-mono text-sm font-semibold">
                  <Users className="size-4 text-brand" />
                  <span>{mentorHours} Hours / Mentor / Week</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Slider
                  min={2}
                  max={8}
                  step={1}
                  value={[mentorHours]}
                  onValueChange={(val) => setMentorHours(val[0] ?? 4)}
                  className="py-2"
                />
                <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                  <span>2 hrs (Light advising)</span>
                  <span>4 hrs (Balanced target)</span>
                  <span>6 hrs (Midterm sprint)</span>
                  <span>8 hrs (Intensive support)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat
                  label="Campus Advising Capacity"
                  value={`${weeklyHoursTotal} hrs/wk`}
                  hint="21 faculty mentors combined"
                />
                <Stat
                  label="1-on-1 Sessions Available"
                  value={`${weeklySessions} / wk`}
                  hint="20-minute structured check-ins"
                />
                <Stat
                  label="High-Risk Cohort Coverage"
                  value={`${highRiskCoverage}%`}
                  hint={`${highRiskStudents} priority cases total`}
                  tone={highRiskCoverage >= 100 ? "brand" : "risk-medium"}
                />
                <Stat
                  label="Triage Cycle Time"
                  value={`${weeksToTriageAll} wks`}
                  hint="Weeks to consult all high risk students"
                />
              </div>
            </CardContent>
          </Card>

          {/* 4-Stage Operating Cadence */}
          <Panel title="Four-Stage Operating Protocol" description="How Ascora guides faculty from initial signal to verified outcome">
            <div className="grid gap-3 sm:grid-cols-4 pt-1">
              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-brand">
                  <Clock className="size-3.5" />
                  <span>1. Monday Triage</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Automated priority ranking filters out false flags and highlights the top 5 students each mentor must see.
                </p>
              </div>
              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-brand">
                  <Sparkles className="size-3.5" />
                  <span>2. Supportive Outreach</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pre-drafted, constructive appointment invites without demoralising or punitive risk terminology.
                </p>
              </div>
              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-brand">
                  <Target className="size-3.5" />
                  <span>3. Actionable Recourse</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  15-minute diagnostic session focusing on the minimum specific behaviors that lower the student&apos;s probability.
                </p>
              </div>
              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-brand">
                  <CheckCircle2 className="size-3.5" />
                  <span>4. Outcome Tracking</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  System locks baseline metrics upon scheduling and tracks subsequent movement (Improved, Stable, Escalated).
                </p>
              </div>
            </div>
          </Panel>
        </section>
      )}

      {/* ACT 5: Projected Impact and Judge Verification */}
      {act === 5 && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="font-mono text-xs font-semibold text-brand uppercase">Act 5 of 5</span>
              <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                Projected Impact and Judge Verification
              </h2>
              <p className="text-sm text-muted-foreground">
                Measurable institutional returns and transparent verification gates across the KPMG challenge deliverables.
              </p>
            </div>
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              Challenge 04 Verification Gate · Demo Data
            </Badge>
          </div>

          {/* ROI Metric Tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Backlog Reduction" value="-28%" hint="Projected course failures avoided" tone="brand" />
            <Stat label="Placement Eligibility" value="+19%" hint="Students qualifying for placement" tone="brand" />
            <Stat label="Value Retained / Cohort" value="₹48 Lakhs" hint="Tuition, remedial, and placement gains" tone="brand" />
            <Stat label="Audit Lineage" value="100%" hint="Every score traceable to source row" />
          </div>

          {/* Judge Verification Gateway */}
          <Panel title="Judge Verification Gateway" description="Direct access to live challenge implementations across the platform">
            <div className="grid gap-3 sm:grid-cols-2 pt-1">
              <Link
                href="/data"
                className="group flex flex-col justify-between rounded-lg border p-4 transition-colors hover:border-brand/50 hover:bg-brand/5"
              >
                <div>
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>1. Data Integration Pipeline</span>
                    <ExternalLink className="size-4 text-muted-foreground group-hover:text-brand" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    7 disparate sources ingested, 60 schema conflicts resolved by rule, 1.00 precision and 0.95 recall on fuzzy matching.
                  </p>
                </div>
                <span className="mt-3 font-mono text-[11px] font-semibold text-brand">Inspect /data &rarr;</span>
              </Link>

              <Link
                href="/model"
                className="group flex flex-col justify-between rounded-lg border p-4 transition-colors hover:border-brand/50 hover:bg-brand/5"
              >
                <div>
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>2. Success Score & Model Accuracy</span>
                    <ExternalLink className="size-4 text-muted-foreground group-hover:text-brand" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Transparent 6-component weighted formula, calibrated LightGBM models with held-out ROC-AUC 0.881 / 0.802, and OULAD benchmarks.
                  </p>
                </div>
                <span className="mt-3 font-mono text-[11px] font-semibold text-brand">Inspect /model &rarr;</span>
              </Link>

              <Link
                href="/students"
                className="group flex flex-col justify-between rounded-lg border p-4 transition-colors hover:border-brand/50 hover:bg-brand/5"
              >
                <div>
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>3. Student 360 & Recourse Simulator</span>
                    <ExternalLink className="size-4 text-muted-foreground group-hover:text-brand" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Student 360 with per-student SHAP explanation drivers, multi-source raw lineage, and counterfactual recourse planning.
                  </p>
                </div>
                <span className="mt-3 font-mono text-[11px] font-semibold text-brand">Inspect /students &rarr;</span>
              </Link>

              <Link
                href="/fairness"
                className="group flex flex-col justify-between rounded-lg border p-4 transition-colors hover:border-brand/50 hover:bg-brand/5"
              >
                <div>
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>4. Fairness Audit & Privacy Controls</span>
                    <ExternalLink className="size-4 text-muted-foreground group-hover:text-brand" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    10-point demographic parity check, DPDP-aligned contact masking, role-based access control, and audit logs.
                  </p>
                </div>
                <span className="mt-3 font-mono text-[11px] font-semibold text-brand">Inspect /fairness &rarr;</span>
              </Link>
            </div>
          </Panel>

          {/* Live Workspace Exit CTA */}
          <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-brand/40 bg-brand/5 p-6 sm:flex-row">
            <div className="space-y-1">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Executive Brief Complete
              </h3>
              <p className="text-xs text-muted-foreground">
                Proceed into the live operational workspace to review cohort health, schedule student check-ins, or run data queries.
              </p>
            </div>
            <Link
              href="/overview"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90 shadow-sm"
            >
              <span>Enter Live Workspace</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      )}

      {/* Bottom Navigation & Controls */}
      <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={act === 1}
          onClick={() => setAct((prev) => Math.max(1, prev - 1))}
          className="gap-1.5"
        >
          <ChevronLeft className="size-4" />
          <span>Previous Act</span>
        </Button>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Act {act} of 5</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden font-mono text-[11px] sm:inline">Use Left and Right arrow keys</span>
        </div>

        {act < 5 ? (
          <Button
            size="sm"
            onClick={() => setAct((prev) => Math.min(5, prev + 1))}
            className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"
          >
            <span>Next Act</span>
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Link
            href="/overview"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
          >
            <span>Exit to Overview</span>
            <ArrowRight className="size-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
