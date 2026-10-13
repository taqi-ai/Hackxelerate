import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getSegments, getStudentRows } from "@/lib/data";
import { PageHeader, ScoreValue } from "@/components/kit";
import { COMPONENT_LABEL, fmtInt } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Segments" };

const COMPS = ["academic", "placement", "attendance", "lms", "skills", "engagement"] as const;

export default async function SegmentsPage() {
  const [segments, rows] = await Promise.all([getSegments(), getStudentRows()]);
  const members = new Map<number, typeof rows>();
  rows.forEach((r) => members.set(r.segment_id, [...(members.get(r.segment_id) ?? []), r]));

  return (
    <>
      <PageHeader
        title="Segments"
        description="Students grouped by how they behave across all sources, not by a single number. Each group needs a different kind of help."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {segments.map((s) => {
          const m = (members.get(s.id) ?? []).sort((a, b) => b.priority - a.priority);
          const avg = m.length ? m.reduce((a, b) => a + b.success_score, 0) / m.length : 0;
          const highA = m.filter((x) => x.academic_risk_level === "High").length;
          return (
            <article id={`seg-${s.id}`} key={s.id} className="scroll-mt-20 space-y-4 rounded-xl border bg-card p-5">
              <header className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight">{s.persona}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                </div>
                <div className="text-right">
                  <p className="tabular text-2xl font-semibold">{fmtInt(m.length)}</p>
                  <p className="text-xs text-muted-foreground">students</p>
                </div>
              </header>

              <dl className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Avg score</dt>
                  <dd>
                    <ScoreValue score={avg} className="text-base" />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">High academic risk</dt>
                  <dd className="tabular font-medium">{fmtInt(highA)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Needs action first</dt>
                  <dd className="truncate font-medium">{m[0]?.name ?? "-"}</dd>
                </div>
              </dl>

              <div>
                <p className="mb-2 text-xs text-muted-foreground">Average component scores in this group (cohort median is 50)</p>
                <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
                  {COMPS.map((c) => (
                    <li key={c} className="flex items-baseline justify-between gap-2">
                      <span className="text-muted-foreground">{COMPONENT_LABEL[c]}</span>
                      <span className="tabular font-medium">{Math.round(s.centroid[c] ?? 0)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {s.traits.length > 0 && <p className="text-sm text-muted-foreground">Defining traits: {s.traits.join(", ")}.</p>}

              <div className="rounded-lg bg-brand-soft px-4 py-3 text-sm">
                <p className="mb-0.5 text-xs font-medium text-brand">Recommended action</p>
                <p className="leading-relaxed">{s.action}</p>
              </div>

              <Button asChild variant="outline" size="sm">
                <Link href={`/students?persona=${encodeURIComponent(s.persona)}`}>
                  Open {fmtInt(m.length)} members <ArrowRight className="size-4" />
                </Link>
              </Button>
            </article>
          );
        })}
      </div>
    </>
  );
}
