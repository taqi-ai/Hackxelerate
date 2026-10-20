import { CheckCircle2 } from "lucide-react";
import { EmptyState, Panel, Stat } from "@/components/kit";
import { HBar } from "@/components/charts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SOURCE_LABEL } from "@/lib/format";
import { freshnessLabel } from "@/lib/freshness";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const pctf = (n: number | undefined, d = 1) => (n === undefined ? "-" : `${(n * 100).toFixed(d)}%`);

export function QualityReport({ report, conflicts, review }: { report: any | null; conflicts: any[]; review: { rows: any[]; total: number } }) {
  if (!report)
    return (
      <div className="mt-4">
        <EmptyState title="No integration run on record">Run the pipeline above to see source statistics, match accuracy and conflicts.</EmptyState>
      </div>
    );
  const sources = Object.entries(report.sources) as [string, any][];
  const match = report.matching;
  const ev = match.evaluation_vs_truth as Record<string, any> | undefined;
  const q = report.quality;
  const fix = Object.entries(q.fixes ?? {}) as [string, number][];
  const hist = match.fuzzy_confidence_histogram;

  return (
    <div className="mt-4 space-y-4">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Source files" value={sources.length} hint={`${Object.values<any>(q.rows_in).reduce((a, b) => a + b, 0).toLocaleString("en-IN")} rows in`} />
        <Stat label="Fuzzy match precision" value={pctf(match.fuzzy_overall?.precision_auto)} tone="low" hint="Name-only and email-only sources, auto-linked, vs ground truth" />
        <Stat label="Fuzzy match recall" value={pctf(match.fuzzy_overall?.recall_auto)} hint="The rest wait for a human in the review queue" />
        <Stat label="Conflicts resolved" value={q.conflicts} tone="medium" hint="With a documented rule each" />
      </section>

      <Panel title="Sources" description="What each system contained, how it was understood, and how current it is (from dates inside the file, not the upload time; hover a date for how it was found)">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Rows</TableHead>
                <TableHead className="text-right">Columns mapped</TableHead>
                <TableHead>Unmapped</TableHead>
                <TableHead className="text-right">Auto-linked</TableHead>
                <TableHead className="text-right">Review</TableHead>
                <TableHead className="text-right">Student coverage</TableHead>
                <TableHead>Data as of</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map(([k, s]) => {
                const m = match.by_source[k];
                const cov = q.coverage[{ erp_academics: "academic", attendance_register: "attendance", lms_activity_log: "lms_activity", clubs_events: "engagement", placement_cell: "placement", skills_assessment: "skills", feedback_forms: "feedback" }[k] as string];
                return (
                  <TableRow key={k}>
                    <TableCell>
                      <p className="font-medium">{SOURCE_LABEL[k] ?? k}</p>
                      <p className="font-mono text-xs text-muted-foreground">{s.file}</p>
                    </TableCell>
                    <TableCell className="tabular text-right">{s.rows_in.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="tabular text-right">{Object.keys(s.mapping.columns).length}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.mapping.unmapped.length ? s.mapping.unmapped.join(", ") : "None"}</TableCell>
                    <TableCell className="tabular text-right">{m ? pctf(m.match_rate) : "-"}</TableCell>
                    <TableCell className="tabular text-right">{m?.review ?? 0}</TableCell>
                    <TableCell className="tabular text-right">{pctf(cov, 0)}</TableCell>
                    <TableCell className="text-xs">
                      {(() => {
                        const f = freshnessLabel(report.freshness?.[k]);
                        return (
                          <span title={f.title} className={cn("whitespace-nowrap", f.tone === "stale" ? "font-medium text-destructive" : f.tone === "none" && "text-muted-foreground")}>
                            {f.text}
                            {f.tone === "stale" && " · stale"}
                          </span>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {sources.flatMap(([, s]) => s.notes).length > 0 && (
          <ul className="mt-3 grid gap-1 text-xs text-muted-foreground">
            {sources.flatMap(([, s]) => s.notes as string[]).map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Cleaning applied" description="Problems found and fixed automatically">
          <ul className="divide-y text-sm">
            {fix.map(([k, v]) => (
              <li key={k} className="flex items-center justify-between gap-3 py-2">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-risk-low" />
                  {k}
                </span>
                <span className="tabular font-medium">{v.toLocaleString("en-IN")}</span>
              </li>
            ))}
            <li className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-risk-low" />
                Missing internal marks (kept as missing, not zero)
              </span>
              <span className="tabular font-medium">{q.missing_internal_marks.toLocaleString("en-IN")}</span>
            </li>
          </ul>
        </Panel>

        <Panel title="Matching accuracy vs ground truth" description="The generator knows who every row really is, so we can measure the matcher honestly">
          {ev ? (
            <HBar
              height={230}
              data={Object.entries(ev).map(([k, e]) => ({ name: SOURCE_LABEL[k] ?? k, value: Math.round(e.precision_auto * 1000) / 10 }))}
              unit="% precision"
            />
          ) : (
            <p className="text-sm text-muted-foreground">Ground truth is only available for generated data.</p>
          )}
          {ev && (
            <p className="mt-2 text-xs text-muted-foreground">
              Precision of auto-accepted links. Name-only clubs records recall {pctf(ev.clubs_events?.recall_auto)}, email-only LMS {pctf(ev.lms_activity_log?.recall_auto)};
              ambiguous same-name students go to review instead of being guessed.
            </p>
          )}
        </Panel>
      </div>

      <Panel title="Match confidence" description={`Auto-accept at ${match.thresholds.auto}+, human review from ${match.thresholds.review}, reject below`}>
        <div className="grid items-end gap-1" style={{ gridTemplateColumns: `repeat(${hist.counts.length}, minmax(0, 1fr))` }}>
          {hist.counts.map((c: number, i: number) => {
            const max = Math.max(...hist.counts);
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="tabular text-xs text-muted-foreground">{c}</span>
                <span className={cn("w-full rounded-t", i >= 6 ? "bg-risk-low/70" : i >= 3 ? "bg-risk-medium/70" : "bg-risk-high/70")} style={{ height: `${Math.max(4, (c / max) * 90)}px` }} />
                <span className="text-xs text-muted-foreground">{hist.bins[i]}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Fuzzy links only (name-only and email-only sources). Roll-number matches are exact and not shown.</p>
      </Panel>

      <Tabs defaultValue="review">
        <TabsList>
          <TabsTrigger value="review">Needs review ({review.total})</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts ({q.conflicts})</TabsTrigger>
        </TabsList>
        <TabsContent value="review" className="mt-3">
          <div tabIndex={0} role="region" aria-label="Scrollable table" className="max-h-96 overflow-auto rounded-xl border bg-card focus-visible:outline-2 focus-visible:outline-ring">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Recorded as</TableHead>
                  <TableHead>Best candidate</TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {review.rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm">{SOURCE_LABEL[r.source] ?? r.source}</TableCell>
                    <TableCell className="font-mono text-xs">{r.raw_key}</TableCell>
                    <TableCell className="text-sm">
                      {r.students?.name} <span className="text-muted-foreground">({r.students?.branch} Y{r.students?.year})</span>
                    </TableCell>
                    <TableCell className="tabular text-right text-risk-medium">{Number(r.match_confidence).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Ambiguous links are never used in scores until a person confirms them. Typically two students share a name in the same class.</p>
        </TabsContent>
        <TabsContent value="conflicts" className="mt-3">
          <div tabIndex={0} role="region" aria-label="Scrollable table" className="max-h-96 overflow-auto rounded-xl border bg-card focus-visible:outline-2 focus-visible:outline-ring">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Attribute</TableHead>
                  <TableHead>Sources disagree</TableHead>
                  <TableHead>Resolved to</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conflicts.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{c.students?.name ?? c.student_id}</TableCell>
                    <TableCell className="text-sm">{c.attribute.replace("_pct", "")}</TableCell>
                    <TableCell className="text-xs">
                      {SOURCE_LABEL[c.source_a]}: {c.value_a}
                      <br />
                      {SOURCE_LABEL[c.source_b] ?? c.source_b}: {c.value_b}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium">{c.resolved_value}</span>
                      <span className="block max-w-xs text-xs text-muted-foreground">{c.resolution}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
