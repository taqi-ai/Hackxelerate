import type { Metadata } from "next";
import { ClipboardList, TrendingDown } from "lucide-react";
import { getArtifacts, getInterventions, getStudentRows } from "@/lib/data";
import { EmptyState, PageHeader, Panel, Stat } from "@/components/kit";
import { HBar } from "@/components/charts";
import { InterventionRow } from "../students/[id]/intervention-panel";
import { INTERVENTION_LABEL } from "@/lib/format";
import { campusDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Interventions & Follow-up Effectiveness" };

export default async function InterventionsPage() {
  const [items, rows, art] = await Promise.all([getInterventions(), getStudentRows(), getArtifacts(["what_works"])]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const withNames = items.map((i) => ({ ...i, student_name: byId.get(i.student_id)?.name }));
  const open = withNames.filter((i) => i.status === "open" || i.status === "in_progress");
  const done = withNames.filter((i) => i.status === "done");
  const overdue = open.filter((i) => i.due_date && i.due_date < campusDate());
  const ww = art.what_works;

  // Follow-up coverage & observed improvement
  const doneWithFollowup = done.filter((i) => i.followup?.academic_risk_prob !== undefined && i.followup?.academic_risk_prob !== null);
  const followupCoveragePct = done.length > 0 ? Math.round((doneWithFollowup.length / done.length) * 100) : 0;

  // Students who finished an intervention: observed risk change vs baseline
  const improved = done.filter((i) => {
    if (i.outcome === "improved") return true;
    if (i.followup?.academic_risk_prob !== undefined && i.followup?.academic_risk_prob !== null && i.baseline) {
      return i.followup.academic_risk_prob < i.baseline.academic_risk_prob;
    }
    const r = byId.get(i.student_id);
    return r && i.baseline && r.academic_risk_prob < i.baseline.academic_risk_prob;
  }).length;

  const improvementPct = done.length > 0 ? Math.round((improved / done.length) * 100) : 0;

  // Group effectiveness by intervention type
  const typeMap = new Map<string, { total: number; done: number; withFollowup: number; improved: number; totalDelta: number }>();
  withNames.forEach((i) => {
    const cur = typeMap.get(i.type) ?? { total: 0, done: 0, withFollowup: 0, improved: 0, totalDelta: 0 };
    cur.total += 1;
    if (i.status === "done") {
      cur.done += 1;
      const evaluatedRisk = i.followup?.academic_risk_prob ?? byId.get(i.student_id)?.academic_risk_prob;
      if (evaluatedRisk !== undefined && i.baseline) {
        cur.withFollowup += 1;
        const delta = evaluatedRisk - i.baseline.academic_risk_prob;
        cur.totalDelta += delta;
        if (delta < -0.01 || i.outcome === "improved") {
          cur.improved += 1;
        }
      }
    }
    typeMap.set(i.type, cur);
  });

  const typeStats = Array.from(typeMap.entries()).map(([type, stats]) => {
    const avgDelta = stats.withFollowup > 0 ? (stats.totalDelta / stats.withFollowup) * 100 : 0;
    const rate = stats.withFollowup > 0 ? Math.round((stats.improved / stats.withFollowup) * 100) : 0;
    return {
      type,
      label: INTERVENTION_LABEL[type] ?? type,
      total: stats.total,
      done: stats.done,
      withFollowup: stats.withFollowup,
      improved: stats.improved,
      improvementRate: rate,
      avgDelta: avgDelta.toFixed(1),
    };
  });

  return (
    <>
      <PageHeader
        title="Interventions & Follow-up Effectiveness"
        description="Connect student detection with mentorship workflows. Track planned actions, verify follow-up assessments, and evaluate observed outcomes across cohorts."
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Total Initiated" value={withNames.length} hint="All tracked support actions" />
        <Stat label="Open / In Progress" value={open.length} tone="brand" />
        <Stat label="Overdue Review" value={overdue.length} tone={overdue.length ? "high" : undefined} hint="Past target review date" />
        <Stat label="Completed" value={done.length} tone="low" />
        <Stat
          label="Follow-up Coverage"
          value={done.length ? `${followupCoveragePct}%` : "-"}
          hint={`${doneWithFollowup.length} of ${done.length} completed with review`}
          tone={followupCoveragePct >= 70 ? "low" : "brand"}
        />
      </section>

      {/* Cohort Effectiveness Summary Card */}
      <section className="mt-4 rounded-xl border border-brand/20 bg-brand/5 p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              <TrendingDown className="size-4 text-brand" />
              Observed Progress After Intervention
            </h3>
            <p className="mt-0.5 text-muted-foreground">
              Across completed cases with recorded follow-ups, <strong className="text-foreground">{improved} of {done.length} ({improvementPct}%)</strong> demonstrated an observed reduction in academic risk probability.
            </p>
          </div>
          <div className="text-right">
            <span className="font-mono text-xl font-bold text-brand">{improvementPct}%</span>
            <span className="block text-[10px] text-muted-foreground">Observed Improvement Rate</span>
          </div>
        </div>
        <p className="mt-2.5 text-[11px] text-muted-foreground border-t border-brand/10 pt-2 italic">
          Methodological Notice: Wording reflects observed changes between baseline and subsequent follow-up evaluations. In accordance with institutional research standards, correlated improvements provide operational guidance and avoid unsupported causal assertions.
        </p>
      </section>

      {/* Breakdown by Intervention Type Table */}
      {typeStats.length > 0 && (
        <section className="mt-4">
          <Panel
            title="Outcomes Associated with Intervention Types"
            description="Aggregated tracking across support categories. Sample sizes and observed risk changes."
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                    <th className="py-2.5 px-3">Intervention Category</th>
                    <th className="py-2.5 px-3">Initiated</th>
                    <th className="py-2.5 px-3">Completed</th>
                    <th className="py-2.5 px-3">Follow-up Coverage</th>
                    <th className="py-2.5 px-3">Cases with Risk Reduction</th>
                    <th className="py-2.5 px-3">Mean Observed Risk Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {typeStats.map((s) => (
                    <tr key={s.type} className="hover:bg-muted/20">
                      <td className="py-2.5 px-3 font-semibold text-foreground">{s.label}</td>
                      <td className="py-2.5 px-3 font-mono">{s.total}</td>
                      <td className="py-2.5 px-3 font-mono">{s.done}</td>
                      <td className="py-2.5 px-3 font-mono">
                        {s.done > 0 ? `${Math.round((s.withFollowup / s.done) * 100)}%` : "-"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-semibold text-foreground">
                          {s.withFollowup > 0 ? `${s.improved}/${s.withFollowup} (${s.improvementRate}%)` : "Pending data"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {s.withFollowup > 0 ? (
                          <span className={Number(s.avgDelta) < 0 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground"}>
                            {Number(s.avgDelta) < 0 ? "" : "+"}{s.avgDelta} pts
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      )}

      {/* Main Grid: Open Interventions & What Works Historical Lift */}
      <section className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Panel title="Active Interventions Requiring Review" description="Update status inline or log follow-up measurements">
          {open.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Nothing open right now">
              Open a student profile and choose Plan intervention. The suggested type follows that student&apos;s top risk driver.
            </EmptyState>
          ) : (
            <ul className="divide-y">
              {open.map((i) => (
                <InterventionRow key={i.id} i={i} current={byId.get(i.student_id) ?? null} showStudent />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Empirical Program Lift Analysis"
          description="Share of at-risk students whose risk improved last semester, by intervention, versus similar control students who received none"
        >
          {ww?.rows?.length ? (
            <div className="space-y-3">
              <p className="text-sm">
                Control group (no intervention): <span className="tabular font-medium">{Math.round(ww.control.improved_rate * 100)}%</span> improved organically (n=
                {ww.control.n}).
              </p>
              <HBar
                data={ww.rows.map((r: any) => ({ name: `${r.label} (n=${r.n})`, value: r.lift_pts }))}
                unit=" pts"
                height={ww.rows.length * 34 + 20}
              />
              <p className="text-xs text-muted-foreground">Estimated lift in percentage points over the non-intervention control group. {ww.note}</p>
              <ul className="grid gap-1 text-xs text-muted-foreground">
                {ww.rows.map((r: any) => (
                  <li key={r.type}>
                    {INTERVENTION_LABEL[r.type] ?? r.label}: {r.lift_pts > 0 ? "+" : ""}
                    {r.lift_pts} pts, 95% interval ±{r.ci95_pts}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState title="No historical cohort data">
              Intervention lift models will update as semester cohort histories are processed.
            </EmptyState>
          )}
        </Panel>
      </section>

      {/* Completed Interventions Section with Follow-up Records */}
      {done.length > 0 && (
        <Panel title="Completed Interventions & Observed Follow-up Records" className="mt-4">
          <ul className="divide-y">
            {done.map((i) => (
              <InterventionRow key={i.id} i={i} current={byId.get(i.student_id) ?? null} showStudent />
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
