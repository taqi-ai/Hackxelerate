import type { Metadata } from "next";
import { Compass, Heart, Target } from "lucide-react";
import { ClosingCta, LogoVideo, PageHero, SectionHead } from "@/components/landing/site-kit";
import { Reveal } from "@/components/motion";
import { getProfile } from "@/lib/data";

export const metadata: Metadata = {
  title: "About",
  description: "Ascora was built for KPMG in India's Smart Campus Analytics challenge at HacXLerate 2026 by a team of B.Tech AIML students from CU UP campus.",
};

const TEAM = [
  {
    name: "Taqi",
    role: "Organiser and team lead",
    area: "Lead",
    did: "Ran the team and worked across every part of Ascora: product, data, models, web, design and the demo.",
    hue: 272,
  },
  {
    name: "Ashmit Tiwari",
    role: "Brand and marketing",
    area: "Brand",
    did: "Logo teaser, promo graphics, the look and feel of the platform and how its USP is told.",
    hue: 300,
  },
  {
    name: "Harsh Gupta",
    role: "Brand and marketing",
    area: "Brand",
    did: "Promo graphics, theme and UI appeal, and shaping the story judges and colleges hear.",
    hue: 162,
  },
  {
    name: "Lakshya Singh Parihar",
    role: "Development, frontend",
    area: "Development",
    did: "Built frontend screens and components with Taqi for the web dashboard.",
    hue: 40,
  },
  {
    name: "Ujjwal Gupta",
    role: "Development, backend and mobile",
    area: "Development",
    did: "Backend work and the port of Ascora to the Android app.",
    hue: 200,
  },
];

const VALUES = [
  { icon: Target, t: "Action over alarms", b: "A flag is only useful if it leads to a conversation, a plan and a check on whether it worked." },
  { icon: Compass, t: "Explain everything", b: "Every number in Ascora can be traced back to its inputs, in words a mentor can repeat to a student." },
  { icon: Heart, t: "Students first", b: "Scores are for the people who support students, never labels that follow a student around." },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
}

export default async function AboutPage() {
  const profile = await getProfile().catch(() => null);
  return (
    <>
      <PageHero
        eyebrow="About"
        title="Built by students, for the people who look after students"
        lead={
          <>
            Ascora was built for <span className="text-white">KPMG in India&apos;s Smart Campus Analytics challenge</span> at HacXLerate 2026 by byteXL.
          </>
        }
      />

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-10 rounded-[2rem] border border-white/10 bg-[#030307] p-8 sm:p-12 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <LogoVideo className="h-auto w-full max-w-[460px]" />
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Why we built it</h2>
            <div className="mt-4 space-y-4 text-white/65">
              <p>
                We have seen classmates who looked fine on a marks sheet drift away quietly: fewer logins, missed labs, skipped mock interviews. By the time a
                grade drops, the moment to help has often passed.
              </p>
              <p>
                Colleges already hold the signals, spread across seven different systems. Ascora brings them together, explains who needs support and why,
                and gives mentors a realistic plan for the week.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-32 sm:px-6">
        <SectionHead
          kicker="The team"
          title="Five builders, one semester in"
          lead="All five of us are B.Tech AIML students in our second year (Semester 3) at CU UP campus."
        />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {TEAM.map((m, i) => (
            <li key={m.name} className={i === 0 ? "sm:col-span-2 lg:col-span-6" : "lg:col-span-3 xl:col-span-3"}>
              <Reveal delay={i * 0.06} className="h-full">
                <div
                  className={
                    i === 0
                      ? "edge group grid h-full items-center gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[oklch(0.3_0.08_272/0.35)] to-[#0e0e15] p-7 sm:grid-cols-[auto_1fr] sm:p-9"
                      : "edge group flex h-full items-start gap-5 rounded-3xl border border-white/10 bg-[#0e0e15] p-6 transition-colors hover:bg-[#12121b]"
                  }
                >
                  <span
                    className={`grid shrink-0 place-items-center rounded-full font-display font-semibold text-white shadow-[0_10px_40px_-10px_var(--ring-c)] transition-transform duration-500 group-hover:scale-105 ${i === 0 ? "size-24 text-3xl" : "size-14 text-lg"}`}
                    style={
                      {
                        background: `linear-gradient(135deg, oklch(0.7 0.14 ${m.hue}), oklch(0.45 0.12 ${m.hue + 40}))`,
                        "--ring-c": `oklch(0.7 0.14 ${m.hue})`,
                      } as React.CSSProperties
                    }
                    aria-hidden
                  >
                    {initials(m.name)}
                  </span>
                  <div>
                    <p className={`font-display font-semibold leading-tight ${i === 0 ? "text-2xl sm:text-3xl" : "text-lg"}`}>{m.name}</p>
                    <p className={i === 0 ? "mt-1 text-[oklch(0.84_0.08_272)]" : "mt-1 text-sm text-[oklch(0.84_0.08_272)]"}>{m.role}</p>
                    <p className={`mt-3 leading-relaxed text-white/70 ${i === 0 ? "max-w-2xl" : "text-sm"}`}>{m.did}</p>
                    <p className="mt-3 text-xs text-white/60">B.Tech AIML, 2nd year, Sem 3</p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-32 sm:px-6">
        <SectionHead kicker="What we believe" title="Three rules we built Ascora around" />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {VALUES.map((v, i) => (
            <Reveal key={v.t} delay={i * 0.06}>
              <div className="h-full rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-6">
                <v.icon className="size-6 text-[oklch(0.84_0.08_272)]" aria-hidden />
                <h3 className="mt-4 font-display text-xl font-semibold">{v.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{v.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-32 sm:px-6">
        <Reveal>
          <div className="rounded-3xl border border-white/10 bg-[#0e0e15] p-8 sm:p-10">
            <h2 className="font-display text-2xl font-semibold">About the data</h2>
            <p className="mt-3 max-w-3xl text-white/60">
              Every student in Ascora is generated for this project. The cohort of 1,200 students across seven campus systems includes realistic problems on
              purpose: inconsistent roll numbers, typos, duplicates and conflicting records. No real student data is used anywhere.
            </p>
          </div>
        </Reveal>
      </section>

      <ClosingCta signedIn={!!profile} />
    </>
  );
}
