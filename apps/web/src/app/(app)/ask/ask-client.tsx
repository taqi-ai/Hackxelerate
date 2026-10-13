"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Panel, RiskBadge, ScoreValue } from "@/components/kit";
import { RiskByGroup } from "@/components/charts";
import { mlFetch, MlUnavailable } from "@/lib/ml-api";
import type { StudentRow } from "@/lib/types";

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
type Query = { filters: Filter; sort_by: string; sort_dir: "asc" | "desc"; limit: number; group_by: string; explanation: string };

/** Cached example questions: the filter JSON is precomputed, so the demo works with no ML service or internet. */
const PRESETS: { q: string; query: Query }[] = [
  {
    q: "Students at high academic risk with core attendance below 65%",
    query: { filters: { academic_risk: ["High"], attendance_max: 65 }, sort_by: "academic_risk_prob", sort_dir: "desc", limit: 50, group_by: "branch", explanation: "High academic risk and attendance under 65%" },
  },
  {
    q: "Silent decliners in 3rd year",
    query: { filters: { persona: ["Silent decliners"], year: [3] }, sort_by: "priority", sort_dir: "desc", limit: 50, group_by: "branch", explanation: "Silent decliners in year 3" },
  },
  {
    q: "High placement risk with no mock interviews",
    query: { filters: { placement_risk: ["High"], alert: ["no_mock"] }, sort_by: "placement_risk_prob", sort_dir: "desc", limit: 50, group_by: "branch", explanation: "High placement risk and no mock interview on record" },
  },
  {
    q: "Strong students who could be peer mentors",
    query: { filters: { persona: ["All-round strong"], score_min: 70 }, sort_by: "success_score", sort_dir: "desc", limit: 30, group_by: "section", explanation: "All-round strong students with a score of 70 or more" },
  },
];

function applyQuery(rows: StudentRow[], q: Query) {
  const f = q.filters;
  const out = rows.filter(
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
      (f.cgpa_min == null || (r.metrics.cgpa ?? -1) >= f.cgpa_min) &&
      (f.cgpa_max == null || (r.metrics.cgpa ?? 99) < f.cgpa_max) &&
      (f.attendance_max == null || (r.metrics.att_core ?? 101) < f.attendance_max) &&
      (f.attendance_min == null || (r.metrics.att_core ?? -1) >= f.attendance_min) &&
      (f.mocks_max == null || (r.metrics.mocks ?? 0) <= f.mocks_max),
  );
  return out;
}

export function AskClient({ rows }: { rows: StudentRow[] }) {
  const [text, setText] = useState("");
  const [query, setQuery] = useState<Query | null>(null);
  const [engine, setEngine] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function ask(q: string, preset?: Query) {
    setError(null);
    if (preset) {
      setQuery(preset);
      setEngine("cached example");
      return;
    }
    start(async () => {
      try {
        const r = await mlFetch<{ query: Query; engine: string }>("/ask", { method: "POST", body: JSON.stringify({ question: q }) });
        setQuery(r.query);
        setEngine(r.engine === "azure-openai" ? "Azure OpenAI, validated against the filter schema" : r.engine === "gemini" ? "Gemini, validated against the filter schema" : "built-in rules (no LLM available)");
      } catch (e) {
        setError(e instanceof MlUnavailable ? "The ML service is offline. Try one of the example questions, which work without it." : (e as Error).message);
      }
    });
  }

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

  const grouped = useMemo(() => {
    if (!query || query.group_by === "none") return [];
    const m = new Map<string, { group: string; Low: number; Medium: number; High: number }>();
    result.forEach((r) => {
      const k = query.group_by === "year" ? `Year ${r.year}` : query.group_by === "persona" ? r.persona : query.group_by === "intent" ? r.intent : (r as any)[query.group_by];
      const g = m.get(k) ?? { group: k, Low: 0, Medium: 0, High: 0 };
      g[r.academic_risk_level]++;
      m.set(k, g);
    });
    return [...m.values()];
  }, [result, query]);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim().length >= 3) ask(text.trim());
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand" />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. 2nd year ECE students at high academic risk"
            aria-label="Your question"
            className="h-11 pl-9"
            maxLength={300}
          />
        </div>
        <Button type="submit" size="lg" disabled={pending || text.trim().length < 3}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Ask
        </Button>
      </form>

      <div className="flex flex-wrap gap-2" aria-label="Example questions">
        {PRESETS.map((p) => (
          <button
            key={p.q}
            onClick={() => {
              setText(p.q);
              ask(p.q, p.query);
            }}
            className="rounded-full border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            {p.q}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-risk-medium/30 bg-risk-medium-soft/50 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {!query && !error && (
        <EmptyState icon={Sparkles} title="Ask about your students">
          Try an example above, or type your own. Filters you can use: branch, year, section, risk levels, segment, intent, alerts, score, attendance.
        </EmptyState>
      )}

      {query && (
        <>
          <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
            <p>
              {query.explanation}. <span className="font-medium tabular">{result.length}</span> matching students.
            </p>
            <details className="mt-1.5 text-xs text-muted-foreground">
              <summary className="cursor-pointer">How this was interpreted ({engine})</summary>
              <pre className="mt-2 overflow-x-auto rounded-md bg-background p-3 font-mono">{JSON.stringify({ filters: query.filters, sort_by: query.sort_by, limit: query.limit }, null, 2)}</pre>
            </details>
          </div>

          {result.length === 0 ? (
            <EmptyState title="No students match">Try loosening one condition, for example the score or attendance limit.</EmptyState>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
              <Panel title="Matching students" contentClassName="px-0">
                <ul className="divide-y">
                  {result.slice(0, query.limit).map((r) => (
                    <li key={r.id}>
                      <Link href={`/students/${r.id}`} className="flex items-center gap-3 px-6 py-2.5 hover:bg-accent/50">
                        <ScoreValue score={r.success_score} className="w-8 text-lg" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{r.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {r.branch} Y{r.year}-{r.section} · {r.persona}
                          </span>
                        </span>
                        <RiskBadge level={r.academic_risk_level} label="Acad." />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
              {grouped.length > 0 && (
                <Panel title={`Academic risk by ${query.group_by}`}>
                  <RiskByGroup data={grouped} height={Math.max(180, grouped.length * 44)} />
                </Panel>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
