import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, BookOpenCheck, Briefcase, CalendarCheck, ClipboardList, GraduationCap, MessageSquareText, Trophy } from "lucide-react";
import { Headline } from "@/components/landing/headline";
import { HeroStage } from "@/components/landing/hero-stage";
import { HeroLanding } from "@/components/landing/hero-landing";
import { Intro } from "@/components/landing/intro";
import { Story } from "@/components/landing/story";
import { Bento } from "@/components/landing/bento";
import { Aurora, ClosingCta, Eyebrow, GhostCta, PrimaryCta, SectionHead } from "@/components/landing/site-kit";
import { CountUp, Reveal } from "@/components/motion";
import { getProfile } from "@/lib/data";

export const metadata: Metadata = {
  title: { absolute: "Ascora: from early warning to real intervention" },
  description:
    "Ascora joins seven campus systems into one view of every student, explains who needs support and why, and tracks what mentors do about it.",
  openGraph: { title: "Ascora", description: "From early warning to real intervention.", images: ["/opengraph-image.png"] },
};

const SOURCES = [
  { icon: GraduationCap, label: "ERP marks" },
  { icon: CalendarCheck, label: "Attendance register" },
  { icon: BookOpenCheck, label: "LMS activity" },
  { icon: Trophy, label: "Clubs and events" },
  { icon: Briefcase, label: "Placement cell" },
  { icon: ClipboardList, label: "Skills assessment" },
  { icon: MessageSquareText, label: "Feedback forms" },
];

const PROOF = [
  { v: 7, label: "campus systems joined", note: "ERP, attendance, LMS, clubs, placement, skills, feedback" },
  { v: 62927, label: "rows unified into 1,200 students", note: "duplicates merged, 60 conflicts resolved by rule" },
  { v: 100, suffix: "%", label: "precision on auto-matched links", note: "measured against hidden ground truth" },
  { v: 0.88, decimals: 2, label: "academic risk AUC", note: "held-out test set, calibrated" },
];

const EXPLORE = [
  { href: "/product", title: "Product", body: "Every screen, from the campus overview to a single student's 360 view." },
  { href: "/how-it-works", title: "How it works", body: "The pipeline, the Success Score formula and the models, step by step." },
  { href: "/trust", title: "Trust", body: "Roles enforced in the database, masked contacts, audits and fairness checks." },
  { href: "/about", title: "About", body: "The team behind Ascora and why we built it." },
];

export default async function Home() {
  const profile = await getProfile().catch(() => null);
  return (
    <>
      {/* first screen: promise, both ways in, the real product */}
      <Intro />
      <HeroLanding signedIn={!!profile} />

      {/* the original hero, kept as the second beat: how the seven systems become one view */}
      <section id="platform" className="relative isolate scroll-mt-0 overflow-hidden border-t border-white/10">
        <Aurora />
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {[
            ["left-[8%] top-[22%] size-2", "0s", "9s"],
            ["left-[42%] top-[14%] size-1.5", "-3s", "11s"],
            ["right-[10%] top-[30%] size-2", "-5s", "10s"],
            ["left-[30%] bottom-[18%] size-1.5", "-2s", "12s"],
            ["right-[26%] bottom-[12%] size-2", "-7s", "9s"],
          ].map(([c, d, t]) => (
            <span key={c} className={`absolute rounded-full bg-white/40 shadow-[0_0_14px_3px_oklch(0.8_0.1_272/0.6)] motion-safe:animate-[float_var(--t)_ease-in-out_infinite] ${c}`} style={{ animationDelay: d, ["--t" as string]: t }} />
          ))}
        </div>
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-32 sm:px-6 lg:min-h-[100dvh] lg:grid-cols-[1.1fr_1fr] lg:pb-24 lg:pt-24">
          <div>
            <Reveal>
              <Eyebrow>Smart Campus Analytics for KPMG in India</Eyebrow>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-6 font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-[3.9rem] xl:text-[4.25rem]">
                <Headline lead="Catch the quiet slide." accent="Then do something about it." />
              </h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-white/65">
                Ascora reads seven campus systems as one, shows mentors who needs help and why, and tracks what happens next.
              </p>
            </Reveal>
            <Reveal delay={0.22}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <PrimaryCta href={profile ? "/overview" : "/login"}>{profile ? "Open dashboard" : "Open live demo"}</PrimaryCta>
                <GhostCta href="/how-it-works">See how it works</GhostCta>
              </div>
            </Reveal>
            <Reveal delay={0.3}>
              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
                <li>Explainable scores</li>
                <li>Mentor workflow built in</li>
                <li>Role-based access</li>
              </ul>
            </Reveal>
          </div>
          <div className="relative">
            <HeroStage />
          </div>
        </div>
      </section>

      {/* the seven systems, as a slow marquee */}
      <section aria-label="Campus systems Ascora joins" className="relative border-y border-white/10 bg-white/[0.015] py-6">
        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <ul className="flex w-max gap-4 motion-safe:animate-[marquee_40s_linear_infinite]">
            {[...SOURCES, ...SOURCES].map((s, i) => (
              <li key={i} aria-hidden={i >= SOURCES.length} className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70">
                <s.icon className="size-4 text-[oklch(0.8_0.07_272)]" aria-hidden />
                {s.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* measured results, not marketing numbers */}
      <section aria-label="Measured results" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {PROOF.map((p, i) => (
            <li key={p.label}>
              <Reveal delay={i * 0.06} className="h-full">
                <div className="h-full rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-6">
                  <CountUp value={p.v} decimals={p.decimals ?? 0} suffix={p.suffix ?? ""} className="font-display text-4xl font-semibold tracking-tight sm:text-5xl" />
                  <p className="mt-2 text-sm text-white/80">{p.label}</p>
                  <p className="mt-1 text-xs text-white/60">{p.note}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-white/60">Measured on a generated sample cohort of 1,200 students. No real student data is used.</p>
      </section>

      {/* the method, as a pinned story */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-28 sm:px-6">
        <SectionHead kicker="The loop" title="Most early-warning systems stop at the red flag. Ascora starts there." />
        <div className="mt-6">
          <Story />
        </div>
      </section>

      {/* product */}
      <section id="product" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-28 sm:px-6">
        <SectionHead
          kicker="For every role"
          title="Built for the people who act on it"
          lead="Heads of department see the whole campus. Mentors see their own students and what to do this week."
        />
        <div className="mt-12">
          <Bento />
        </div>
      </section>

      {/* why this design */}
      <section className="mx-auto max-w-7xl px-4 pt-28 sm:px-6">
        <div className="grid gap-10 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-8 sm:p-12 lg:grid-cols-2">
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

      {/* explore the rest of the site */}
      <section className="mx-auto max-w-7xl px-4 pt-28 sm:px-6">
        <SectionHead kicker="Go deeper" title="Everything a judge, a dean or a mentor would ask" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EXPLORE.map((e, i) => (
            <Reveal key={e.href} delay={i * 0.06}>
              <Link
                href={e.href}
                className="edge group flex h-full flex-col rounded-3xl border border-white/10 bg-[#0e0e15] p-6 transition-colors hover:bg-[#12121b]"
              >
                <span className="flex items-center justify-between font-display text-xl font-semibold">
                  {e.title}
                  <ArrowUpRight className="size-5 text-white/60 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" aria-hidden />
                </span>
                <span className="mt-3 text-sm leading-relaxed text-white/55">{e.body}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <ClosingCta signedIn={!!profile} />
    </>
  );
}
