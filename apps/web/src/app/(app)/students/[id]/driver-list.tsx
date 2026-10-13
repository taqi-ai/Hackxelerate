import { ArrowDownRight, ArrowUpRight, Hand } from "lucide-react";
import type { Drivers } from "@/lib/types";

export function DriverList({ drivers }: { drivers: Drivers | null }) {
  if (!drivers || (!drivers.raises.length && !drivers.lowers.length)) {
    return <p className="text-sm text-muted-foreground">No strong drivers: this student sits close to the cohort average on every model input.</p>;
  }
  const max = Math.max(...[...drivers.raises, ...drivers.lowers].map((d) => Math.abs(d.impact)), 0.01);
  return (
    <div className="space-y-4">
      {drivers.raises.length > 0 && (
        <ul className="space-y-2.5">
          {drivers.raises.map((d) => (
            <li key={d.feature} className="grid grid-cols-[1fr_auto] items-start gap-3">
              <div className="flex gap-2">
                <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-risk-high" />
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{d.label}</span> {d.value_text}{" "}
                    <span className="text-muted-foreground">(cohort median {d.median_text})</span>
                  </p>
                  {d.actionable && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-brand">
                      <Hand className="size-3" /> Something a mentor can act on
                    </p>
                  )}
                </div>
              </div>
              <span className="mt-1.5 inline-block h-1.5 w-20" aria-hidden>
                <span className="block h-full rounded-full bg-risk-high/80" style={{ width: `${(100 * Math.abs(d.impact)) / max}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {drivers.lowers.length > 0 && (
        <div className="border-t pt-3">
          <p className="mb-2 text-xs text-muted-foreground">Working in their favour</p>
          <ul className="space-y-2">
            {drivers.lowers.map((d) => (
              <li key={d.feature} className="grid grid-cols-[1fr_auto] items-start gap-3">
                <p className="flex gap-2 text-sm">
                  <ArrowDownRight className="mt-0.5 size-4 shrink-0 text-risk-low" />
                  <span>
                    <span className="font-medium">{d.label}</span> {d.value_text}{" "}
                    <span className="text-muted-foreground">(median {d.median_text})</span>
                  </span>
                </p>
                <span className="mt-1.5 inline-block h-1.5 w-20" aria-hidden>
                  <span className="block h-full rounded-full bg-risk-low/70" style={{ width: `${(100 * Math.abs(d.impact)) / max}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
