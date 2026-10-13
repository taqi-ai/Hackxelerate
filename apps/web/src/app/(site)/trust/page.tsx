import type { Metadata } from "next";
import { EyeOff, Fingerprint, KeyRound, LockKeyhole, Scale, ScrollText, ShieldCheck, UserCheck, Users } from "lucide-react";
import { ClosingCta, PageHero, SectionHead } from "@/components/landing/site-kit";
import { Reveal } from "@/components/motion";
import { getProfile } from "@/lib/data";

export const metadata: Metadata = {
  title: "Trust",
  description: "How Ascora protects student data: database-enforced roles, masked contacts, audit logs, signed service tokens and an open fairness audit.",
};

const CONTROLS = [
  { icon: LockKeyhole, t: "Roles enforced in the database", b: "Row-level security in Postgres decides what each account can read. A mentor's query physically cannot return another mentor's students." },
  { icon: EyeOff, t: "Contacts masked by default", b: "Phone numbers and personal emails are masked in every view and only revealed with a reason." },
  { icon: ScrollText, t: "Every sensitive action is logged", b: "Reveals, interventions and pipeline runs land in an audit log that admins can review." },
  { icon: KeyRound, t: "Short-lived service tokens", b: "The analytics service only accepts signed tokens that expire in minutes. Admin-only routes check the role on every call." },
  { icon: Fingerprint, t: "Minimum data, clear purpose", b: "Only fields needed for support are stored. The design follows India's DPDP Act principles of purpose and minimisation." },
  { icon: UserCheck, t: "People decide, not the model", b: "Scores rank attention. They are never shown to students, and a mentor always chooses what happens next." },
];

const FAIRNESS = [
  { g: "Gender (academic)", ok: true },
  { g: "Residence (academic)", ok: false },
  { g: "First generation (academic)", ok: true },
  { g: "Lateral entry (academic)", ok: false },
  { g: "Schooling medium (academic)", ok: true },
  { g: "Gender (placement)", ok: false },
  { g: "Residence (placement)", ok: true },
  { g: "First generation (placement)", ok: true },
  { g: "Lateral entry (placement)", ok: false },
  { g: "Schooling medium (placement)", ok: true },
];

export default async function TrustPage() {
  const profile = await getProfile().catch(() => null);
  const passed = FAIRNESS.filter((f) => f.ok).length;
  return (
    <>
      <PageHero
        eyebrow="Trust"
        title="Built to be trusted with students, not just their numbers"
        lead="Privacy and fairness are part of the architecture, and the results we are not proud of are shown too."
      />

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CONTROLS.map((c, i) => (
            <Reveal key={c.t} delay={i * 0.05}>
              <div className="edge h-full rounded-3xl border border-white/10 bg-[#0e0e15] p-6">
                <span className="grid size-10 place-items-center rounded-xl bg-[oklch(0.8_0.07_272/0.14)] text-[oklch(0.86_0.08_272)]">
                  <c.icon className="size-5" aria-hidden />
                </span>
                <h2 className="mt-5 font-display text-xl font-semibold">{c.t}</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{c.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-32 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
          <SectionHead
            kicker="Fairness audit"
            title={`${passed} of ${FAIRNESS.length} group checks pass. We show the other ${FAIRNESS.length - passed}.`}
            lead="Each check needs a flag-rate ratio of at least 0.80 between groups and a false-negative gap within 10 points. Four checks miss one of these, and lateral entry is a small group, so they are marked for review before any real use."
          />
          <Reveal delay={0.1}>
            <ul className="grid gap-2 rounded-3xl border border-white/10 bg-[#0e0e15] p-4 sm:grid-cols-2">
              {FAIRNESS.map((f) => (
                <li key={f.g} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-4 py-3 text-sm">
                  <span className="text-white/80">{f.g}</span>
                  <span
                    className={
                      f.ok
                        ? "rounded-full bg-[oklch(0.72_0.12_162/0.18)] px-2.5 py-0.5 text-xs text-[oklch(0.86_0.1_162)]"
                        : "rounded-full bg-[oklch(0.8_0.12_80/0.16)] px-2.5 py-0.5 text-xs text-[oklch(0.88_0.1_80)]"
                    }
                  >
                    {f.ok ? "Within threshold" : "Review"}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-32 sm:px-6">
        <div className="grid gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-8 sm:p-12 lg:grid-cols-3">
          {[
            { icon: Users, t: "No real students", b: "Every student in Ascora is generated for this project, with realistic messiness planted on purpose." },
            { icon: Scale, t: "Honest metrics", b: "Accuracy figures show the pipeline works on that cohort. They are not a promise for a real college." },
            { icon: ShieldCheck, t: "Ready for a real pilot", b: "A pilot would retrain on the college's own outcomes and repeat the fairness audit first." },
          ].map((x, i) => (
            <Reveal key={x.t} delay={i * 0.06}>
              <x.icon className="size-6 text-[oklch(0.84_0.08_272)]" aria-hidden />
              <h3 className="mt-4 font-display text-xl font-semibold">{x.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{x.b}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <ClosingCta signedIn={!!profile} />
    </>
  );
}

