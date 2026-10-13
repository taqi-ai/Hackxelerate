import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Lock, Target, TriangleAlert } from "lucide-react";
import { getInterventions, getStudent360 } from "@/lib/data";
import { Panel, RiskBadge } from "@/components/kit";
import { ComponentRadar } from "@/components/charts";
import { ScoreRing } from "@/components/motion";
import { COMPONENT_LABEL, INTENT_LABEL, maskEmail, maskPhone, scoreTone, suggestIntervention } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DriverList } from "./driver-list";
import { StudentTimeline } from "./timeline";
import { SourceTabs } from "./source-tabs";
import { WhatIf } from "./what-if";
import { InterventionPanel } from "./intervention-panel";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: id };
}

export default async function Student360({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [d, interventions] = await Promise.all([getStudent360(id), getInterventions(id)]);
  if (!d || !d.score) notFound();
  const { student: st, score } = d;
  const comps = Object.entries(score.components) as [keyof typeof COMPONENT_LABEL, number][];
  const topDriver = score.shap_academic?.raises?.[0] ?? score.shap_placement?.raises?.[0];
  const ready = score.readiness;
  const placementTrack = score.placement_risk_level !== "N/A";

  return (
    <div className="space-y-4">
      <Link href="/students" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Students
      </Link>

      {/* header */}
      <section className="edge relative grid gap-4 overflow-hidden rounded-2xl border bg-card/80 p-5 backdrop-blur-sm lg:grid-cols-[1fr_auto]">
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-[radial-gradient(circle,var(--glow),transparent_70%)]" />
        <div className="space-y-3">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{st.name}</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{st.id}</span> · {st.branch}, Year {st.year}, Section {st.section} · Mentor{" "}
              {st.mentors?.name ?? st.mentor_id}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RiskBadge level={score.academic_risk_level} prob={score.academic_risk_prob} label="Academic risk" />
            {placementTrack ? (
              <RiskBadge level={score.placement_risk_level} prob={score.placement_risk_prob} label="Placement risk" />
            ) : (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground ring-1 ring-inset ring-border">
                Goal: {INTENT_LABEL[score.intent] ?? score.intent} (goal-specific readiness below)
              </span>
            )}
            <Link href={`/segments#seg-${score.segment_id}`} className="rounded-md bg-brand-soft px-1.5 py-0.5 text-xs font-medium text-brand hover:underline">
              {score.persona}
            </Link>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3" /> {maskEmail(st.email)} · {maskPhone(st.phone)} · contact details are masked; this view is logged.
          </p>
        </div>
        <div className="flex items-center justify-center lg:justify-end">
          <ScoreRing score={score.success_score} size={136} />
        </div>
      </section>

      {score.alerts.length > 0 && (
        <section className="rounded-xl border border-risk-high/25 bg-risk-high-soft/50 px-5 py-3">
          <ul className="grid gap-1.5 text-sm">
            {score.alerts.map((a) => (
              <li key={a.type} className="flex items-start gap-2">
                <TriangleAlert className={cn("mt-0.5 size-4 shrink-0", a.severity === "high" ? "text-risk-high" : "text-risk-medium")} />
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Why this academic risk?" description="Strongest model drivers for this student (SHAP), in plain language">
          <DriverList drivers={score.shap_academic} />
        </Panel>
        {placementTrack ? (
          <Panel title="Why this placement risk?" description="Placement-track students only. Drivers from the placement model.">
            <DriverList drivers={score.shap_placement} />
          </Panel>
        ) : (
          <Panel title={`Readiness for ${INTENT_LABEL[score.intent] ?? "their goal"}`} description="Measured against the student's own goal, not placement">
            <Readiness ready={ready} />
          </Panel>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <Panel title="Score breakdown" description="Six components, each a cohort percentile. The cohort median is 50.">
          <ComponentRadar compare data={comps.map(([k, v]) => ({ k: COMPONENT_LABEL[k], v, c: 50 }))} />
          <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {comps.map(([k, v]) => (
              <li key={k} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{COMPONENT_LABEL[k]}</span>
                <span className={cn("tabular font-medium", scoreTone(v))}>{v.toFixed(0)}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Smallest changes that help" description="Model-estimated counterfactual using only things a student can change">
          <Recourse score={score} />
          <div className="mt-5 border-t pt-5">
            <WhatIf studentId={st.id} placementTrack={placementTrack} />
          </div>
        </Panel>
      </section>

      {placementTrack && ready && (
        <Panel title="Placement readiness" description="Goal-specific readiness and gaps">
          <Readiness ready={ready} />
        </Panel>
      )}

      <InterventionPanel
        studentId={st.id}
        studentName={st.name}
        interventions={interventions}
        suggestedType={suggestIntervention(topDriver?.feature)}
        suggestedDriver={topDriver?.text ?? null}
        current={{ success_score: score.success_score, academic_risk_prob: score.academic_risk_prob, placement_risk_prob: score.placement_risk_prob }}
      />

      <Panel title="This semester, week by week" description="LMS activity and submissions by week, attendance by month, SGPA by semester">
        <StudentTimeline lms={d.lms} attendance={d.attendance} academic={d.academic} />
      </Panel>

      <Panel title="Data from every source" description="Hover a value to see the exact file, sheet and row it came from">
        <SourceTabs d={d} />
      </Panel>
    </div>
  );
}

function Recourse({ score }: { score: NonNullable<Awaited<ReturnType<typeof getStudent360>>>["score"] }) {
  const items = Object.values(score?.recourse ?? {}).filter(Boolean);
  if (!items.length)
    return (
      <p className="text-sm text-muted-foreground">
        Not at high risk on either model, so no corrective plan is needed. Keep the regular mentoring cadence.
      </p>
    );
  return (
    <div className="grid gap-4">
      {items.map((r) => (
        <div key={r!.kind} className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Target className="size-4 text-brand" />
            {r!.kind === "academic" ? "Academic" : "Placement"} risk {Math.round(r!.from_prob * 100)}% to {Math.round(r!.to_prob * 100)}%
            {!r!.reaches_target && <span className="text-xs font-normal text-muted-foreground">(best achievable with these levers)</span>}
          </p>
          <ol className="ml-6 list-decimal space-y-1 text-sm">
            {r!.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Searched over attendance, assignment completion, LMS activity, mock interviews and soft skills only. Never over immutable attributes. A
        model estimate, not a guarantee.
      </p>
    </div>
  );
}

function Readiness({ ready }: { ready: any }) {
  if (!ready) return <p className="text-sm text-muted-foreground">No readiness data.</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="text-muted-foreground">Readiness for {INTENT_LABEL[ready.intent] ?? ready.intent}: </span>
        <span className={cn("tabular text-lg font-semibold", scoreTone(ready.score ?? 0))}>{ready.score?.toFixed(0) ?? "-"}</span>
        <span className="text-muted-foreground"> / 100</span>
      </p>
      <ul className="grid gap-1.5 text-sm sm:grid-cols-3">
        {Object.entries(ready.parts as Record<string, number | null>).map(([k, v]) => (
          <li key={k} className="rounded-lg bg-muted/50 px-3 py-2">
            <span className="block text-xs text-muted-foreground">{k}</span>
            <span className="tabular font-medium">{v === null ? "No data" : v.toFixed(0)}</span>
          </li>
        ))}
      </ul>
      {ready.gaps?.length > 0 && (
        <div className="text-sm">
          <p className="mb-1 text-muted-foreground">Next steps</p>
          <ul className="ml-5 list-disc space-y-0.5">
            {ready.gaps.map((g: string) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
