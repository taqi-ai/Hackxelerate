"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  ExternalLink,
  FileText,
  Info,
  LayoutGrid,
  Loader2,
  Search,
  ShieldAlert,
  Sparkles,
  Table as TableIcon,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Meter, Panel, RiskBadge, ScoreValue } from "@/components/kit";
import { RiskByGroup } from "@/components/charts";
import { mlFetch, MlUnavailable } from "@/lib/ml-api";
import type { StudentRow } from "@/lib/types";
import type { AskGroundedResponse, JudgePreset, QueryAST } from "@/lib/ask-types";
import { adaptAskResponse, OFFICIAL_JUDGE_PRESETS } from "@/lib/ask-adapter";

interface AskClientProps {
  rows: StudentRow[];
  drivers: Record<string, { academic: any[]; placement: any[] }>;
  role: string;
  mentorId?: string | null;
}

export function AskClient({ rows, drivers, role }: AskClientProps) {
  const [text, setText] = useState("");
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [response, setResponse] = useState<AskGroundedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [localSearch, setLocalSearch] = useState("");
  const [showProvenance, setShowProvenance] = useState(false);
  const [pending, start] = useTransition();

  function executeQuery(questionText: string, presetQuery?: QueryAST, presetId?: string) {
    setError(null);
    setActivePresetId(presetId ?? null);

    start(async () => {
      try {
        // Attempt backend /ask endpoint (conforms to CONTRACT = "ask-grounded/1" or legacy { query, engine })
        const raw = await mlFetch<any>("/ask", {
          method: "POST",
          body: JSON.stringify({ question: questionText }),
        });

        const adapted = adaptAskResponse(raw, questionText, rows, drivers, role);
        setResponse(adapted);
      } catch (e) {
        // Graceful offline fallback: adapt locally from stored snapshot and client rule parser
        const isOffline = e instanceof MlUnavailable;
        const fallbackRaw = presetQuery ? { query: presetQuery, engine: "offline-cache" } : null;
        const adapted = adaptAskResponse(fallbackRaw, questionText, rows, drivers, role);

        setResponse(adapted);
        if (!isOffline) {
          setError((e as Error).message);
        }
      }
    });
  }

  function handlePresetSelect(preset: JudgePreset) {
    setText(preset.question);
    executeQuery(preset.question, preset.query, preset.id);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length >= 3) {
      executeQuery(trimmed);
    }
  }

  function handleClear() {
    setText("");
    setActivePresetId(null);
    setResponse(null);
    setError(null);
    setLocalSearch("");
  }

  // Filter matched roster locally by name or student ID if user searches in table
  const displayedStudents = useMemo(() => {
    if (!response) return [];
    if (!localSearch.trim()) return response.matched_students;
    const term = localSearch.toLowerCase().trim();
    return response.matched_students.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.student_id.toLowerCase().includes(term) ||
        s.branch.toLowerCase().includes(term) ||
        s.section.toLowerCase().includes(term),
    );
  }, [response, localSearch]);

  // Aggregate breakdown for grouped risk chart
  const groupedChartData = useMemo(() => {
    if (!response || response.matched_students.length === 0) return [];
    const groupBy = response.query.group_by === "none" ? "branch" : response.query.group_by;
    const map = new Map<string, { group: string; Low: number; Medium: number; High: number }>();

    for (const s of response.matched_students) {
      let key = "All";
      if (groupBy === "branch") key = s.branch;
      else if (groupBy === "year") key = `Year ${s.year}`;
      else if (groupBy === "section") key = `Sec ${s.section}`;
      else if (groupBy === "persona") key = s.persona;

      const cur = map.get(key) ?? { group: key, Low: 0, Medium: 0, High: 0 };
      if (s.academic_risk_level === "High") cur.High++;
      else if (s.academic_risk_level === "Medium") cur.Medium++;
      else cur.Low++;
      map.set(key, cur);
    }

    return [...map.values()].slice(0, 8);
  }, [response]);

  const officialPresets = OFFICIAL_JUDGE_PRESETS.filter((p) => p.category === "official");
  const deepDivePresets = OFFICIAL_JUDGE_PRESETS.filter((p) => p.category === "deep-dive");

  return (
    <div className="space-y-6">
      {/* Official Judge Questions Bar */}
      <section className="edge rounded-2xl border bg-card/90 p-5 shadow-xs backdrop-blur-sm">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">KPMG & byteXL Challenge Questions</h2>
              <p className="text-xs text-muted-foreground">Select an official challenge prompt to execute immediate evidence grounding.</p>
            </div>
          </div>
          <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand">Challenge 04 Benchmarks</span>
        </div>

        {/* 4 Official Questions */}
        <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {officialPresets.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className={`group relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                  isActive
                    ? "border-brand bg-brand/10 shadow-xs ring-1 ring-brand"
                    : "border-border/80 bg-background/80 hover:border-brand/40 hover:bg-accent/40"
                }`}
              >
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {preset.badge}
                    </span>
                    <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                  <h3 className="text-xs font-semibold leading-snug text-foreground">{preset.title}</h3>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{preset.question}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* 2 Deep Dive Scenarios */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Deep-dive scenarios:</span>
          {deepDivePresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Cpu className="size-3 text-brand" />
              <span>{preset.title}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Query Input Bar */}
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (activePresetId) setActivePresetId(null);
            }}
            placeholder="Ask a plain-English question (e.g. 2nd year ECE students at high academic risk)..."
            aria-label="Ask Ascora analytical query"
            className="h-12 pl-10 pr-10 text-sm font-normal shadow-xs"
            maxLength={300}
          />
          {text.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear query input"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="lg" disabled={pending || text.trim().length < 3} className="h-12 min-w-[120px] font-semibold">
            {pending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Grounding...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4 text-brand-foreground" /> Ask Ascora
              </>
            )}
          </Button>
          {response && (
            <Button type="button" variant="outline" size="lg" onClick={handleClear} className="h-12">
              Reset
            </Button>
          )}
        </div>
      </form>

      {/* Error Banner */}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-risk-medium/30 bg-risk-medium-soft/50 p-4 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-risk-medium" />
          <div>
            <p className="font-semibold">Analysis Notice</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {/* Initial Empty State */}
      {!response && !pending && (
        <EmptyState icon={Sparkles} title="Decision Copilot Standing By">
          <p className="text-sm text-muted-foreground">
            Select one of the 4 official KPMG challenge questions above or enter a custom plain-English question. Your query translates strictly into schema filters
            validated by TreeSHAP attributions and calibrated student failure probabilities.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-md border bg-muted/40 px-2 py-1">Filter by Branch</span>
            <span className="rounded-md border bg-muted/40 px-2 py-1">Filter by Year</span>
            <span className="rounded-md border bg-muted/40 px-2 py-1">CGPA Thresholds</span>
            <span className="rounded-md border bg-muted/40 px-2 py-1">Attendance Cutoffs</span>
            <span className="rounded-md border bg-muted/40 px-2 py-1">Zero Mocks</span>
          </div>
        </EmptyState>
      )}

      {/* Answer & Evidence Section */}
      {response && (
        <div className="space-y-6">
          {/* Executive Direct Answer Banner */}
          <section className="edge relative overflow-hidden rounded-2xl border bg-card/95 p-6 shadow-sm backdrop-blur-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <CheckCircle2 className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-foreground">Executive Grounded Answer</h3>
                  <p className="text-xs text-muted-foreground">Grounded on verified student scores and TreeSHAP attribution models</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border bg-muted/50 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                  Engine: {response.engine}
                </span>
                <span className="rounded-full bg-brand/10 px-2.5 py-1 font-semibold text-brand">
                  {response.matched_count} matching students
                </span>
              </div>
            </div>

            {/* Direct Answer Copy */}
            <p className="font-display text-lg font-medium leading-relaxed tracking-tight text-foreground sm:text-xl">
              {response.answer}
            </p>

            {/* Three-Pillar Analysis Badges */}
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-background/70 p-3.5">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Building2 className="size-3.5 text-brand" />
                  <span>Observed ERP/LMS Facts</span>
                </div>
                <p className="text-xs leading-relaxed text-foreground">
                  {response.cohort_summary.count} students analyzed. Avg CGPA: {response.cohort_summary.mean_cgpa ?? "N/A"}. Avg core attendance:{" "}
                  {response.cohort_summary.mean_core_attendance ? `${response.cohort_summary.mean_core_attendance}%` : "N/A"}.
                </p>
              </div>

              <div className="rounded-xl border bg-background/70 p-3.5">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <ShieldAlert className="size-3.5 text-risk-high" />
                  <span>Model Predictions</span>
                </div>
                <p className="text-xs leading-relaxed text-foreground">
                  {response.cohort_summary.academic_risk_levels.High} at High Academic Risk (
                  {response.prediction_evidence?.academic.mean_probability
                    ? `${(response.prediction_evidence.academic.mean_probability * 100).toFixed(0)}% avg prob`
                    : "calibrated GBDT"}
                  ). {response.cohort_summary.placement_risk_levels.High} High Placement Risk.
                </p>
              </div>

              <div className="rounded-xl border bg-background/70 p-3.5">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <UserCheck className="size-3.5 text-risk-low" />
                  <span>Prescribed Playbook</span>
                </div>
                <p className="text-xs leading-relaxed text-foreground">
                  {response.recommended_intervention ? response.recommended_intervention.action : "Review student profile records in Mission Control."}
                </p>
              </div>
            </div>

            {/* Key Aggregate Metric Ribbon */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-xl border bg-background/50 p-3 text-center">
                <div className="text-[11px] font-medium text-muted-foreground">Cohort Size</div>
                <div className="font-display text-2xl font-bold text-foreground">{response.matched_count}</div>
                <div className="text-[10px] text-muted-foreground">Scoped students</div>
              </div>

              <div className="rounded-xl border bg-background/50 p-3 text-center">
                <div className="text-[11px] font-medium text-muted-foreground">Academic High Risk</div>
                <div className="font-display text-2xl font-bold text-risk-high">{response.cohort_summary.academic_risk_levels.High}</div>
                <div className="text-[10px] text-muted-foreground">
                  {response.matched_count > 0
                    ? `${((response.cohort_summary.academic_risk_levels.High / response.matched_count) * 100).toFixed(0)}% of cohort`
                    : "-"}
                </div>
              </div>

              <div className="rounded-xl border bg-background/50 p-3 text-center">
                <div className="text-[11px] font-medium text-muted-foreground">Placement High Risk</div>
                <div className="font-display text-2xl font-bold text-risk-medium">{response.cohort_summary.placement_risk_levels.High}</div>
                <div className="text-[10px] text-muted-foreground">
                  {response.matched_count > 0
                    ? `${((response.cohort_summary.placement_risk_levels.High / response.matched_count) * 100).toFixed(0)}% of cohort`
                    : "-"}
                </div>
              </div>

              <div className="rounded-xl border bg-background/50 p-3 text-center">
                <div className="text-[11px] font-medium text-muted-foreground">Mean Success Score</div>
                <div className="font-display text-2xl font-bold text-foreground">{response.cohort_summary.mean_success_score ?? "-"}</div>
                <div className="text-[10px] text-muted-foreground">Scale 0 to 100</div>
              </div>

              <div className="rounded-xl border bg-background/50 p-3 text-center">
                <div className="text-[11px] font-medium text-muted-foreground">Average CGPA</div>
                <div className="font-display text-2xl font-bold text-foreground">{response.cohort_summary.mean_cgpa ?? "-"}</div>
                <div className="text-[10px] text-muted-foreground">Scale 0 to 10.0</div>
              </div>

              <div className="rounded-xl border bg-background/50 p-3 text-center">
                <div className="text-[11px] font-medium text-muted-foreground">Core Attendance</div>
                <div className="font-display text-2xl font-bold text-foreground">
                  {response.cohort_summary.mean_core_attendance ? `${response.cohort_summary.mean_core_attendance}%` : "-"}
                </div>
                <div className="text-[10px] text-muted-foreground">Mandatory classes</div>
              </div>
            </div>
          </section>

          {/* Recommendation Card */}
          {response.recommended_intervention && (
            <section className="edge relative overflow-hidden rounded-2xl border border-brand/30 bg-card/90 p-5 shadow-xs backdrop-blur-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-brand/40 bg-brand/10 text-brand font-semibold">
                      Institutional Recommendation
                    </Badge>
                    <span className="rounded-md bg-risk-high-soft px-2 py-0.5 text-xs font-semibold text-risk-high ring-1 ring-risk-high/30">
                      {response.recommended_intervention.priority}
                    </span>
                    <span className="text-xs text-muted-foreground">Owner: {response.recommended_intervention.owner}</span>
                  </div>

                  <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
                    {response.recommended_intervention.action}
                  </h3>

                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Driver rationale:</strong> {response.recommended_intervention.reason}
                  </p>

                  <div className="rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Target scope:</strong> {response.recommended_intervention.target} (
                      {response.recommended_intervention.target_count} students)
                    </p>
                    <p className="mt-1">
                      <strong className="text-foreground">Expected impact:</strong>{" "}
                      {response.recommended_intervention.expected_impact || "Correlated with measurable risk mitigation in semester evaluations."}
                    </p>
                  </div>
                </div>

                {/* Workflow Actions */}
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                  <Link
                    href="/this-week"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-brand-foreground shadow-xs transition-opacity hover:opacity-90"
                  >
                    <Calendar className="size-3.5" />
                    <span>Open in Mission Control</span>
                    <ArrowUpRight className="size-3.5" />
                  </Link>

                  <Link
                    href="/interventions"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border bg-background px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
                  >
                    <FileText className="size-3.5 text-muted-foreground" />
                    <span>Intervention Tracker</span>
                  </Link>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 border-t pt-3 text-[11px] text-muted-foreground">
                <Info className="size-3.5 shrink-0 text-brand" />
                <span>Advisory institutional recommendation. All interventions must be created and verified by authorized human mentors.</span>
              </div>
            </section>
          )}

          {/* Grouped Risk Chart & Roster Table */}
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Student Evidence Table Panel */}
            <Panel
              title={
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-brand" />
                  <span>Student Evidence Roster ({displayedStudents.length})</span>
                </div>
              }
              description="Individual risk estimates, academic benchmarks, and dominant TreeSHAP risk-raising drivers"
              action={
                <div className="flex items-center gap-2">
                  <div className="relative hidden sm:block">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={localSearch}
                      onChange={(e) => setLocalSearch(e.target.value)}
                      placeholder="Filter roster..."
                      className="h-8 w-36 pl-8 text-xs"
                    />
                  </div>
                  <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className={`rounded-md p-1.5 text-xs transition-colors ${
                        viewMode === "table" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                      aria-label="Table view"
                    >
                      <TableIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("cards")}
                      className={`rounded-md p-1.5 text-xs transition-colors ${
                        viewMode === "cards" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                      aria-label="Cards view"
                    >
                      <LayoutGrid className="size-3.5" />
                    </button>
                  </div>
                </div>
              }
              contentClassName="px-0 pt-0"
            >
              {displayedStudents.length === 0 ? (
                <div className="p-8">
                  <EmptyState title="No Students Found">No student records in this cohort matched your filter query.</EmptyState>
                </div>
              ) : viewMode === "table" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-3 py-3">Cohort</th>
                        <th className="px-3 py-3">Academics</th>
                        <th className="px-3 py-3">Success</th>
                        <th className="px-3 py-3">Academic Risk</th>
                        <th className="px-3 py-3">Placement Risk</th>
                        <th className="px-3 py-3">Principal Driver</th>
                        <th className="px-3 py-3">Action</th>
                        <th className="px-4 py-3 text-right">360 View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {displayedStudents.map((s) => (
                        <tr key={s.student_id} className="transition-colors hover:bg-accent/40">
                          {/* Student Identifier */}
                          <td className="px-4 py-3 font-medium">
                            <Link href={`/students/${s.student_id}`} className="font-semibold text-foreground hover:text-brand hover:underline">
                              {s.name}
                            </Link>
                            <span className="block font-mono text-[10px] text-muted-foreground">{s.student_id}</span>
                          </td>

                          {/* Cohort */}
                          <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                            <span>{s.branch}</span>
                            <span className="block text-[11px]">
                              Y{s.year}-{s.section}
                            </span>
                          </td>

                          {/* Academics */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="font-medium">CGPA {s.cgpa?.toFixed(2) ?? "-"}</span>
                            <span
                              className={`block text-[10px] ${
                                (s.att_core ?? 100) < 65 ? "font-semibold text-risk-high" : "text-muted-foreground"
                              }`}
                            >
                              Core Att: {s.att_core != null ? `${s.att_core}%` : "-"}
                            </span>
                          </td>

                          {/* Success Score */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <ScoreValue score={s.success_score} className="text-sm" />
                            <Meter value={s.success_score} className="mt-1 block" />
                          </td>

                          {/* Academic Risk */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <RiskBadge level={s.academic_risk_level} prob={s.academic_risk_prob} />
                          </td>

                          {/* Placement Risk */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <RiskBadge level={s.placement_risk_level} prob={s.placement_risk_prob} />
                          </td>

                          {/* Top Driver */}
                          <td className="max-w-[200px] px-3 py-3">
                            {s.top_driver ? (
                              <span className="line-clamp-2 text-[11px] text-foreground" title={s.top_driver.text}>
                                {s.top_driver.text}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">No specific driver flagged</span>
                            )}
                          </td>

                          {/* Suggested Action */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                              {s.suggested_action ?? "Mentor review"}
                            </span>
                          </td>

                          {/* Profile Link */}
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/students/${s.student_id}`}
                              className="inline-flex size-7 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground"
                              aria-label={`Open 360 profile for ${s.name}`}
                            >
                              <ExternalLink className="size-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Cards View */
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  {displayedStudents.map((s) => (
                    <div key={s.student_id} className="flex flex-col justify-between rounded-xl border bg-background p-4 shadow-xs">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link href={`/students/${s.student_id}`} className="font-semibold text-foreground hover:text-brand hover:underline">
                              {s.name}
                            </Link>
                            <span className="block font-mono text-[11px] text-muted-foreground">{s.student_id}</span>
                          </div>
                          <ScoreValue score={s.success_score} className="text-lg" />
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <RiskBadge level={s.academic_risk_level} prob={s.academic_risk_prob} label="Acad." />
                          <RiskBadge level={s.placement_risk_level} prob={s.placement_risk_prob} label="Place." />
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {s.branch} Y{s.year}-{s.section}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          <p>
                            CGPA: <strong className="text-foreground">{s.cgpa?.toFixed(2) ?? "-"}</strong> · Core Att:{" "}
                            <strong className={(s.att_core ?? 100) < 65 ? "text-risk-high" : "text-foreground"}>
                              {s.att_core != null ? `${s.att_core}%` : "-"}
                            </strong>
                          </p>
                          {s.top_driver && (
                            <p className="line-clamp-2 text-foreground">
                              <strong>Driver:</strong> {s.top_driver.text}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t pt-3">
                        <span className="text-[11px] font-medium text-brand">{s.suggested_action ?? "Mentor review"}</span>
                        <Link
                          href={`/students/${s.student_id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:text-brand"
                        >
                          <span>Profile</span>
                          <ArrowRight className="size-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Sidebar Charts & Context */}
            <div className="space-y-4">
              {groupedChartData.length > 0 && (
                <Panel title="Academic Risk Breakdown" description="Stacked count by cohort segment">
                  <RiskByGroup data={groupedChartData} height={Math.max(200, groupedChartData.length * 38)} />
                </Panel>
              )}

              <Panel title="Explainability & Governance" description="Model integrity and transparency standards">
                <div className="space-y-3 text-xs text-muted-foreground">
                  <div className="rounded-lg bg-muted/40 p-2.5">
                    <p className="font-semibold text-foreground">TreeSHAP Feature Attributions</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed">
                      Explains feature impact on model predictions. Represents local observational attribution, not causal counterfactuals.
                    </p>
                  </div>

                  <div className="rounded-lg bg-muted/40 p-2.5">
                    <p className="font-semibold text-foreground">Role-Level Access Control</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed">
                      Queries strictly respect row-level security. Student contact records are masked server-side.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowProvenance(!showProvenance)}
                    className="inline-flex w-full items-center justify-between rounded-lg border bg-background p-2 text-xs font-semibold text-foreground hover:bg-accent"
                  >
                    <span>Inspect Query AST Schema</span>
                    {showProvenance ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  </button>
                </div>
              </Panel>
            </div>
          </div>

          {/* Explainability & Provenance Collapsible Drawer */}
          {showProvenance && (
            <section className="edge rounded-2xl border bg-muted/30 p-5 shadow-xs">
              <div className="mb-3 flex items-center justify-between border-b pb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Query Execution Provenance & AST Schema</h4>
                <span className="font-mono text-[11px] text-muted-foreground">Contract: {response.contract_version || "ask-grounded/1"}</span>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-foreground">Validated Filter JSON (Never Raw SQL):</p>
                  <pre className="mt-1.5 max-h-48 overflow-x-auto rounded-lg bg-background p-3 font-mono text-[11px] text-foreground">
                    {JSON.stringify(response.query, null, 2)}
                  </pre>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Evaluation Scope Limitations:</p>
                  <ul className="list-inside list-disc space-y-1">
                    {response.limitations.map((lim, idx) => (
                      <li key={idx}>{lim}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
