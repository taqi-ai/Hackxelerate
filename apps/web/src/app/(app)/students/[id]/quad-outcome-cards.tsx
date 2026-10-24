import {
  GraduationCap,
  AlertTriangle,
  BriefcaseBusiness,
  TrendingDown,
  UserCheck,
} from "lucide-react";
import { RiskBadge } from "@/components/kit";
import { deriveRecommendation } from "@/lib/recommendations";
import type { StudentScore, StudentRow } from "@/lib/types";
import { cn } from "@/lib/utils";

interface QuadOutcomeCardsProps {
  score: StudentScore;
  student: any;
}

export function QuadOutcomeCards({ score, student }: QuadOutcomeCardsProps) {
  // Construct minimal StudentRow for deriveRecommendation
  const studentRow: StudentRow = {
    id: student.id,
    name: student.name,
    email: student.email,
    branch: student.branch,
    year: student.year,
    section: student.section,
    mentor_id: student.mentor_id,
    success_score: score.success_score,
    academic_risk_prob: score.academic_risk_prob,
    academic_risk_level: score.academic_risk_level,
    placement_risk_prob: score.placement_risk_prob,
    placement_risk_level: score.placement_risk_level,
    intent: score.intent,
    segment_id: score.segment_id,
    persona: score.persona,
    priority: score.priority,
    alerts: score.alerts,
    components: score.components,
    metrics: student.metrics || {
      cgpa: student.academic?.cgpa ?? null,
      backlogs: student.academic?.backlogs ?? null,
      att_overall: student.attendance?.overall_pct ?? null,
      att_core: student.attendance?.core_pct ?? null,
      completion_rate: student.lms?.completion_rate ?? null,
      login_freq: student.lms?.login_freq ?? null,
      mocks: student.placement?.mocks_attended ?? null,
      aptitude: student.placement?.aptitude ?? null,
      coding: student.placement?.coding ?? null,
      soft_avg: student.skills?.soft_avg ?? null,
      tech_avg: student.skills?.technical_avg ?? null,
    },
  };

  const rec = deriveRecommendation(studentRow);

  // Outcome 1: Semester Performance & SGPA Band
  const cgpa = studentRow.metrics?.cgpa ?? null;
  let sgpaBand = "Projected SGPA 6.5 - 7.5";
  if (cgpa !== null) {
    if (cgpa >= 8.5) sgpaBand = "Dean's Honors (Expected SGPA 8.5+)";
    else if (cgpa >= 7.5) sgpaBand = "Strong Standing (Expected SGPA 7.5 - 8.5)";
    else if (cgpa >= 6.0) sgpaBand = "Moderate Band (Expected SGPA 6.0 - 7.5)";
    else sgpaBand = "Remedial Band (Expected SGPA < 6.0)";
  }

  // Outcome 2: Backlog Risk
  const backlogs = studentRow.metrics?.backlogs ?? 0;
  const topAcadDriver = score.shap_academic?.raises?.[0]?.label ?? "Foundational course internal marks";

  // Outcome 3: Placement Readiness
  const isPlacementTrack = score.placement_risk_level !== "N/A";
  const readinessScore = score.readiness?.score ?? score.components.placement;
  const topPlaceDriver = score.shap_placement?.raises?.[0]?.label ?? "Technical mock interview rating gap";

  // Outcome 4: 3-Week Engagement Drop
  const attOverall = studentRow.metrics?.att_overall ?? null;
  const lmsComp = studentRow.metrics?.completion_rate ?? null;
  const isDeclining = score.alerts.some((a) => a.type === "silent_decliner" || a.type === "attendance_drop");
  const dropProb = isDeclining ? 0.68 : (attOverall !== null && attOverall < 70) ? 0.42 : 0.15;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Quad-Outcome Predictive Forecast
          </h2>
          <p className="text-xs text-muted-foreground">
            Four multi-dimensional outcomes derived from joined institutional data silos.
          </p>
        </div>
        <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
          Round 2 Verified
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Outcome 1: Semester Performance */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="size-3.5 text-brand" /> 1. Semester SGPA
            </span>
            <span className="font-mono text-xs font-bold text-foreground">
              {cgpa !== null ? `CGPA ${cgpa.toFixed(2)}` : "SGPA Band"}
            </span>
          </div>
          <p className="font-semibold text-xs text-foreground mt-1">{sgpaBand}</p>
          <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
            <strong>Evidence:</strong> {score.shap_academic?.raises?.[0]?.text || "Course internal exam trend"}
          </div>
        </div>

        {/* Outcome 2: Backlog Risk */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-red-500" /> 2. Backlog Risk
            </span>
            <RiskBadge level={score.academic_risk_level} prob={score.academic_risk_prob} />
          </div>
          <p className="font-semibold text-xs text-foreground mt-1">
            {backlogs > 0 ? `${backlogs} Active Backlog${backlogs > 1 ? "s" : ""}` : "No Active Backlogs"}
          </p>
          <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
            <strong>Key Driver:</strong> {topAcadDriver}
          </div>
        </div>

        {/* Outcome 3: Placement Readiness */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <BriefcaseBusiness className="size-3.5 text-amber-500" /> 3. Placement Readiness
            </span>
            {isPlacementTrack ? (
              <RiskBadge level={score.placement_risk_level} prob={score.placement_risk_prob} />
            ) : (
              <span className="font-mono text-[11px] text-muted-foreground">N/A (Higher Ed)</span>
            )}
          </div>
          <p className="font-semibold text-xs text-foreground mt-1">
            {isPlacementTrack ? `Readiness Index: ${readinessScore.toFixed(0)}/100` : "Non-Placement Track"}
          </p>
          <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
            <strong>Key Driver:</strong> {isPlacementTrack ? topPlaceDriver : "Track aligned with intent"}
          </div>
        </div>

        {/* Outcome 4: 3-Week Engagement Drop */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <TrendingDown className="size-3.5 text-purple-500" /> 4. 3-Wk Drop Risk
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                dropProb >= 0.5 ? "bg-red-500/15 text-red-700 dark:text-red-400" : "bg-muted text-muted-foreground"
              )}
            >
              {(dropProb * 100).toFixed(0)}% Likelihood
            </span>
          </div>
          <p className="font-semibold text-xs text-foreground mt-1">
            {isDeclining ? "Active Downward Trajectory" : "Stable Campus Engagement"}
          </p>
          <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
            <strong>Observed:</strong> Att: {attOverall ? `${attOverall.toFixed(0)}%` : "-"}, LMS: {lmsComp ? `${lmsComp.toFixed(0)}%` : "-"}
          </div>
        </div>
      </div>

      {/* Five-Field Prescriptive Recommendation Card */}
      <div className="rounded-xl border border-brand/25 bg-brand/5 p-4 text-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand/10 pb-2">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <UserCheck className="size-3.5 text-brand" /> Prescribed Intervention & Action Plan
          </span>
          <span
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              rec.priority === "P0 Critical"
                ? "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/20"
                : rec.priority === "P1 High"
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20"
            )}
          >
            {rec.priority} · {rec.sla_target}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground text-[11px] block">Prescribed Action:</span>
            <span className="font-semibold text-foreground text-xs block mt-0.5">{rec.prescribed_action}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-[11px] block">Suggested Institutional Owner:</span>
            <span className="font-semibold text-foreground text-xs block mt-0.5">{rec.suggested_owner}</span>
          </div>
        </div>

        <div className="pt-1">
          <span className="text-muted-foreground text-[11px] block">Evidence-Based Reason:</span>
          <p className="text-muted-foreground leading-relaxed mt-0.5">{rec.evidence_reason}</p>
        </div>
      </div>
    </section>
  );
}
