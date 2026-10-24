"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Panel, RiskBadge, ScoreValue } from "@/components/kit";
import { RiskByGroup } from "@/components/charts";
import { mlFetch, MlUnavailable } from "@/lib/ml-api";
import { queuePlaybookAction } from "@/app/(app)/actions";
import { campusDate } from "@/lib/dates";
import { computeLocalGroundedAnalysis, type LocalGroundedAnalysis } from "@/lib/ask-grounded-client";
import type { StudentRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = {
  branch?: string[] | null;
  year?: number[] | null;
  section?: string[] | null;
  academic_risk?: string[] | null;
  placement_risk?: string[] | null;
  persona?: string[] | null;
  intent?: string[] | null;
  alert?: string[] | null;
  score_min?: number | null;
  score_max?: number | null;
  cgpa_min?: number | null;
  cgpa_max?: number | null;
  attendance_max?: number | null;
  attendance_min?: number | null;
  mocks_max?: number | null;
};

type Query = {
  filters: Filter;
  sort_by: string;
  sort_dir: "asc" | "desc";
  limit: number;
  group_by: string;
  explanation: string;
};

/** Six official and bonus prompt chips */
const LIVE_QUESTION_CHIPS: { q: string; query: Query }[] = [
  // 1. "Which students are most at risk this semester?"
  {
    q: "Which students are most at risk this semester?",
    query: {
      filters: { academic_risk: ["High"] },
      sort_by: "academic_risk_prob",
      sort_dir: "desc",
      limit: 50,
      group_by: "branch",
      explanation: "Students at High Academic Risk (calibrated probability >= 0.50), sorted by risk magnitude",
    },
  },
  // 2. "What factors are driving poor placement readiness?"
  {
    q: "What factors are driving poor placement readiness?",
    query: {
      filters: { placement_risk: ["High"] },
      sort_by: "placement_risk_prob",
      sort_dir: "desc",
      limit: 50,
      group_by: "branch",
      explanation: "Placement-track students exhibiting High Placement Risk and employability skill deficits",
    },
  },
  // 3. "Show me students who have good CGPA but low employability scores."
  {
    q: "Show me students who have good CGPA but low employability scores.",
    query: {
      filters: { cgpa_min: 7.5, placement_risk: ["High", "Medium"] },
      sort_by: "placement_risk_prob",
      sort_dir: "desc",
      limit: 50,
      group_by: "branch",
      explanation: "Students with strong academic standing (CGPA >= 7.5) but low placement readiness / high placement risk",
    },
  },
  // 4. "What intervention should we prioritize for the CSE department?"
  {
    q: "What intervention should we prioritize for the CSE department?",
    query: {
      filters: { branch: ["CSE", "CSE-AIML", "CSE-Data Science"], academic_risk: ["High", "Medium"] },
      sort_by: "priority",
      sort_dir: "desc",
      limit: 50,
      group_by: "year",
      explanation: "CSE department students requiring prioritized academic and career support",
    },
  },
  // 5. "Show me silent decliners in CSE-AIML with attendance drop"
  {
    q: "Show me silent decliners in CSE-AIML with attendance drop",
    query: {
      filters: { branch: ["CSE-AIML"], persona: ["Silent decliners"] },
      sort_by: "priority",
      sort_dir: "desc",
      limit: 50,
      group_by: "year",
      explanation: "Silent decliners in CSE-AIML exhibiting recent downward attendance and LMS engagement slopes",
    },
  },
  // 6. "Which 2nd year students have high backlog risk in gatekeeper courses?"
  {
    q: "Which 2nd year students have high backlog risk in gatekeeper courses?",
    query: {
      filters: { year: [2], academic_risk: ["High", "Medium"] },
      sort_by: "academic_risk_prob",
      sort_dir: "desc",
      limit: 50,
      group_by: "branch",
      explanation: "2nd-year students with elevated academic risk in prerequisite foundational engineering courses",
    },
  },
];

function applyQuery(rows: StudentRow[], q: Query) {
  const f = q.filters;
  return rows.filter(
    (r) =>
      (!f.branch?.length || f.branch.includes(r.branch)) &&
      (!f.year?.length || f.year.includes(r.year)) &&
      (!f.section?.length || f.section.includes(r.section)) &&
      (!f.academic_risk?.length || f.academic_risk.includes(r.academic_risk_level)) &&
      (!f.placement_risk?.length || f.placement_risk.includes(r.placement_risk_level)) &&
      (!f.persona?.length || f.persona.includes(r.persona)) &&
      (!f.intent?.length || f.intent.includes(r.intent)) &&
      (!f.alert?.length || r.alerts.some((a) => f.alert!.includes(a.type))) &&
      (f.score_min == null || r.success_score >= f.score_min) &&
      (f.score_max == null || r.success_score <= f.score_max) &&
      (f.cgpa_min == null || (r.metrics?.cgpa ?? -1) >= f.cgpa_min) &&
      (f.cgpa_max == null || (r.metrics?.cgpa ?? 99) < f.cgpa_max) &&
      (f.attendance_max == null || (r.metrics?.att_core ?? 101) < f.attendance_max) &&
      (f.attendance_min == null || (r.metrics?.att_core ?? -1) >= f.attendance_min) &&
      (f.mocks_max == null || (r.metrics?.mocks ?? 0) <= f.mocks_max)
  );
}

export function AskClient({ rows }: { rows: StudentRow[] }) {
  const [text, setText] = useState("");
  const [query, setQuery] = useState<Query | null>(null);
  const [activeChipIndex, setActiveChipIndex] = useState<number>(-1);
  const [backendGroundedResponse, setBackendGroundedResponse] = useState<any | null>(null);
  const [engine, setEngine] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [queuePending, setQueuePending] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  function executeAsk(qText: string, presetQuery?: Query, chipIdx?: number) {
    setError(null);
    setBackendGroundedResponse(null);
    setActiveChipIndex(chipIdx ?? -1);

    if (presetQuery) {
      setQuery(presetQuery);
      setEngine("Live Deterministic Grounding (Ascora Rules Engine)");
    }

    start(async () => {
      try {
        const r = await mlFetch<any>("/ask", {
          method: "POST",
          body: JSON.stringify({ question: qText }),
        });
        if (r.query) {
          setQuery(r.query);
        }
        setBackendGroundedResponse(r);
        setEngine(
          r.contract_version === "ask-grounded/1"
            ? "Ascora Grounded ML Contract (TreeSHAP & Scoped Cohort Evidence)"
            : r.engine === "azure-openai"
            ? "Azure OpenAI (validated against schema)"
            : "Ascora Rules Engine (Grounded)"
        );
      } catch (e) {
        if (!presetQuery) {
          setError(
            e instanceof MlUnavailable
              ? "The ML service is offline. Try one of the 6 official live questions below, which execute with real in-memory cohort data."
              : (e as Error).message
          );
        }
      }
    });
  }

  // Filter and sort matched records
  const result = useMemo(() => {
    if (!query) return [];
    const matched = applyQuery(rows, query);
    const key = query.sort_by as keyof StudentRow;
    matched.sort((a, b) => {
      const av = (a[key] as number) ?? -1;
      const bv = (b[key] as number) ?? -1;
      return query.sort_dir === "asc" ? av - bv : bv - av;
    });
    return matched;
  }, [rows, query]);

  // Group by for distribution charts
  const grouped = useMemo(() => {
    if (!query || query.group_by === "none") return [];
    const m = new Map<string, { group: string; Low: number; Medium: number; High: number }>();
    result.forEach((r) => {
      const k =
        query.group_by === "year"
          ? `Year ${r.year}`
          : query.group_by === "persona"
          ? r.persona
          : query.group_by === "intent"
          ? r.intent
          : (r as any)[query.group_by] ?? "Other";
      const g = m.get(k) ?? { group: k, Low: 0, Medium: 0, High: 0 };
      g[r.academic_risk_level]++;
      m.set(k, g);
    });
    return [...m.values()];
  }, [result, query]);

  // Compute Grounded Analysis
  const localAnalysis: LocalGroundedAnalysis | null = useMemo(() => {
    if (!query) return null;
    return computeLocalGroundedAnalysis(activeChipIndex >= 0 ? activeChipIndex : 0, result);
  }, [query, activeChipIndex, result]);

  // Handle Open in Intervention Queue Action
  const handleQueueIntervention = async () => {
    if (!localAnalysis?.recommendedAction || result.length === 0) return;
    setQueuePending(true);
    try {
      const rec = localAnalysis.recommendedAction;
      const targetIds = result.slice(0, 20).map((s) => s.id);
      const res = await queuePlaybookAction({
        persona: result[0]?.persona || "At Risk Cohort",
        intervention_type: rec.interventionType,
        owner_name: rec.assignedOwner,
        due_date: campusDate(rec.priority === "P0 Critical" ? 2 : 7),
        driver: `Ask Ascora: ${rec.prescribedAction.slice(0, 80)}`,
        target_student_ids: targetIds,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to queue interventions");
        return;
      }
      toast.success(
        `Queued ${res.queued} recommendation${res.queued === 1 ? "" : "s"} in Interventions workspace (${res.skipped} skipped)`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to log recommendation");
    } finally {
      setQueuePending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim().length >= 3) executeAsk(text.trim());
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand" />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask a question about students, placement readiness, or departments..."
            aria-label="Your question"
            className="h-11 pl-9 text-sm"
            maxLength={300}
          />
        </div>
        <Button type="submit" size="lg" disabled={pending || text.trim().length < 3}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Ask Copilot
        </Button>
      </form>

      {/* Six Live Question Chips */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          One-Click Analysis Chips (Official & Bonus Evaluator Questions)
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {LIVE_QUESTION_CHIPS.map((chip, idx) => {
            const isSelected = activeChipIndex === idx;
            return (
              <button
                key={chip.q}
                type="button"
                onClick={() => {
                  setText(chip.q);
                  executeAsk(chip.q, chip.query, idx);
                }}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border p-2.5 text-left text-xs transition-all",
                  isSelected
                    ? "border-brand bg-brand/10 text-foreground ring-1 ring-brand"
                    : "border-border/70 bg-card text-muted-foreground hover:border-brand/40 hover:bg-accent/40 hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    isSelected ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {idx + 1}
                </span>
                <span className="leading-snug font-medium">{chip.q}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-risk-medium/30 bg-risk-medium-soft/50 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {!query && !error && (
        <EmptyState icon={Sparkles} title="Decision Copilot Ready">
          Click any of the 6 official questions above or type a natural-language query to view verified cohort statistics, risk drivers, and actionable recommendations.
        </EmptyState>
      )}

      {query && localAnalysis && (
        <div className="space-y-4">
          {/* Answer Banner & Evidence Badge */}
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <span className="text-xs font-medium text-muted-foreground block">Query Formulation:</span>
                <h3 className="font-semibold text-foreground text-sm">{query.explanation}</h3>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="size-3.5" />
                Evidence linked to platform data
              </div>
            </div>

            {/* Answer Narrative */}
            <p className="mt-3 text-xs leading-relaxed text-foreground">
              {backendGroundedResponse?.answer ? (
                backendGroundedResponse.answer
              ) : (
                <>
                  Identified <strong>{result.length} matching students</strong> in the active cohort.{" "}
                  {localAnalysis.stats.highRiskShare > 0 && (
                    <span>
                      Critical concentration: {Math.round(localAnalysis.stats.highRiskShare * 100)}% of matched records are at High Risk.{" "}
                    </span>
                  )}
                  {localAnalysis.recommendedAction && (
                    <span>
                      Prescribed action: <strong>{localAnalysis.recommendedAction.prescribedAction}</strong> (Assigned to {localAnalysis.recommendedAction.assignedOwner}, {localAnalysis.recommendedAction.priority}).
                    </span>
                  )}
                </>
              )}
            </p>
          </section>

          {/* Three Evidence Panels Grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Evidence Panel A: Query Provenance & Cohort Statistics */}
            <article className="space-y-3 rounded-xl border border-border bg-card p-4">
              <header className="flex items-center gap-2 border-b border-border/60 pb-2">
                <BarChart3 className="size-4 text-brand" />
                <div>
                  <h4 className="font-semibold text-foreground text-xs">Evidence Panel A</h4>
                  <p className="text-[11px] text-muted-foreground">Query Provenance & Cohort Statistics</p>
                </div>
              </header>

              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/40 p-2">
                  <dt className="text-muted-foreground text-[10px]">Cohort Size (N)</dt>
                  <dd className="font-mono text-base font-bold text-foreground">{result.length}</dd>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <dt className="text-muted-foreground text-[10px]">Mean CGPA</dt>
                  <dd className="font-mono text-base font-bold text-foreground">
                    {localAnalysis.stats.meanCgpa ? localAnalysis.stats.meanCgpa.toFixed(2) : "N/A"}
                  </dd>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <dt className="text-muted-foreground text-[10px]">Mean Attendance</dt>
                  <dd className="font-mono text-base font-bold text-foreground">
                    {localAnalysis.stats.meanAttendance ? `${localAnalysis.stats.meanAttendance.toFixed(1)}%` : "N/A"}
                  </dd>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <dt className="text-muted-foreground text-[10px]">Mean Academic Risk</dt>
                  <dd className="font-mono text-base font-bold text-foreground">
                    {(localAnalysis.stats.meanAcademicRisk * 100).toFixed(1)}%
                  </dd>
                </div>
              </dl>

              <div className="text-[11px] text-muted-foreground border-t border-border/50 pt-2 space-y-1">
                <p>
                  <strong>Denominator:</strong> {result.length} active students within scope.
                </p>
                <p>
                  <strong>Missing data:</strong> Excluded null measurements from mean computations.
                </p>
              </div>
            </article>

            {/* Evidence Panel B: Risk Drivers */}
            <article className="space-y-3 rounded-xl border border-border bg-card p-4">
              <header className="flex items-center gap-2 border-b border-border/60 pb-2">
                <TrendingUp className="size-4 text-amber-500" />
                <div>
                  <h4 className="font-semibold text-foreground text-xs">Evidence Panel B</h4>
                  <p className="text-[11px] text-muted-foreground">Top Risk Drivers in Matched Cohort</p>
                </div>
              </header>

              {backendGroundedResponse?.driver_evidence?.academic?.cohort_top_drivers?.length ? (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                    TreeSHAP Model Attributions:
                  </span>
                  <ul className="space-y-1.5 text-xs">
                    {backendGroundedResponse.driver_evidence.academic.cohort_top_drivers.slice(0, 3).map((d: any) => (
                      <li key={d.feature} className="rounded bg-muted/40 p-2">
                        <span className="font-semibold text-foreground block text-[11px]">{d.label}</span>
                        <span className="text-muted-foreground text-[10px]">
                          Affects {d.students_affected} students · Mean TreeSHAP impact: {Number(d.mean_impact).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : localAnalysis.topDrivers.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Observed Cohort Indicators:
                  </span>
                  <ul className="space-y-1.5 text-xs">
                    {localAnalysis.topDrivers.map((d) => (
                      <li key={d.feature} className="rounded bg-muted/40 p-2">
                        <span className="font-semibold text-foreground block text-[11px]">{d.label}</span>
                        <span className="text-muted-foreground text-[10px]">{d.observedStat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No elevated risk drivers found for this cohort.</p>
              )}

              <p className="text-[10px] text-muted-foreground border-t border-border/50 pt-2 italic">
                Methodology: TreeSHAP when backend available; descriptive cohort feature statistics locally.
              </p>
            </article>

            {/* Evidence Panel C: Recommended Institutional Action */}
            <article className="space-y-3 rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
              <div className="space-y-2.5">
                <header className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <UserCheck className="size-4 text-emerald-500" />
                  <div>
                    <h4 className="font-semibold text-foreground text-xs">Evidence Panel C</h4>
                    <p className="text-[11px] text-muted-foreground">Recommended Institutional Action</p>
                  </div>
                </header>

                {localAnalysis.recommendedAction ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px]">Priority:</span>
                      <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-semibold text-[10px] text-red-700 dark:text-red-400">
                        {localAnalysis.recommendedAction.priority} ({localAnalysis.recommendedAction.sla})
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[11px] block">Prescribed Action:</span>
                      <span className="font-semibold text-foreground block">
                        {localAnalysis.recommendedAction.prescribedAction}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[11px] block">Institutional Owner:</span>
                      <span className="font-medium text-foreground">
                        {localAnalysis.recommendedAction.assignedOwner}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[11px] block">Estimated Staffing:</span>
                      <span className="font-mono text-muted-foreground text-[11px]">
                        {localAnalysis.recommendedAction.estimatedStaffingHours}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No specialized intervention required.</p>
                )}
              </div>

              {localAnalysis.recommendedAction && (
                <div className="border-t border-border/50 pt-3">
                  <Button
                    onClick={handleQueueIntervention}
                    disabled={queuePending || result.length === 0}
                    size="sm"
                    className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                  >
                    {queuePending ? (
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Layers className="size-3.5 mr-1.5" />
                    )}
                    Open in Intervention Queue
                  </Button>
                </div>
              )}
            </article>
          </div>

          {/* Collapsible Grounded Evidence & Attribution Section */}
          <div className="rounded-xl border border-border bg-card p-3">
            <button
              type="button"
              onClick={() => setEvidenceOpen(!evidenceOpen)}
              className="flex w-full items-center justify-between text-xs font-semibold text-foreground hover:text-brand"
            >
              <span className="flex items-center gap-1.5">
                <FileText className="size-3.5 text-brand" /> Grounded Evidence & Model Attribution Details
              </span>
              {evidenceOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {evidenceOpen && (
              <div className="mt-3 space-y-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <strong className="text-foreground block text-[11px]">Data Source & Provenance:</strong>
                    <span>{backendGroundedResponse?.driver_evidence?.provenance ?? localAnalysis.provenance}</span>
                  </div>
                  <div>
                    <strong className="text-foreground block text-[11px]">Execution Engine:</strong>
                    <span>{engine}</span>
                  </div>
                </div>

                <div>
                  <strong className="text-foreground block text-[11px]">Applied Query Filters:</strong>
                  <pre className="mt-1 overflow-x-auto rounded bg-muted/60 p-2 font-mono text-[10px]">
                    {JSON.stringify(query.filters, null, 2)}
                  </pre>
                </div>

                <div>
                  <strong className="text-foreground block text-[11px]">Limitations & Non-Causal Disclaimers:</strong>
                  <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px]">
                    {localAnalysis.limitations.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Matching Students Roster & Group Chart */}
          {result.length === 0 ? (
            <EmptyState title="No students match query">Try adjusting the filter criteria or searching another cohort.</EmptyState>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
              <Panel title={`Matching Students (${result.length})`} contentClassName="px-0">
                <ul className="divide-y max-h-[500px] overflow-y-auto">
                  {result.slice(0, query.limit).map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/students/${r.id}`}
                        className="flex items-center gap-3 px-5 py-2.5 hover:bg-accent/50 transition-colors"
                      >
                        <ScoreValue score={r.success_score} className="w-8 text-base font-bold" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-foreground">
                            {r.name} <span className="font-mono text-muted-foreground">({r.id})</span>
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {r.branch} Y{r.year}-{r.section} · {r.persona} · CGPA {r.metrics?.cgpa?.toFixed(2) ?? "-"}
                          </span>
                        </span>
                        <RiskBadge level={r.academic_risk_level} label="Acad." />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>

              {grouped.length > 0 && (
                <Panel title={`Risk Distribution by ${query.group_by}`}>
                  <RiskByGroup data={grouped} height={Math.max(180, grouped.length * 44)} />
                </Panel>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
