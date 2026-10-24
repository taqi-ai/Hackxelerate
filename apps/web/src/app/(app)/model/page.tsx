import type { Metadata } from "next";
import { getArtifacts } from "@/lib/data";
import { EmptyState, PageHeader, Panel, Stat } from "@/components/kit";
import { HBar, SimpleLine } from "@/components/charts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COMPONENT_LABEL } from "@/lib/format";
import { OULAD_BENCHMARK as OU } from "@/lib/external-benchmark";

export const metadata: Metadata = { title: "Score & models" };

function ModelBlock({ m }: { m: any }) {
  const x = m.metrics;
  const base = x.baseline_logreg;
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="ROC-AUC (held out)" value={x.roc_auc.toFixed(3)} hint={`5-fold CV ${x.cv_roc_auc_mean.toFixed(3)} ± ${x.cv_roc_auc_std.toFixed(3)}. Logistic baseline ${base.roc_auc.toFixed(3)}`} />
        <Stat label="PR-AUC" value={x.pr_auc.toFixed(3)} hint={`Base rate ${(x.positive_rate * 100).toFixed(0)}%. Baseline ${base.pr_auc.toFixed(3)}`} />
        <Stat label="Precision @ 50" value={x.precision_at_k["50"]?.toFixed(2) ?? "-"} tone="brand" hint="Of the 50 students ranked highest-risk, the share who truly had the outcome" />
        <Stat label="Recall at High" value={x.recall_at_high !== null ? `${(x.recall_at_high * 100).toFixed(0)}%` : "-"} hint={`Precision at High ${x.precision_at_high !== null ? (x.precision_at_high * 100).toFixed(0) + "%" : "-"}. Medium or above catches ${(x.recall_at_medium_or_high * 100).toFixed(0)}%`} />
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="What drives the model" description="Mean absolute SHAP value across all students">
          <HBar data={m.importance.slice(0, 10).map((i: any) => ({ name: i.label, value: i.mean_abs_shap }))} height={310} />
        </Panel>
        <Panel title="Calibration" description="When the model says 40%, about 40% of those students should have the outcome">
          <SimpleLine
            data={x.calibration.map((c: any) => ({ bin: c.bin, predicted: Math.round(c.predicted * 100), observed: Math.round(c.observed * 100) }))}
            xKey="bin"
            lines={[
              { key: "predicted", name: "Predicted %", color: "var(--chart-1)" },
              { key: "observed", name: "Observed %", color: "var(--chart-3)" },
            ]}
            yDomain={[0, 100]}
            height={260}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Thresholds: Medium from {Math.round(x.thresholds.medium * 100)}%, High from {Math.round(x.thresholds.high * 100)}%. Trained on {x.n_train} students, tested on {x.n_test}.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Why these cut-offs: High is where a flag is usually right
            {x.precision_at_high !== null ? ` (${Math.round(x.precision_at_high * 100)}% of High flags had the outcome)` : ""}, so a mentor&apos;s limited hours go to real cases.
            Medium is wider on purpose and catches {Math.round(x.recall_at_medium_or_high * 100)}% of students who went on to have the outcome, for lighter-touch follow-up.
            A college can move both in one config file after checking them against its own past outcomes.
          </p>
        </Panel>
      </div>
      <Panel title="Model card" description="Intended use, limits and prohibited uses">
        <pre tabIndex={0} aria-label="Scrollable score note" className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-4 font-sans text-sm leading-relaxed">{m.card}</pre>
      </Panel>
    </div>
  );
}

export default async function ModelPage() {
  const a = await getArtifacts(["score_formula", "sensitivity", "model_academic", "model_placement", "early_curve"]);
  if (!a.score_formula) {
    return (
      <>
        <PageHeader title="Score & models" />
        <EmptyState title="No model artifacts yet">Run the pipeline from Data integration.</EmptyState>
      </>
    );
  }
  const f = a.score_formula;
  const sens = a.sensitivity;
  const curve = a.early_curve?.points ?? [];

  return (
    <>
      <PageHeader
        title="Score & models"
        description="Nothing here is a black box. The Success Score is a weighted sum you can read, and each risk model shows its accuracy, calibration and the drivers behind every flag."
      />
      <Tabs defaultValue="score">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="score">Success Score</TabsTrigger>
          <TabsTrigger value="academic">Academic risk model</TabsTrigger>
          <TabsTrigger value="placement">Placement risk model</TabsTrigger>
          <TabsTrigger value="early">How early can we know?</TabsTrigger>
          <TabsTrigger value="data">Evaluation data</TabsTrigger>
        </TabsList>

        <TabsContent value="score" className="mt-4 space-y-4">
          <Panel title="Formula" description="Success Score = sum of component score × weight. Each component is a 0-100 cohort percentile.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(f.weights as Record<string, number>).map(([k, w]) => (
                <div key={k} className="rounded-lg border p-4">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-medium">{COMPONENT_LABEL[k]}</h3>
                    <span className="tabular text-lg font-semibold text-brand">{Math.round(w * 100)}%</span>
                  </div>
                  <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                    {(f.components[k] as any[]).map((i) => (
                      <li key={i.indicator} className="flex justify-between gap-2">
                        <span>{i.label}</span>
                        <span className="tabular">{Math.round(i.weight * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <ul className="mt-4 grid gap-1.5 text-sm text-muted-foreground">
              {f.notes.map((n: string) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Is the score stable?"
            description={`Each weight shifted by ±5 points. The ranking barely moves: the lowest rank correlation is ${sens.min_spearman.toFixed(3)}, and on average ${Math.round(sens.mean_bottom_overlap * 100)}% of the bottom ${sens.top_k} stay the same.`}
          >
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead className="text-right">Rank correlation</TableHead>
                    <TableHead className="text-right">Same bottom {sens.top_k}</TableHead>
                    <TableHead className="text-right">Largest rank move</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sens.scenarios.map((s: any) => (
                    <TableRow key={`${s.component}${s.shift}`}>
                      <TableCell>{COMPONENT_LABEL[s.component]}</TableCell>
                      <TableCell>{s.shift}</TableCell>
                      <TableCell className="tabular text-right">{s.spearman.toFixed(3)}</TableCell>
                      <TableCell className="tabular text-right">{Math.round(s.bottom_overlap * 100)}%</TableCell>
                      <TableCell className="tabular text-right">{s.max_rank_shift}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="academic" className="mt-4">
          <ModelBlock m={a.model_academic} />
        </TabsContent>
        <TabsContent value="placement" className="mt-4">
          <ModelBlock m={a.model_placement} />
        </TabsContent>

        <TabsContent value="early" className="mt-4">
          <Panel
            title="Academic risk model, retrained with only the data available by each week"
            description="Mid-sem internals arrive in week 8. Before that, attendance and LMS activity already carry signal."
          >
            <SimpleLine
              data={curve.map((c: any) => ({ week: `Week ${c.week}`, auc: c.roc_auc, recall: c.recall_top20 }))}
              xKey="week"
              lines={[
                { key: "auc", name: "ROC-AUC", color: "var(--chart-1)" },
                { key: "recall", name: "Recall in top 20%", color: "var(--chart-4)" },
              ]}
              yDomain={[0.5, 1]}
              height={280}
            />
            <ul className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
              {curve.map((c: any) => (
                <li key={c.week}>
                  Week {c.week} ({c.note}): AUC {c.roc_auc.toFixed(2)}, the top 20% flagged contains {Math.round(c.recall_top20 * 100)}% of those who go on to struggle.
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>
        <TabsContent value="data" className="mt-4 space-y-4">
          <p className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Two separate evaluations that must not be compared. The numbers in the first panel are what this demonstration runs on. The second panel is an
            independent experiment on public data and is <strong className="text-foreground">not the accuracy of Ascora&apos;s models</strong>.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Synthetic demo (this app)" description="Generated cohort of 1,200 students">
              <dl className="space-y-1.5 text-sm">
                <div><dt className="inline font-medium">Data type: </dt><dd className="inline">Synthetic. Labels and features come from one generator, so the task is easier than real life.</dd></div>
                <div><dt className="inline font-medium">Targets: </dt><dd className="inline">Academic: end-semester failure or a new backlog. Placement: not placed by final year (placement-intent students only).</dd></div>
                <div><dt className="inline font-medium">Status: </dt><dd className="inline">Reproduced from code on 24 Oct 2026. Not validated on real institutional outcomes.</dd></div>
                <div><dt className="inline font-medium">Held-out ROC-AUC: </dt><dd className="inline tabular">academic {a.model_academic?.metrics?.roc_auc?.toFixed(3) ?? "-"}, placement {a.model_placement?.metrics?.roc_auc?.toFixed(3) ?? "-"}</dd></div>
                <div><dt className="inline font-medium">Limits: </dt><dd className="inline">Random split, not out of time. Probabilities are unvalidated for any real deployment.</dd></div>
              </dl>
            </Panel>
            <Panel title="External benchmark (OULAD)" description="A separate experiment; never merged with the synthetic cohort">
              <dl className="space-y-1.5 text-sm">
                <div><dt className="inline font-medium">Dataset: </dt><dd className="inline">{OU.name}. {OU.kind}.</dd></div>
                <div><dt className="inline font-medium">Cite: </dt><dd className="inline">{OU.citation}</dd></div>
                <div><dt className="inline font-medium">Target: </dt><dd className="inline">{OU.target}.</dd></div>
                <div><dt className="inline font-medium">Protocol: </dt><dd className="inline">{OU.protocol}</dd></div>
                <div><dt className="inline font-medium">Test set: </dt><dd className="inline tabular">{OU.test.rows.toLocaleString("en-IN")} rows, {(OU.test.prevalence * 100).toFixed(1)}% positive</dd></div>
                <div>
                  <dt className="inline font-medium">ROC-AUC: </dt>
                  <dd className="inline tabular">
                    logistic baseline {OU.logistic.rocAuc.toFixed(2)} (95% CI {OU.logistic.rocCi[0].toFixed(2)} to {OU.logistic.rocCi[1].toFixed(2)}), LightGBM {OU.lightgbm.rocAuc.toFixed(2)} ({OU.lightgbm.rocCi[0].toFixed(2)} to {OU.lightgbm.rocCi[1].toFixed(2)}). The complex model adds nothing over the baseline.
                  </dd>
                </div>
                <div><dt className="inline font-medium">Flagging 20%: </dt><dd className="inline tabular">finds {(OU.flag20.recall * 100).toFixed(0)}% of at-risk students at {(OU.flag20.precision * 100).toFixed(0)}% precision</dd></div>
                <div><dt className="inline font-medium">Status: </dt><dd className="inline">Completed, single run. Different target, population and data origin from the demo, so the two sets of numbers are not comparable. Does not validate transfer to any Indian institution.</dd></div>
              </dl>
            </Panel>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
