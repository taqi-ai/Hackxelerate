import type { Components, StudentRow } from "@/lib/types";

const COLS: { key: keyof Components; label: string }[] = [
  { key: "academic", label: "Academic" },
  { key: "placement", label: "Placement" },
  { key: "attendance", label: "Attendance" },
  { key: "lms", label: "LMS" },
  { key: "skills", label: "Skills" },
  { key: "engagement", label: "Engagement" },
];

/** Average Success Score component per group, as a heatmap. Darker means stronger; weak spots stand out pale. */
export function HealthHeatmap({ rows, groupBy }: { rows: StudentRow[]; groupBy: (r: StudentRow) => string }) {
  const groups = new Map<string, { n: number; sums: Record<string, number> }>();
  for (const r of rows) {
    const k = groupBy(r);
    const g = groups.get(k) ?? { n: 0, sums: {} };
    g.n++;
    for (const c of COLS) g.sums[c.key] = (g.sums[c.key] ?? 0) + (r.components[c.key] ?? 0);
    groups.set(k, g);
  }
  const data = [...groups.entries()]
    .map(([k, g]) => ({ group: k, n: g.n, avg: Object.fromEntries(COLS.map((c) => [c.key, g.sums[c.key] / g.n])) as Record<string, number> }))
    .sort((a, b) => a.group.localeCompare(b.group));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] table-fixed border-separate border-spacing-1.5 text-sm">
        <thead>
          <tr>
            <th scope="col" className="w-36"><span className="sr-only">Group</span></th>
            {COLS.map((c) => (
              <th key={c.key} scope="col" className="pb-1 text-center text-xs font-normal text-muted-foreground">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.group}>
              <th scope="row" className="truncate pr-2 text-left text-xs font-medium">
                {d.group} <span className="font-normal text-muted-foreground">({d.n})</span>
              </th>
              {COLS.map((c) => {
                const v = d.avg[c.key];
                // 35..60 maps to the visible range; group averages of cohort percentiles sit close to 50
                const t = Math.max(0, Math.min(1, (v - 35) / 25));
                return (
                  <td key={c.key} className="p-0">
                    <div
                      className="grid h-10 place-items-center rounded-lg text-xs tabular transition-transform hover:scale-[1.06]"
                      style={{
                        background: `color-mix(in oklch, var(--brand) ${Math.round(12 + t * 78)}%, var(--card))`,
                        color: t > 0.55 ? "var(--primary-foreground)" : "var(--foreground)",
                      }}
                      title={`${d.group}, ${c.label}: average ${v.toFixed(1)} of 100`}
                    >
                      {v.toFixed(0)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Weaker</span>
        <span className="h-2 w-28 rounded-full bg-[linear-gradient(to_right,color-mix(in_oklch,var(--brand)_12%,var(--card)),var(--brand))]" />
        <span>Stronger</span>
        <span className="ml-auto">Average component score, 0 to 100</span>
      </div>
    </div>
  );
}
