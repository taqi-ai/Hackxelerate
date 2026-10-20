/** Per-source freshness as computed by the pipeline (services/ml/app/freshness.py): dates come from inside the data. */
export type SourceFreshness = { as_of: string | null; basis: string; age_days: number | null; stale: boolean | null; stale_after_days?: number | null };

const fmt = (iso: string) => new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export function freshnessLabel(f: SourceFreshness | undefined | null): { text: string; tone: "ok" | "stale" | "none"; title: string } {
  if (!f) return { text: "Not reported", tone: "none", title: "This run did not report freshness (published before freshness was tracked)." };
  if (!f.as_of) return { text: "No dates in file", tone: "none", title: f.basis };
  const age = f.age_days ?? 0;
  const ago = age === 0 ? "today" : age === 1 ? "1 day old" : `${age} days old`;
  return {
    text: `${fmt(f.as_of)} (${ago})`,
    tone: f.stale ? "stale" : "ok",
    title: `${f.basis}${f.stale ? `; older than the ${f.stale_after_days}-day limit for this source` : ""}`,
  };
}

/** the stalest dated source, for a one-line summary */
export function stalest(all: Record<string, SourceFreshness> | null | undefined): [string, SourceFreshness] | null {
  const dated = Object.entries(all ?? {}).filter(([, f]) => f.as_of && f.age_days !== null);
  if (!dated.length) return null;
  return dated.sort((a, b) => Number(b[1].stale) - Number(a[1].stale) || (b[1].age_days ?? 0) - (a[1].age_days ?? 0))[0];
}
