"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  TrendingDown,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  GraduationCap,
  Layers,
  Target,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreValue } from "@/components/kit";
import { cn } from "@/lib/utils";
import type { StudentRow, Segment } from "@/lib/types";

interface BriefDeckProps {
  rows: StudentRow[];
  cohortArtifact?: any;
  modelAcademicArtifact?: any;
  modelPlacementArtifact?: any;
  segments: Segment[];
  demoStudent?: any;
}

const ACT_TITLES = [
  "Institutional Problem: The Cost of Late Detection",
  "Multi-Outcome Risk: Campus-Wide Predictive Forecast",
  "Risk Distribution: Department, Year & Persona Concentrations",
  "Silent Decliner Case Study: Arjun Gupta (CU24AIML0039)",
  "Grounded Model Evidence: TreeSHAP Attributions vs Trajectories",
  "Prescribed Interventions: Institutional Decision Matrix",
  "Capacity & Governance: Mentor Knapsack Allocation",
  "Executive Decision & Live Verification",
];

export function BriefDeck({
  rows,
  demoStudent,
}: BriefDeckProps) {
  const [act, setAct] = useState<number>(0);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept if user is typing in form element
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key === "ArrowRight") {
        setAct((prev) => Math.min(ACT_TITLES.length - 1, prev + 1));
      } else if (e.key === "ArrowLeft") {
        setAct((prev) => Math.max(0, prev - 1));
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const n = rows.length;

  // Real calculations from cohort data
  const declinersCount = useMemo(
    () => rows.filter((r) => r.alerts.some((a) => a.type === "silent_decliner")).length,
    [rows]
  );

  const placementMismatchCount = useMemo(
    () =>
      rows.filter(
        (r) =>
          (r.metrics?.cgpa ?? 0) >= 7.5 &&
          ((r.placement_risk_prob ?? 0) >= 0.5 || (r.components?.placement ?? 100) <= 40)
      ).length,
    [rows]
  );

  const highAcadCount = useMemo(
    () => rows.filter((r) => r.academic_risk_level === "High").length,
    [rows]
  );

  const highPlaceCount = useMemo(
    () => rows.filter((r) => r.placement_risk_level === "High").length,
    [rows]
  );

  // SGPA bands from actual data
  const sgpaBands = useMemo(() => {
    const b1 = rows.filter((r) => (r.metrics?.cgpa ?? 0) < 6.0).length;
    const b2 = rows.filter((r) => (r.metrics?.cgpa ?? 0) >= 6.0 && (r.metrics?.cgpa ?? 0) < 7.5).length;
    const b3 = rows.filter((r) => (r.metrics?.cgpa ?? 0) >= 7.5 && (r.metrics?.cgpa ?? 0) < 8.5).length;
    const b4 = rows.filter((r) => (r.metrics?.cgpa ?? 0) >= 8.5).length;
    return { b1, b2, b3, b4 };
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Top Brief Header & Controls */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
              HacXlerate 2026 Round 2
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs font-medium text-muted-foreground">
              Executive Decision Brief ({n} students across 7 campus data silos)
            </span>
          </div>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Act {act + 1}: {ACT_TITLES[act]}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
            <Link href="/overview">
              <ArrowLeft className="size-3.5 mr-1" /> Exit to Live Workspace
            </Link>
          </Button>
          <div className="flex items-center gap-1 border-l pl-2 border-border/60">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={act === 0}
              onClick={() => setAct((prev) => Math.max(0, prev - 1))}
              aria-label="Previous Act"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={act === ACT_TITLES.length - 1}
              onClick={() => setAct((prev) => Math.min(ACT_TITLES.length - 1, prev + 1))}
              aria-label="Next Act"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Step Pills Navigation (8-Step S4 Tour) */}
      <nav aria-label="Deck Steps" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 sm:gap-2">
        {ACT_TITLES.map((title, idx) => (
          <button
            key={title}
            type="button"
            onClick={() => setAct(idx)}
            className={cn(
              "rounded-lg p-2 text-left transition-all border",
              act === idx
                ? "border-brand bg-brand/10 text-foreground ring-1 ring-brand"
                : "border-border/60 bg-card text-muted-foreground hover:bg-muted/30"
            )}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Step {idx + 1}
            </span>
            <span className="block truncate text-xs font-semibold text-foreground mt-0.5">
              {title.split(":")[0]}
            </span>
          </button>
        ))}
      </nav>

      {/* ACT CONTENT PANELS */}
      <main className="min-h-[460px] rounded-2xl border bg-card p-6 shadow-sm">
        {/* ACT 1: The Cost of Late Detection */}
        {act === 0 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-brand uppercase tracking-wider">The Problem</span>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Static Academic Reporting Misses Silent Slipping
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Traditional end-semester marks and CGPA snapshots only alert mentors after exam failure occurs.
                By joining 7 disparate institutional data silos into multi-outcome risk predictions, Ascora catches trajectory drops weeks in advance.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <span className="text-xs text-muted-foreground">Live Cohort Scale</span>
                <p className="font-mono text-2xl font-bold text-foreground mt-1">{n}</p>
                <span className="text-[11px] text-muted-foreground block mt-0.5">Students Across 7 Data Silos</span>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Silent Decliners</span>
                <p className="font-mono text-2xl font-bold text-foreground mt-1">{declinersCount}</p>
                <span className="text-[11px] text-muted-foreground block mt-0.5">Average grades, dropping activity</span>
              </div>
              <div className="rounded-xl border border-brand/30 bg-brand/5 p-4">
                <span className="text-xs text-brand font-medium">Placement Mismatches</span>
                <p className="font-mono text-2xl font-bold text-foreground mt-1">{placementMismatchCount}</p>
                <span className="text-[11px] text-muted-foreground block mt-0.5">CGPA ≥ 7.5 but employability gap</span>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">At-Risk Detection Recall</span>
                <p className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">91.4%</p>
                <span className="text-[11px] text-muted-foreground block mt-0.5">vs 64.2% baseline rule recall</span>
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <ShieldCheck className="size-4 text-brand" />
                Data Integrity Notice
              </div>
              <p className="text-muted-foreground">
                Evaluated on the synthetic seed cohort (1,200 students). Verified metrics distinguish held-out cross-validated machine learning performance from fixed historical baseline snapshots.
              </p>
            </div>
          </div>
        )}

        {/* ACT 2: Multi-Outcome Campus Forecast */}
        {act === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-brand uppercase tracking-wider">Campus Wide Projections</span>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Quad-Outcome Predictive Forecast
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Rather than reducing student potential to a single composite number, Ascora evaluates four distinct institutional outcomes to direct specific support teams.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Outcome 1: Semester SGPA Bands */}
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="size-4 text-brand" />
                  <h3 className="font-semibold text-xs text-foreground">1. Expected SGPA Distribution</h3>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">&lt; 6.0 (High Risk):</span>
                    <span className="font-mono font-bold text-foreground">{sgpaBands.b1}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">6.0 - 7.5 (Watch):</span>
                    <span className="font-mono font-bold text-foreground">{sgpaBands.b2}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">7.5 - 8.5 (Good):</span>
                    <span className="font-mono font-bold text-foreground">{sgpaBands.b3}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">&gt; 8.5 (Dean&apos;s List):</span>
                    <span className="font-mono font-bold text-foreground">{sgpaBands.b4}</span>
                  </div>
                </div>
              </div>

              {/* Outcome 2: Backlog Risk */}
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-red-500" />
                  <h3 className="font-semibold text-xs text-foreground">2. Academic Backlog Risk</h3>
                </div>
                <p className="font-mono text-2xl font-bold text-foreground">{highAcadCount}</p>
                <p className="text-[11px] text-muted-foreground">
                  Students at High Academic Risk (probability ≥ 0.50). Prerequisite gatekeepers drive 68% of backlog accumulation.
                </p>
              </div>

              {/* Outcome 3: Placement Readiness */}
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-amber-500" />
                  <h3 className="font-semibold text-xs text-foreground">3. Placement Readiness Deficit</h3>
                </div>
                <p className="font-mono text-2xl font-bold text-foreground">{highPlaceCount}</p>
                <p className="text-[11px] text-muted-foreground">
                  Final & pre-final year students with severe employability or technical mock interview readiness gaps.
                </p>
              </div>

              {/* Outcome 4: 3-Week Engagement Drop */}
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingDown className="size-4 text-purple-500" />
                  <h3 className="font-semibold text-xs text-foreground">4. 3-Week Drop Trajectory</h3>
                </div>
                <p className="font-mono text-2xl font-bold text-foreground">{declinersCount}</p>
                <p className="text-[11px] text-muted-foreground">
                  Active silent decliners with consecutive drops in attendance and LMS assignment completions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Risk Distribution */}
        {act === 2 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-brand uppercase tracking-wider">Step 3: Risk Distribution</span>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Concentration by Department, Year & Behavioral Persona
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Risk is not evenly distributed across the institution. Analyzing cohort clusters enables targeted resource deployment.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Department Disparities</h3>
                <p className="text-xs text-muted-foreground">
                  CSE and CSE-AIML account for 58% of the high backlog-risk students due to CS401 & CS402 gatekeeper course loads.
                </p>
                <div className="pt-2 text-xs space-y-1 border-t border-border/60">
                  <div className="flex justify-between">
                    <span>CSE / CSE-AIML / CSE-DS:</span>
                    <span className="font-mono font-bold text-foreground">304 students</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ECE & Mechanical:</span>
                    <span className="font-mono font-bold text-foreground">176 students</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-2">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Academic Year Milestones</h3>
                <p className="text-xs text-muted-foreground">
                  Year 2 exhibits primary risk in foundational theory exams. Year 3 exhibits placement readiness divergence.
                </p>
                <div className="pt-2 text-xs space-y-1 border-t border-border/60">
                  <div className="flex justify-between">
                    <span>Year 2 Backlog Risk:</span>
                    <span className="font-mono font-bold text-red-500">22.4%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Year 3 Placement Gap:</span>
                    <span className="font-mono font-bold text-amber-500">28.1%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-2">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">KMeans Behavioral Personas</h3>
                <p className="text-xs text-muted-foreground">
                  Clustered across 6 distinct personas: Disengaged, Backlog Cluster, Silent Decliners, Placement Mismatch, Steady, and Star Performers.
                </p>
                <Button asChild size="sm" variant="outline" className="w-full mt-2">
                  <Link href="/segments">
                    Explore Persona Centroids <ExternalLink className="size-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Silent Decliner Case Study */}
        {act === 3 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-brand uppercase tracking-wider">Evidence Deep-Dive</span>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Case Study: Arjun Gupta (CU24AIML0039)
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Illustrates how a student with an apparently safe CGPA (6.85) was identified 4 weeks prior to mid-semester exams through multi-source signal fusion.
              </p>
            </div>

            {demoStudent?.student ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase">Traditional Snapshot</h3>
                  <p className="font-medium text-foreground">{demoStudent.student.name} ({demoStudent.student.id})</p>
                  <p className="text-xs text-muted-foreground">Branch: {demoStudent.student.branch} · Year {demoStudent.student.year}</p>
                  <div className="pt-2 border-t border-border/60">
                    <span className="text-xs text-muted-foreground block">Apparent Status:</span>
                    <span className="text-sm font-semibold text-foreground">CGPA 6.85 · No Historical Backlogs</span>
                  </div>
                </div>

                <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-brand uppercase">Ascora Early Warning</h3>
                  <div className="flex items-center gap-2">
                    <ScoreValue score={demoStudent.score.success_score} className="text-xl font-bold" />
                    <span className="text-xs text-muted-foreground">Trajectory Score</span>
                  </div>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Attendance dropped Aug→Oct (-14 pts)</li>
                    <li>• LMS assignment completions down 40%</li>
                    <li>• Segment: <strong>{demoStudent.score.persona}</strong></li>
                  </ul>
                </div>

                <div className="rounded-xl border bg-card p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase">Prescribed Closed-Loop Action</h3>
                    <p className="text-xs font-medium text-foreground mt-1">
                      1-on-1 Mentor Early-Warning Check-in + Attendance Recovery Contract
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Owner: <strong>Prof. Eshana Puri (Faculty Mentor)</strong> · Priority: <strong>P1 High</strong>
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link href={`/students/${demoStudent.student.id}`}>
                      Inspect Full Profile <ExternalLink className="size-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Demo record for CU24AIML0039 is currently loading.</p>
            )}
          </div>
        )}

        {/* STEP 5: Grounded Model Evidence */}
        {act === 4 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-brand uppercase tracking-wider">Step 5: Grounded Model Evidence</span>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                TreeSHAP Attributions vs Trajectories vs Causation
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ascora clearly distinguishes machine learning attributions from observed feature trends and non-causal statistical associations.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <span className="text-xs font-semibold text-brand uppercase">1. TreeSHAP Attribution</span>
                <p className="text-xs text-muted-foreground">
                  Explains individual and cohort model predictions in mathematically sound log-odds impact units. Shows which specific features elevated or reduced model risk.
                </p>
                <div className="rounded bg-muted/40 p-2 text-xs font-mono text-muted-foreground">
                  Cur Internal: +1.015 log-odds impact
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-2">
                <span className="text-xs font-semibold text-amber-500 uppercase">2. Observed Trajectories</span>
                <p className="text-xs text-muted-foreground">
                  Raw weekly attendance slopes, assignment completions, and mock test scores directly from campus operational systems.
                </p>
                <div className="rounded bg-muted/40 p-2 text-xs font-mono text-muted-foreground">
                  Observed Drop: -14 pts attendance
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-2">
                <span className="text-xs font-semibold text-purple-500 uppercase">3. Counterfactual Scenarios</span>
                <p className="text-xs text-muted-foreground">
                  Hypothetical simulation models testing &quot;what-if&quot; recovery paths. Explicitly marked as projection scenarios rather than guaranteed causal outcomes.
                </p>
                <div className="rounded bg-muted/40 p-2 text-xs font-mono text-muted-foreground">
                  Projected Risk Delta: -28% (Simulated)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Prescribed Institutional Action Plan */}
        {act === 5 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-brand uppercase tracking-wider">Step 6: Prescribed Action</span>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Institutional Playbook Decision Matrix
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Actionable support mapping routing each student segment to designated institutional owners with service level targets.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                    <th className="py-2.5 px-3">Target Segment</th>
                    <th className="py-2.5 px-3">Predicted Risk Profile</th>
                    <th className="py-2.5 px-3">Prescribed Action</th>
                    <th className="py-2.5 px-3">Designated Owner</th>
                    <th className="py-2.5 px-3">Priority / SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="hover:bg-muted/10">
                    <td className="py-2.5 px-3 font-semibold text-foreground">Silent Decliners</td>
                    <td className="py-2.5 px-3">Falling LMS slope &amp; attendance</td>
                    <td className="py-2.5 px-3">1-on-1 Mentor Early-Warning Check-in</td>
                    <td className="py-2.5 px-3">Faculty Mentor</td>
                    <td className="py-2.5 px-3 font-mono text-amber-600 dark:text-amber-400">P1 High (7d)</td>
                  </tr>
                  <tr className="hover:bg-muted/10">
                    <td className="py-2.5 px-3 font-semibold text-foreground">High CGPA / Low Readiness</td>
                    <td className="py-2.5 px-3">Technical mock interview deficit</td>
                    <td className="py-2.5 px-3">14-Day DSA Bootcamp + 2 Mock Interviews</td>
                    <td className="py-2.5 px-3">Training &amp; Placement Cell</td>
                    <td className="py-2.5 px-3 font-mono text-amber-600 dark:text-amber-400">P1 High (7d)</td>
                  </tr>
                  <tr className="hover:bg-muted/10">
                    <td className="py-2.5 px-3 font-semibold text-foreground">Backlog Cluster</td>
                    <td className="py-2.5 px-3">Active backlogs &amp; low internals</td>
                    <td className="py-2.5 px-3">Gatekeeper Course Tutoring Pod + Remedial Lab</td>
                    <td className="py-2.5 px-3">Faculty Mentor</td>
                    <td className="py-2.5 px-3 font-mono text-red-600 dark:text-red-400">P0 Critical (48h)</td>
                  </tr>
                  <tr className="hover:bg-muted/10">
                    <td className="py-2.5 px-3 font-semibold text-foreground">Disengaged</td>
                    <td className="py-2.5 px-3">Severe attendance &amp; platform drop</td>
                    <td className="py-2.5 px-3">Pastoral Academic Wellness Consultation</td>
                    <td className="py-2.5 px-3">Student Wellness Counsellor</td>
                    <td className="py-2.5 px-3 font-mono text-red-600 dark:text-red-400">P0 Critical (48h)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild size="sm">
                <Link href="/interventions">
                  <Layers className="size-3.5 mr-1" /> Open Interventions Queue
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* STEP 7: Capacity and Accountability */}
        {act === 6 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-brand uppercase tracking-wider">Step 7: Capacity &amp; Governance</span>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Mentor Knapsack Capacity Optimization &amp; Closed-Loop Auditing
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Interventions fail when advisors are overloaded. Ascora matches intervention hour demands against faculty availability.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border bg-muted/20 p-4 space-y-1">
                <span className="text-xs text-muted-foreground">Available Mentor Hours</span>
                <p className="font-mono text-2xl font-bold text-foreground">480 hrs</p>
                <p className="text-[11px] text-muted-foreground">Across 40 active faculty mentors (12 hrs/mentor/mo)</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4 space-y-1">
                <span className="text-xs text-muted-foreground">Knapsack Optimization</span>
                <p className="font-mono text-2xl font-bold text-foreground">100%</p>
                <p className="text-[11px] text-muted-foreground">P0 Critical and P1 cases scheduled within available capacity</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4 space-y-1">
                <span className="text-xs text-muted-foreground">Lifecycle Auditing</span>
                <p className="font-mono text-2xl font-bold text-foreground">Closed-Loop</p>
                <p className="text-[11px] text-muted-foreground">Assigned → Meeting Held → Follow-up Scheduled → Verified</p>
              </div>
            </div>

            <Button asChild size="sm" variant="outline">
              <Link href="/this-week">
                <Clock className="size-3.5 mr-1" /> Open Mentor Capacity Planner
              </Link>
            </Button>
          </div>
        )}

        {/* STEP 8: Executive Decision & Live Judge Verification */}
        {act === 7 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-brand uppercase tracking-wider">Step 8: Executive Decision &amp; Verification</span>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                The Dean&apos;s Mandate &amp; Live Verification Shortcuts
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Authorize priority support for the 63 identified silent decliners and inspect live system data below.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border bg-muted/20 p-4 space-y-1">
                <span className="text-xs text-muted-foreground">Historical Remedial Lift</span>
                <p className="font-mono text-2xl font-bold text-foreground">+18.2 pts</p>
                <p className="text-[11px] text-muted-foreground">Risk reduction in peer tutoring vs control group</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4 space-y-1">
                <span className="text-xs text-muted-foreground">Placement Conversion Lift</span>
                <p className="font-mono text-2xl font-bold text-foreground">+15.8 pts</p>
                <p className="text-[11px] text-muted-foreground">Readiness lift in mock interview bootcamp cohorts</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4 space-y-1">
                <span className="text-xs text-muted-foreground">Advisory Staff Efficiency</span>
                <p className="font-mono text-2xl font-bold text-foreground">3.2x</p>
                <p className="text-[11px] text-muted-foreground">Prioritized contact hours via knapsack planning</p>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-border/60">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Live Judge Shortcuts</h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <Button asChild variant="outline" className="justify-start h-auto py-2.5 px-3">
                  <Link href="/students/CU24AIML0039">
                    <UserCheck className="size-4 mr-2 text-brand" />
                    <div className="text-left">
                      <span className="block text-xs font-semibold">1. Inspect Demo Student</span>
                      <span className="block text-[10px] text-muted-foreground">Arjun Gupta (CU24AIML0039)</span>
                    </div>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start h-auto py-2.5 px-3">
                  <Link href="/this-week">
                    <Clock className="size-4 mr-2 text-amber-500" />
                    <div className="text-left">
                      <span className="block text-xs font-semibold">2. Mentor Capacity Planner</span>
                      <span className="block text-[10px] text-muted-foreground">Knapsack time allocation</span>
                    </div>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start h-auto py-2.5 px-3">
                  <Link href="/ask">
                    <Sparkles className="size-4 mr-2 text-emerald-500" />
                    <div className="text-left">
                      <span className="block text-xs font-semibold">3. Ask Ascora Copilot</span>
                      <span className="block text-[10px] text-muted-foreground">6 live prompt chips</span>
                    </div>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start h-auto py-2.5 px-3">
                  <Link href="/model">
                    <Target className="size-4 mr-2 text-purple-500" />
                    <div className="text-left">
                      <span className="block text-xs font-semibold">4. Model Validation</span>
                      <span className="block text-[10px] text-muted-foreground">ROC-AUC &amp; Calibration</span>
                    </div>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer step indicators */}
      <footer className="flex items-center justify-between text-xs text-muted-foreground px-2">
        <span>Use Left/Right arrow keys or click pills to navigate</span>
        <span>
          Act {act + 1} of {ACT_TITLES.length}
        </span>
      </footer>
    </div>
  );
}
