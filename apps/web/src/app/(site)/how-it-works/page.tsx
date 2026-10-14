import type { Metadata } from "next";
import { Brain, Database, GitMerge, HandHeart, LineChart, ShieldCheck } from "lucide-react";
import { ClosingCta, PageHero, SectionHead } from "@/components/landing/site-kit";
import { Reveal } from "@/components/motion";
import { getProfile } from "@/lib/data";

export const metadata: Metadata = {
  title: "How it works",
  description: "From seven raw campus exports to an explainable Success Score, two risk models and a mentor action plan.",
};

const PIPELINE = [
  { icon: Database, title: "Ingest", body: "CSV, Excel and JSON exports from ERP, attendance, LMS, clubs, placement, skills and feedback. Headers are mapped automatically." },
  { icon: GitMerge, title: "Match", body: "Roll numbers in five formats are normalised. Names and emails are fuzzy-matched; uncertain links wait for a person." },
  { icon: LineChart, title: "Score", body: "Every indicator becomes a cohort percentile, then six weighted components make the 0 to 100 Success Score." },
  { icon: Brain, title: "Predict", body: "Two calibrated models estimate academic and placement risk separately, with SHAP drivers for each student." },
  { icon: HandHeart, title: "Act", body: "Mentors get a ranked weekly plan and a suggested intervention. Every action is logged with a baseline." },
  { icon: ShieldCheck, title: "Audit", body: "Accuracy, calibration, stability and fairness are measured and shown inside the product." },
];

const WEIGHTS = [
  { k: "Academic", w: 30, hue: 272, note: "CGPA, internals, trend vs own past, backlog penalty" },
  { k: "Placement readiness", w: 20, hue: 300, note: "Aptitude, coding, mock interviews" },
  { k: "Attendance", w: 15, hue: 200, note: "Overall and core-subject attendance" },
  { k: "LMS activity", w: 15, hue: 230, note: "Logins, assignment completion, login trend" },
  { k: "Skills", w: 10, hue: 162, note: "Technical and soft-skill assessments" },
  { k: "Engagement", w: 10, hue: 60, note: "Hackathons, certifications, workshops, clubs" },
];

const MODELS = [
  { label: "Academic risk AUC", v: "0.881", sub: "logistic baseline 0.875" },
  { label: "Placement risk AUC", v: "0.802", sub: "logistic baseline 0.806" },
  { label: "Precision at top 50", v: "0.78", sub: "academic model" },
  { label: "Rank stability", v: "0.997", sub: "worst case over 12 weight shifts" },
];

const CHOICES = [
  { t: "Feedback never lowers a score", b: "An unhappy student must not be penalised for saying so. Feedback is shown as context only." },
  { t: "Missing data is a gap, not a failure", b: "No placement-cell visits means a neutral-low readiness and a clear 'no data' label, not a zero." },
  { t: "Two risks, never one label", b: "Academic and placement risk are separate. Students aiming for higher studies are not flagged for placement." },
  { t: "Sensitive traits are never inputs", b: "Gender, residence, first-generation status and similar fields are used only to audit fairness." },
];

export default async function HowItWorksPage() {
  const profile = await getProfile().catch(() => null);
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="From seven messy exports to one clear next step"
        lead="Each stage is measured, explained and visible inside the product. Nothing is a black box."
      />

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.06}>
              <li className="edge relative h-full rounded-3xl border border-white/10 bg-[#0e0e15] p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-[oklch(0.8_0.07_272/0.14)] text-[oklch(0.86_0.08_272)]">
                    <s.icon className="size-5" aria-hidden />
                  </span>
                  <span className="font-mono text-xs text-white/60">0{i + 1}</span>
                </div>
                <h2 className="mt-5 font-display text-2xl font-semibold">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{s.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-32 sm:px-6">
        <SectionHead
          kicker="The Success Score"
          title="A transparent formula you can read in one line"
          lead="Six components, fixed weights, all in one config file so a college can tune them."
        />
        <Reveal delay={0.1}>
          <div className="mt-10 rounded-3xl border border-white/10 bg-[#0e0e15] p-6 sm:p-8">
            <div className="flex h-4 w-full overflow-hidden rounded-full" role="img" aria-label="Weights: academic 30, placement 20, attendance 15, LMS 15, skills 10, engagement 10">
              {WEIGHTS.map((w) => (
                <span key={w.k} style={{ width: `${w.w}%`, background: `oklch(0.75 0.12 ${w.hue})` }} />
              ))}
            </div>
            <ul className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {WEIGHTS.map((w) => (
                <li key={w.k} className="flex gap-3">
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: `oklch(0.75 0.12 ${w.hue})` }} />
                  <div>
                    <p className="font-medium">
                      {w.k} <span className="font-mono text-white/60">{w.w}%</span>
                    </p>
                    <p className="text-sm text-white/60">{w.note}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-8 overflow-x-auto rounded-xl bg-black/30 px-4 py-3 font-mono text-xs text-white/70 sm:text-sm">
              Success Score = 0.30 Academic + 0.20 Placement + 0.15 Attendance + 0.15 LMS + 0.10 Skills + 0.10 Engagement
            </p>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-32 sm:px-6">
        <SectionHead kicker="Models" title="Measured on a held-out test set" lead="A plain logistic baseline scores close to the boosted model. We say so; the gain is calibration and per-student explanations." />
        <dl className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {MODELS.map((m, i) => (
            <Reveal key={m.label} delay={i * 0.06}>
              <div className="h-full rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-6">
                <dt className="text-sm text-white/60">{m.label}</dt>
                <dd className="mt-2 font-display text-4xl font-semibold tracking-tight">{m.v}</dd>
                <dd className="mt-1 text-xs text-white/60">{m.sub}</dd>
              </div>
            </Reveal>
          ))}
        </dl>
        <p className="mt-4 text-xs text-white/60">All figures come from the generated sample cohort of 1,200 students. Real use needs retraining on a college&apos;s own outcomes.</p>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-32 sm:px-6">
        <SectionHead kicker="Design choices" title="Decisions we made on purpose" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {CHOICES.map((c, i) => (
            <Reveal key={c.t} delay={i * 0.05}>
              <div className="h-full rounded-3xl border border-white/10 bg-[#0e0e15] p-6">
                <h3 className="font-display text-xl font-semibold">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{c.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <ClosingCta signedIn={!!profile} />
    </>
  );
}
