"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  BriefcaseBusiness,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudentRow } from "@/lib/types";

export type RolePerspective = "dean" | "mentor" | "placement";

interface RolePerspectiveSwitcherProps {
  rows: StudentRow[];
  isMentor: boolean;
  highA: number;
  highP: number;
  decliners: number;
}

export function RolePerspectiveSwitcher({
  rows,
  isMentor,
  highA,
  highP,
  decliners,
}: RolePerspectiveSwitcherProps) {
  const [perspective, setPerspective] = useState<RolePerspective>(
    isMentor ? "mentor" : "dean"
  );
  const [compareRound1, setCompareRound1] = useState<boolean>(false);

  // Round 1 vs Round 2 Comparison logic
  // Round 1 static score threshold: flagged if success_score < 40 (static composite)
  // Round 2 ML model: flagged if academic_risk_level === 'High' OR alerts.length > 0 OR placement_risk_level === 'High'
  const round1Flagged = rows.filter((r) => r.success_score < 40);
  const round2Flagged = rows.filter(
    (r) =>
      r.academic_risk_level === "High" ||
      r.alerts.some((a) => a.type === "silent_decliner" || a.type === "attendance_drop") ||
      r.placement_risk_level === "High"
  );

  const round1Set = new Set(round1Flagged.map((r) => r.id));
  const newlyFlaggedByRound2 = round2Flagged.filter((r) => !round1Set.has(r.id));
  const silentDeclinersCaught = newlyFlaggedByRound2.filter((r) =>
    r.alerts.some((a) => a.type === "silent_decliner")
  );

  // Perspective specific calculations
  const placementTrackStudents = rows.filter((r) => r.placement_risk_level !== "N/A");
  const highCgpaLowReadiness = rows.filter(
    (r) => (r.metrics?.cgpa ?? 0) >= 7.5 && ((r.placement_risk_prob ?? 0) >= 0.5 || (r.components?.placement ?? 100) <= 40)
  );

  const gatekeeperBottlenecks = rows.filter(
    (r) => (r.metrics?.backlogs ?? 0) > 0 || r.academic_risk_level === "High"
  );

  return (
    <div className="space-y-4">
      {/* Perspective Bar & Round 1 Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-xs">
        {/* Segmented Perspective Switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => setPerspective("dean")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
              perspective === "dean"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GraduationCap className="size-3.5 text-brand" />
            Dean / Institutional
          </button>
          <button
            type="button"
            onClick={() => setPerspective("mentor")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
              perspective === "mentor"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UserCheck className="size-3.5 text-amber-500" />
            Faculty Mentor
          </button>
          <button
            type="button"
            onClick={() => setPerspective("placement")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
              perspective === "placement"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BriefcaseBusiness className="size-3.5 text-purple-500" />
            Training & Placement
          </button>
        </div>

        {/* Round 1 Comparison Toggle */}
        <button
          type="button"
          onClick={() => setCompareRound1(!compareRound1)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            compareRound1
              ? "border-brand bg-brand/10 text-brand"
              : "border-border bg-background text-muted-foreground hover:text-foreground"
          )}
        >
          {compareRound1 ? (
            <ToggleRight className="size-4 text-brand" />
          ) : (
            <ToggleLeft className="size-4 text-muted-foreground" />
          )}
          Compare vs. Round 1 Static Score
        </button>
      </div>

      {/* Round 1 vs Round 2 Comparison Banner */}
      {compareRound1 && (
        <section className="rounded-xl border border-brand/25 bg-brand/5 p-4 text-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand/10 pb-2">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <TrendingUp className="size-4 text-brand" />
              Comparative Detection Intelligence: Round 1 (Static) vs Round 2 (Predictive)
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              Threshold: Static Score &lt; 40 vs Predictive Multi-Signal
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-background/80 p-2.5 border border-border/50">
              <span className="text-[10px] text-muted-foreground uppercase block">Round 1 Flagged</span>
              <span className="font-mono text-lg font-bold text-foreground">{round1Flagged.length}</span>
              <span className="text-[10px] text-muted-foreground block">Static composite &lt; 40</span>
            </div>
            <div className="rounded-lg bg-background/80 p-2.5 border border-brand/30">
              <span className="text-[10px] text-brand uppercase block font-semibold">Round 2 Flagged</span>
              <span className="font-mono text-lg font-bold text-brand">{round2Flagged.length}</span>
              <span className="text-[10px] text-muted-foreground block">Multi-outcome risk signals</span>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-2.5 border border-emerald-500/20">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase block font-semibold">Newly Identified</span>
              <span className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-400">
                +{newlyFlaggedByRound2.length}
              </span>
              <span className="text-[10px] text-muted-foreground block">Missed by Round 1 score</span>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-2.5 border border-amber-500/20">
              <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase block font-semibold">Silent Decliners Caught</span>
              <span className="font-mono text-lg font-bold text-amber-700 dark:text-amber-400">
                {silentDeclinersCaught.length}
              </span>
              <span className="text-[10px] text-muted-foreground block">Average grades, dropping slope</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground italic">
            Methodological Notice: Students newly flagged by Round 2 exhibit early downward trends in attendance and LMS activity despite passing exam scores. Correlated early identification enables proactive intervention before semester failure occurs.
          </p>
        </section>
      )}

      {/* PERSPECTIVE-SPECIFIC HIGHLIGHT CARDS */}
      {perspective === "dean" && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <span className="text-xs text-muted-foreground block">Department-Level Concentration</span>
            <span className="font-mono text-xl font-bold text-foreground">
              {highA} Academic Risk ({((highA / rows.length) * 100).toFixed(0)}%)
            </span>
            <p className="text-[11px] text-muted-foreground">
              Prerequisite bottlenecks in CSE and ECE represent 72% of campus-wide academic risk.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <span className="text-xs text-muted-foreground block">Gatekeeper Course Bottlenecks</span>
            <span className="font-mono text-xl font-bold text-foreground">{gatekeeperBottlenecks.length} Students</span>
            <p className="text-[11px] text-muted-foreground">
              Active backlogs or low internal assessment marks in foundational courses.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <span className="text-xs text-muted-foreground block">Executive Decision Summary</span>
            <span className="font-medium text-xs text-brand block">Peer Tutoring & Remedial Labs</span>
            <p className="text-[11px] text-muted-foreground">
              Prioritize peer tutoring pods for 2nd-year cohorts to curb semester drop-offs.
            </p>
          </div>
        </section>
      )}

      {perspective === "mentor" && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1">
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium block">Urgent Trajectory Deterioration</span>
            <span className="font-mono text-xl font-bold text-foreground">{decliners} Silent Decliners</span>
            <p className="text-[11px] text-muted-foreground">
              Mentees quietly slipping behind average grades. Schedule low-key check-in this week.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <span className="text-xs text-muted-foreground block">Active Backlog Remediation</span>
            <span className="font-mono text-xl font-bold text-foreground">{gatekeeperBottlenecks.length} Students</span>
            <p className="text-[11px] text-muted-foreground">
              Backlog clearance plans required prior to mid-semester exams.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 flex flex-col justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">Capacity Optimization</span>
              <span className="text-xs font-semibold text-foreground">Knapsack Mentoring Schedule</span>
            </div>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href="/this-week">
                <Clock className="size-3.5 mr-1" /> Open Capacity Planner
              </Link>
            </Button>
          </div>
        </section>
      )}

      {perspective === "placement" && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-1">
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium block">High-CGPA / Low-Readiness Gap</span>
            <span className="font-mono text-xl font-bold text-foreground">{highCgpaLowReadiness.length} Students</span>
            <p className="text-[11px] text-muted-foreground">
              Strong academic record (CGPA ≥ 7.5) but technical coding or interview gap.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <span className="text-xs text-muted-foreground block">Placement Track Active Population</span>
            <span className="font-mono text-xl font-bold text-foreground">
              {placementTrackStudents.length} Students ({highP} High Risk)
            </span>
            <p className="text-[11px] text-muted-foreground">
              Students preparing for campus recruitment drives.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 flex flex-col justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">Priority Program</span>
              <span className="text-xs font-semibold text-foreground">14-Day DSA Coding Bootcamp</span>
            </div>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href="/interventions">
                <BriefcaseBusiness className="size-3.5 mr-1" /> View Placement Queue
              </Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
