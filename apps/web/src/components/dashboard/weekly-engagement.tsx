import { Activity } from "lucide-react";
import type { StudentRow } from "@/lib/types";

const LEVELS = ["Low", "Medium", "High", "Best"] as const;

/**
 * Average weekly LMS logins per group across the 12 teaching weeks, binned into four levels by
 * cohort quartile. Striped tiles are below the top band, solid tiles are the best weeks.
 */
export function WeeklyEngagement({ rows, logins, groupBy }: { rows: StudentRow[]; logins: Map<string, number[]>; groupBy: (r: StudentRow) => string }) {
  const groups = new Map<string, { n: number; sums: number[] }>();
  for (const r of rows) {
    const s = logins.get(r.id);
    if (!s) continue;
    const k = groupBy(r);
    const g = groups.get(k) ?? { n: 0, sums: Array(12).fill(0) };
    g.n++;
    s.forEach((v, i) => (g.sums[i] += v));
    groups.set(k, g);
  }
  const data = [...groups.entries()]
    .map(([k, g]) => ({ group: k, avg: g.sums.map((v) => v / g.n) }))
    .sort((a, b) => a.group.localeCompare(b.group));
  if (!data.length) return <p className="text-sm text-muted-foreground">No LMS activity yet.</p>;

  const all = data.flatMap((d) => d.avg).sort((a, b) => a - b);
  const q = (p: number) => all[Math.min(all.length - 1, Math.floor(p * all.length))];
  const cuts = [q(0.25), q(0.5), q(0.75)];
  const level = (v: number) => (v < cuts[0] ? 0 : v < cuts[1] ? 1 : v < cuts[2] ? 2 : 3);

  const tile = (l: number) =>
    l === 3
      ? { background: "var(--brand)", boxShadow: "0 0 16px -4px var(--brand)" }
      : {
          backgroundColor: `color-mix(in oklch, var(--brand) ${[10, 22, 40][l]}%, var(--card))`,
          backgroundImage: `repeating-linear-gradient(115deg, color-mix(in oklch, var(--brand) ${[18, 30, 55][l]}%, transparent) 0 1.5px, transparent 1.5px 5px)`,
        };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {LEVELS.map((l, i) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: `color-mix(in oklch, var(--brand) ${[25, 45, 70, 100][i]}%, var(--muted))` }} />
            {l}
          </span>
        ))}
        <span className="ml-auto flex items-center gap-1">
          <Activity className="size-3" aria-hidden /> Avg logins per student
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <div className="grid min-w-[560px] grid-cols-[minmax(84px,auto)_repeat(12,minmax(0,1fr))] gap-1.5">
          {data.map((d) => (
            <div key={d.group} className="contents">
              <span className="self-center truncate pr-2 text-xs font-medium">{d.group}</span>
              {d.avg.map((v, i) => (
                <span
                  key={i}
                  className="aspect-[1.15] rounded-[7px] transition-transform duration-200 hover:z-10 hover:scale-110"
                  style={tile(level(v))}
                  title={`${d.group}, week ${i + 1}: ${v.toFixed(1)} logins on average (${LEVELS[level(v)]})`}
                />
              ))}
            </div>
          ))}
          <span />
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className={i === 7 ? "text-center text-[11px] font-medium text-brand" : "text-center text-[11px] text-muted-foreground"}>
              W{i + 1}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Week 8 was mid-semester exams. Hover a tile for the exact value.</p>
    </div>
  );
}
