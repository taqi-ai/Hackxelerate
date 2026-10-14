import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { getArtifacts, getInterventions, getStudentRows } from "@/lib/data";
import { EmptyState, PageHeader, Panel, Stat } from "@/components/kit";
import { HBar } from "@/components/charts";
import { InterventionRow } from "../students/[id]/intervention-panel";
import { INTERVENTION_LABEL } from "@/lib/format";
import { campusDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Interventions" };

export default async function InterventionsPage() {
  const [items, rows, art] = await Promise.all([getInterventions(), getStudentRows(), getArtifacts(["what_works"])]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const withNames = items.map((i) => ({ ...i, student_name: byId.get(i.student_id)?.name }));
  const open = withNames.filter((i) => i.status === "open" || i.status === "in_progress");
  const done = withNames.filter((i) => i.status === "done");
  const overdue = open.filter((i) => i.due_date && i.due_date < campusDate());
  const ww = art.what_works;

  // students who finished an intervention: has their risk moved since it was logged?
  const improved = done.filter((i) => {
    const r = byId.get(i.student_id);
    return r && i.baseline && r.academic_risk_prob < i.baseline.academic_risk_prob;
  }).length;

  return (
    <>
      <PageHeader
        title="Interventions"
        description="Flags only matter if someone acts on them. Track what was planned, who owns it, and whether risk moved afterwards."
      />
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Open" value={open.length} tone="brand" />
        <Stat label="Overdue" value={overdue.length} tone={overdue.length ? "high" : undefined} />
        <Stat label="Completed" value={done.length} tone="low" />
        <Stat label="Risk down after completion" value={done.length ? `${improved} of ${done.length}` : "-"} hint="Academic risk vs baseline at logging" />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Panel title="Open interventions" description="Update the status inline">
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
          title="What works"
          description="Share of at-risk students whose risk improved last semester, by intervention, versus similar students who got none"
        >
          {ww?.rows?.length ? (
            <div className="space-y-3">
              <p className="text-sm">
                Without any intervention: <span className="tabular font-medium">{Math.round(ww.control.improved_rate * 100)}%</span> improved on their own (n=
                {ww.control.n}).
              </p>
              <HBar
                data={ww.rows.map((r: any) => ({ name: `${r.label} (n=${r.n})`, value: r.lift_pts }))}
                unit=" pts"
                height={ww.rows.length * 34 + 20}
              />
              <p className="text-xs text-muted-foreground">Lift in percentage points over the no-intervention group. {ww.note}</p>
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
            <EmptyState title="No history yet">Intervention outcomes will accumulate here as mentors close them out.</EmptyState>
          )}
        </Panel>
      </section>

      {done.length > 0 && (
        <Panel title="Completed" className="mt-4">
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
