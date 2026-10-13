"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SOURCE_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

function Lineage({ refText, children }: { refText?: string | null; children: React.ReactNode }) {
  if (!refText) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-4">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">from {refText}</TooltipContent>
    </Tooltip>
  );
}

function KV({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd className="tabular text-sm font-medium">{v ?? "-"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SourceTabs({ d }: { d: any }) {
  const subjects: any[] = d.academic?.subjects ?? [];
  const cur = subjects.length ? Math.max(...subjects.map((s) => s.sem)) : 0;
  const ev: any[] = d.engagement?.events ?? [];
  const tech = d.skills?.technical ?? {};
  const soft = d.skills?.soft ?? {};
  const byMonthRef = d.attendance?.lineage?.by_month ?? {};

  return (
    <Tabs defaultValue="academic">
      <TabsList className="flex h-auto flex-wrap justify-start">
        <TabsTrigger value="academic">Academic</TabsTrigger>
        <TabsTrigger value="attendance">Attendance</TabsTrigger>
        <TabsTrigger value="lms">LMS</TabsTrigger>
        <TabsTrigger value="engagement">Engagement</TabsTrigger>
        <TabsTrigger value="placement">Placement</TabsTrigger>
        <TabsTrigger value="skills">Skills</TabsTrigger>
        <TabsTrigger value="feedback">Feedback</TabsTrigger>
        <TabsTrigger value="lineage">Lineage & conflicts</TabsTrigger>
      </TabsList>

      <TabsContent value="academic" className="mt-4 space-y-4">
        <KV
          items={[
            ["CGPA", <Lineage key="c" refText={d.academic?.lineage?.cgpa}>{d.academic?.cgpa ?? "-"}</Lineage>],
            ["Active backlogs", d.academic?.backlogs ?? 0],
            ["Current semester", cur || "-"],
            ["ERP rows merged", d.academic?.lineage?.rows ?? "-"],
          ]}
        />
        <div className="max-h-80 overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sem</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-right">Internal /40</TableHead>
                <TableHead className="text-right">End sem /60</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...subjects].reverse().map((s) => (
                <TableRow key={`${s.sem}-${s.subject}`}>
                  <TableCell>{s.sem}</TableCell>
                  <TableCell>
                    <Lineage refText={s.ref}>{s.subject}</Lineage>
                  </TableCell>
                  <TableCell className="tabular text-right">{s.internal ?? <span className="text-muted-foreground">missing</span>}</TableCell>
                  <TableCell className="tabular text-right">{s.end_sem ?? (s.sem === cur ? <span className="text-muted-foreground">pending</span> : "-")}</TableCell>
                  <TableCell className={cn("tabular text-right", s.total !== null && s.total < 40 && "font-medium text-risk-high")}>{s.total ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="attendance" className="mt-4 space-y-4">
        <KV
          items={[
            ["Overall", `${d.attendance?.overall_pct ?? "-"}%`],
            ["Core subjects", `${d.attendance?.core_pct ?? "-"}%`],
            ...Object.entries(d.attendance?.by_month ?? {}).map(
              ([m, v]) => [m, <Lineage key={m} refText={byMonthRef[m]}>{`${v}%`}</Lineage>] as [string, React.ReactNode],
            ),
          ]}
        />
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(d.attendance?.by_subject ?? {}).map(([s, v]) => (
            <li key={s} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="truncate pr-2">{s}</span>
              <span className={cn("tabular font-medium", (v as number) < 65 && "text-risk-high")}>{String(v)}%</span>
            </li>
          ))}
        </ul>
      </TabsContent>

      <TabsContent value="lms" className="mt-4 space-y-3">
        {d.lms ? (
          <>
            <KV
              items={[
                ["Logins / week", d.lms.login_freq],
                ["Assignment completion", `${d.lms.completion_rate}%`],
                ["Minutes / week", d.lms.minutes_per_week],
                ["Trend (logins / wk)", Number(d.lms.trend_slope).toFixed(2)],
              ]}
            />
            <p className="text-xs text-muted-foreground">
              Linked LMS account{d.lms.lineage?.accounts?.length > 1 ? "s (merged)" : ""}: {(d.lms.lineage?.accounts ?? []).join(", ")} ·{" "}
              {d.lms.lineage?.rows} rows in lms_activity_log.csv
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No LMS identity linked. Ambiguous email matches wait in the review queue under Data integration.</p>
        )}
      </TabsContent>

      <TabsContent value="engagement" className="mt-4 space-y-3">
        <KV
          items={[
            ["Hackathons", d.engagement?.hackathons ?? 0],
            ["Clubs", d.engagement?.clubs ?? 0],
            ["Workshops", d.engagement?.workshops ?? 0],
            ["Certifications", d.engagement?.certifications ?? 0],
          ]}
        />
        {ev.length ? (
          <ul className="divide-y rounded-lg border text-sm">
            {ev.map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                <Lineage refText={e.ref}>{e.event}</Lineage>
                <span className="shrink-0 text-xs text-muted-foreground capitalize">
                  {e.type} · {e.date ?? "date unknown"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No clubs, events or certifications on record.</p>
        )}
      </TabsContent>

      <TabsContent value="placement" className="mt-4">
        {d.placement?.visited_cell ? (
          <KV
            items={[
              ["Aptitude", <Lineage key="a" refText={d.placement.lineage?.row}>{d.placement.aptitude ?? "-"}</Lineage>],
              ["Coding", d.placement.coding ?? "-"],
              ["Mock interviews", d.placement.mocks_attended ?? 0],
              ["Mock rating", d.placement.mock_rating ? `${d.placement.mock_rating}/5` : "No mocks yet"],
            ]}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Has not visited the placement cell yet. Readiness is treated as a data gap, not a judgement.</p>
        )}
      </TabsContent>

      <TabsContent value="skills" className="mt-4">
        {d.skills ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium">Technical ({d.skills.technical_avg})</p>
              <KV items={Object.entries(tech).map(([k, v]) => [k.replaceAll("_", " "), String(v)] as [string, React.ReactNode])} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Soft skills ({d.skills.soft_avg})</p>
              <KV items={Object.entries(soft).map(([k, v]) => [k.replaceAll("_", " "), String(v)] as [string, React.ReactNode])} />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              From {d.skills.lineage?.record} ({d.skills.lineage?.vendor}). 0-10 scale assessments are rescaled to 0-100.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Absent for the skills assessment cycle.</p>
        )}
      </TabsContent>

      <TabsContent value="feedback" className="mt-4 space-y-2">
        <p className="text-xs text-muted-foreground">Context only. Feedback never changes the Success Score.</p>
        {d.feedback.length ? (
          d.feedback.map((f: any, i: number) => (
            <blockquote key={i} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <p>{f.comment}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {f.course} · rating {f.rating}/5 · {f.language === "hi" ? "Hindi" : f.language === "hinglish" ? "Hinglish" : "English"} · {f.theme}
              </p>
            </blockquote>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No named feedback. Anonymous responses are only used at course level.</p>
        )}
      </TabsContent>

      <TabsContent value="lineage" className="mt-4 space-y-4">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Identifier as recorded</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(
                (d.links as any[]).reduce((acc: Record<string, any>, l) => {
                  const k = `${l.source}|${l.raw_key}`;
                  acc[k] ??= l;
                  return acc;
                }, {}),
              )
                .slice(0, 30)
                .map((l: any) => (
                  <TableRow key={`${l.source}-${l.raw_key}`}>
                    <TableCell className="whitespace-nowrap">{SOURCE_LABEL[l.source] ?? l.source}</TableCell>
                    <TableCell className="font-mono text-xs">{l.raw_key}</TableCell>
                    <TableCell className="text-xs">{l.match_method.replaceAll("_", " ")}</TableCell>
                    <TableCell className={cn("tabular text-right", l.status === "review" && "text-risk-medium")}>
                      {Number(l.match_confidence).toFixed(2)} {l.status === "review" && "(review)"}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {d.conflicts.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Conflicts resolved for this student</p>
            {d.conflicts.map((c: any, i: number) => (
              <div key={i} className="rounded-lg border border-risk-medium/30 bg-risk-medium-soft/40 px-3 py-2 text-sm">
                <p>
                  <span className="font-medium">{c.attribute.replace("_pct", "")}</span>: {SOURCE_LABEL[c.source_a]} says {c.value_a},{" "}
                  {SOURCE_LABEL[c.source_b]} says {c.value_b}. Using <span className="font-medium">{c.resolved_value}</span>.
                </p>
                <p className="text-xs text-muted-foreground">{c.resolution}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No cross-source conflicts for this student.</p>
        )}
      </TabsContent>
    </Tabs>
  );
}
