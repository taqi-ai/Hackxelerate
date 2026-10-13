"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { EmptyState, RiskBadge, ScoreValue } from "@/components/kit";
import { INTERVENTION_LABEL } from "@/lib/format";
import type { StudentRow } from "@/lib/types";

const ALERT_TO_TYPE: Record<string, string> = {
  silent_decliner: "mentor_meeting",
  lms_silent: "mentor_meeting",
  core_attendance: "mentor_meeting",
  attendance_drop: "mentor_meeting",
  backlogs: "peer_tutoring",
  no_mock: "mock_interview",
  assignments: "peer_tutoring",
};

/** minutes a meeting is likely to need: more for high risk and for several alerts */
function minutesFor(r: StudentRow) {
  const base = r.academic_risk_level === "High" || r.placement_risk_level === "High" ? 40 : 25;
  return base + Math.min(10, 5 * Math.max(0, r.alerts.length - 1));
}

export function Planner({ rows }: { rows: StudentRow[] }) {
  const [hours, setHours] = useState(3);

  const plan = useMemo(() => {
    const budget = hours * 60;
    // value per minute: greedy knapsack on priority / minutes, then show in priority order
    const scored = rows.map((r) => ({ r, m: minutesFor(r), value: r.priority / minutesFor(r) })).sort((a, b) => b.value - a.value);
    const picked: typeof scored = [];
    let used = 0;
    for (const s of scored) {
      if (used + s.m <= budget) {
        picked.push(s);
        used += s.m;
      }
    }
    picked.sort((a, b) => b.r.priority - a.r.priority);
    const covered = picked.reduce((a, b) => a + b.r.priority, 0);
    const total = rows.reduce((a, b) => a + b.priority, 0);
    return { picked, used, share: total ? covered / total : 0 };
  }, [rows, hours]);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="h-fit space-y-5 rounded-xl border bg-card p-5 lg:sticky lg:top-20">
        <div className="space-y-1">
          <label htmlFor="hours" className="text-sm font-medium">
            Hours available this week
          </label>
          <p className="tabular text-4xl font-semibold tracking-tight">{hours}h</p>
        </div>
        <Slider id="hours" min={1} max={10} step={0.5} value={[hours]} onValueChange={([v]) => setHours(v)} aria-label="Hours available" />
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Meetings</dt>
            <dd className="tabular text-xl font-semibold">{plan.picked.length}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Time planned</dt>
            <dd className="tabular text-xl font-semibold">{(plan.used / 60).toFixed(1)}h</dd>
          </div>
        </dl>
        <p className="text-xs leading-relaxed text-muted-foreground">
          These meetings cover {(plan.share * 100).toFixed(0)}% of the total priority among the 80 highest-priority students. Meeting length is
          estimated at 25 to 50 minutes from risk level and number of alerts.
        </p>
      </aside>

      <section aria-label="Suggested meetings">
        {plan.picked.length === 0 ? (
          <EmptyState icon={Clock} title="Not enough time for a single meeting">
            Increase the hours available to see who to meet first.
          </EmptyState>
        ) : (
          <ol className="divide-y rounded-xl border bg-card">
            {plan.picked.map(({ r, m }, i) => {
              const a = r.alerts[0];
              const type = a ? ALERT_TO_TYPE[a.type] : r.placement_risk_level === "High" ? "mock_interview" : "mentor_meeting";
              return (
                <li key={r.id}>
                  <Link href={`/students/${r.id}`} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50 sm:px-5">
                    <span className="tabular text-sm text-muted-foreground">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{r.name}</span>
                        <ScoreValue score={r.success_score} className="text-sm" />
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">{a?.text ?? r.persona}</span>
                      <span className="mt-1 block text-xs text-brand">
                        Suggested: {INTERVENTION_LABEL[type]} · about {m} min
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <RiskBadge level={r.academic_risk_level} label="Acad." />
                      {r.placement_risk_level !== "N/A" && <RiskBadge level={r.placement_risk_level} label="Place." />}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
