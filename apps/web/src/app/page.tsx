import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { LandingNav } from "@/components/landing/nav";
import { SignalField } from "@/components/landing/signal-field";
import { Story } from "@/components/landing/story";
import { Bento } from "@/components/landing/bento";
import { CountUp, Reveal } from "@/components/motion";
import { SoundLayer } from "@/components/sound";
import { getProfile } from "@/lib/data";

export const metadata: Metadata = {
  title: { absolute: "Ascora: from early warning to real intervention" },
  description:
    "Ascora joins seven campus systems into one view of every student, explains who needs support and why, and tracks what mentors do about it.",
  openGraph: { title: "Ascora", description: "From early warning to real intervention.", images: ["/opengraph-image.png"] },
};

const PROOF = [
  { v: 7, label: "campus systems joined", note: "ERP, attendance, LMS, clubs, placement, skills, feedback" },
  { v: 62927, label: "rows unified into 1,200 students", note: "duplicates merged, 60 conflicts resolved by rule" },
  { v: 100, suffix: "%", label: "precision on auto-matched links", note: "measured against hidden ground truth" },
  { v: 0.88, decimals: 2, label: "academic risk AUC", note: "held-out test set, calibrated" },
];

export default async function Landing() {
  const profile = await getProfile().catch(() => null);
  return (
    <div className="dark grain min-h-[100dvh] overflow-x-clip bg-[#07070b] text-white [color-scheme:dark]">
      <LandingNav signedIn={!!profile} />
      <SoundLayer />

      <main>
        {/* hero */}
        <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-32 sm:px-6 lg:min-h-[100dvh] lg:grid-cols-[1.15fr_1fr] lg:pb-24 lg:pt-24">
          <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 bg-[radial-gradient(closest-side,oklch(0.8_0.07_272/0.16),transparent)]" />
          <div className="relative">
            <Reveal>
              <h1 className="font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-[3.9rem] xl:text-[4.25rem]">
                Catch the quiet slide. Then do something about it.
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-white/65">
                Ascora reads seven campus systems as one, shows mentors who needs help and why, and tracks what happens next.
              </p>
            </Reveal>
            <Reveal delay={0.22}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href={profile ? "/overview" : "/login"}
                  className="press group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-[#07070b] shadow-[0_0_40px_-6px_oklch(0.8_0.07_272/0.6)] hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {profile ? "Open dashboard" : "Try the live demo"}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <a href="#how" className="press rounded-full border border-white/15 px-6 py-3 font-medium text-white/85 hover:border-white/30 hover:bg-white/5">
                  See how it works
                </a>
              </div>
            </Reveal>
          </div>
          <div className="relative">
            <SignalField />
          </div>
        </section>

        {/* measured proof, not marketing numbers */}
        <section aria-label="Results from the demo run" className="border-y border-white/10 bg-white/[0.02]">
          <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 sm:px-6 lg:grid-cols-4">
            {PROOF.map((p) => (
              <div key={p.label} className="py-10 pr-6">
                <dt className="sr-only">{p.label}</dt>
                <dd>
                  <CountUp value={p.v} decimals={p.decimals ?? 0} suffix={p.suffix ?? ""} className="font-display text-4xl font-semibold tracking-tight sm:text-5xl" />
                  <p className="mt-2 text-sm text-white/80">{p.label}</p>
                  <p className="mt-1 text-xs text-white/40">{p.note}</p>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mx-auto max-w-7xl px-4 pb-6 text-xs text-white/35 sm:px-6">Figures from a synthetic cohort of 1,200 students built for this demo.</p>
        </section>

        {/* the method, as a pinned story */}
        <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-28 sm:px-6">
          <Reveal>
            <h2 className="max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Most early-warning systems stop at the red flag. Ascora starts there.
            </h2>
          </Reveal>
          <div className="mt-6">
            <Story />
          </div>
        </section>

        {/* product */}
        <section id="product" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-28 sm:px-6">
          <Reveal>
            <h2 className="max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">Built for the people who act on it</h2>
            <p className="mt-4 max-w-xl text-lg text-white/60">Heads of department see the whole campus. Mentors see their own students and what to do this week.</p>
          </Reveal>
          <div className="mt-12">
            <Bento />
          </div>
        </section>

        {/* why this design: the evidence behind "act, don't just flag" */}
        <section id="trust" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-28 sm:px-6">
          <div className="grid gap-10 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-8 sm:p-12 lg:grid-cols-2">
            <Reveal>
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Flags alone don&apos;t change outcomes. Support does.</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="space-y-4 text-white/65">
                <p>
                  Purdue&apos;s Course Signals was widely copied, yet later analysis questioned whether it improved retention at all. Georgia State tracked
                  hundreds of specific risk markers and gave advisors the time and workflow to act on them.
                </p>
                <p>So Ascora is built around the step after the flag: a reason, a plan, an owner, and a way to check whether it worked.</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* brand moment */}
        <section aria-label="Ascora" className="relative mx-auto mt-28 max-w-7xl overflow-hidden px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/10">
            <Image src="/assets/logo-dark.webp" alt="Ascora" width={1400} height={467} className="h-auto w-full" loading="lazy" />
            <div aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent motion-reduce:hidden" />
          </div>
        </section>

        {/* closing call */}
        <section className="mx-auto max-w-7xl px-4 py-28 text-center sm:px-6">
          <Reveal>
            <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">See it with a real cohort</h2>
            <p className="mx-auto mt-4 max-w-md text-white/60">Sign in with a demo account as a head of department or as a mentor. All data is synthetic.</p>
            <Link
              href={profile ? "/overview" : "/login"}
              className="press mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-medium text-[#07070b] shadow-[0_0_50px_-6px_oklch(0.8_0.07_272/0.6)] hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {profile ? "Open dashboard" : "Try the live demo"} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="flex items-center gap-2">
            <Image src="/assets/mark.png" alt="" width={18} height={15} className="h-4 w-5 object-contain opacity-80" />
            Ascora, built for HacXLerate 2026
          </span>
          <span>Synthetic data only. Scores support mentors; they never replace their judgement.</span>
        </div>
      </footer>
    </div>
  );
}
