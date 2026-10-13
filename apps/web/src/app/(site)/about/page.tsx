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
  { name: "Taqi", role: "Team Lead", hue: 272 },
  { name: "Ashmit Tiwari", role: "Team member", hue: 300 },
  { name: "Ujjwal Gupta", role: "Team member", hue: 200 },
  { name: "Harsh Gupta", role: "Team member", hue: 162 },
  { name: "Lakshya Singh Parihar", role: "Team member", hue: 40 },
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
        <div className="grid items-center gap-10 rounded-[2rem] border border-white/10 bg-[#0c0c14] p-8 sm:p-12 lg:grid-cols-[1fr_1.1fr]">
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
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {TEAM.map((m, i) => (
            <Reveal key={m.name} delay={i * 0.06}>
              <li className="edge group flex h-full flex-col items-center rounded-3xl border border-white/10 bg-[#0e0e15] p-6 text-center transition-colors hover:bg-[#12121b]">
                <span
                  className="grid size-20 place-items-center rounded-full font-display text-2xl font-semibold text-white shadow-[0_10px_40px_-10px_var(--ring-c)] transition-transform duration-500 group-hover:scale-105"
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
                <p className="mt-5 font-display text-lg font-semibold leading-tight">{m.name}</p>
                <p className={m.role === "Team Lead" ? "mt-1 text-sm text-[oklch(0.84_0.08_272)]" : "mt-1 text-sm text-white/50"}>{m.role}</p>
                <p className="mt-3 text-xs text-white/40">B.Tech AIML, 2nd year, Sem 3</p>
              </li>
            </Reveal>
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
