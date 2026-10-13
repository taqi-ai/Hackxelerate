import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, Eye, FileLock2, ShieldCheck, TriangleAlert, UserRoundX } from "lucide-react";
import { getArtifacts, getProfile } from "@/lib/data";
import { EmptyState, PageHeader, Panel } from "@/components/kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Fairness & privacy" };

function Audit({ a }: { a: any }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {a.rule} {a.note}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {a.attributes.map((attr: any) => (
          <div key={attr.attribute} className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-medium">{attr.attribute}</h3>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                  attr.status === "ok" ? "bg-risk-low-soft text-risk-low ring-risk-low/25" : "bg-risk-medium-soft text-risk-medium ring-risk-medium/25",
                )}
              >
                {attr.status === "ok" ? <CheckCircle2 className="size-3" /> : <TriangleAlert className="size-3" />}
                {attr.status === "ok" ? "Within thresholds" : "Review needed"}
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Flagged High</TableHead>
                  <TableHead className="text-right">Missed (FNR)</TableHead>
                  <TableHead className="text-right">False alarms</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attr.groups.map((g: any) => (
                  <TableRow key={g.group}>
                    <TableCell>{g.group}</TableCell>
                    <TableCell className="tabular text-right">{g.n}</TableCell>
                    <TableCell className="tabular text-right">{(g.flag_rate * 100).toFixed(0)}%</TableCell>
                    <TableCell className="tabular text-right">{g.fnr === null ? "-" : `${(g.fnr * 100).toFixed(0)}%`}</TableCell>
                    <TableCell className="tabular text-right">{g.fpr === null ? "-" : `${(g.fpr * 100).toFixed(0)}%`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-2 text-xs text-muted-foreground">
              Flag-rate ratio {attr.flag_rate_ratio} (needs 0.80 or more). Largest missed-case gap {(attr.fnr_gap * 100).toFixed(0)} pts (needs 10 or less).
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function FairnessPage() {
  const profile = await getProfile();
  if (profile?.role !== "admin") redirect("/");
  const a = await getArtifacts(["fairness_academic", "fairness_placement"]);

  return (
    <>
      <PageHeader
        title="Fairness & privacy"
        description="An early-warning system that treats some groups worse than others does harm. We audit it, and we design the product so students keep their dignity and their data."
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: ShieldCheck, t: "Sensitive attributes never predict", d: "Gender, residence, first-generation status, lateral entry and schooling medium are used only in this audit, never as model inputs." },
          { icon: UserRoundX, t: "Students never see a risk label", d: "Risk and segment labels are for mentors. Students are offered support, not a classification." },
          { icon: Eye, t: "Role-based access, audited", d: "Mentors see only their own students (enforced in the database). Every profile view is written to an audit log." },
          { icon: FileLock2, t: "DPDP Act 2023 by design", d: "Purpose limitation (support only, never discipline), data minimisation, masked contact details, no mental-health inference." },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="rounded-xl border bg-card p-4">
            <Icon className="mb-2 size-5 text-brand" strokeWidth={1.75} />
            <h2 className="mb-1 text-sm font-medium">{t}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>

      <Panel className="mt-4" title="Fairness audit" description="Flag rates and error rates by group, for each model">
        {a.fairness_academic ? (
          <Tabs defaultValue="academic">
            <TabsList>
              <TabsTrigger value="academic">Academic risk</TabsTrigger>
              <TabsTrigger value="placement">Placement risk</TabsTrigger>
            </TabsList>
            <TabsContent value="academic" className="mt-4">
              <Audit a={a.fairness_academic} />
            </TabsContent>
            <TabsContent value="placement" className="mt-4">
              <Audit a={a.fairness_placement} />
            </TabsContent>
          </Tabs>
        ) : (
          <EmptyState title="No audit yet">Run the pipeline to generate it.</EmptyState>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Differences in flag rate are not automatically unfair: a group can genuinely face more risk, for example because of a long commute. What the audit
          checks is whether the model <em>misses</em> students in one group more often. Gaps marked for review should be investigated before the model is used on
          real students.
        </p>
      </Panel>
    </>
  );
}
