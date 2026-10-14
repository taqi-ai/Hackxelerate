import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Mic, ShieldCheck, Users } from "lucide-react";
import { MobileSimFrame } from "@/components/landing/mobile-sim-frame";
import { Aurora, Eyebrow, GhostCta } from "@/components/landing/site-kit";
import { Reveal } from "@/components/motion";

export const metadata: Metadata = {
  title: "Mobile app",
  description: "Try the Ascora Android app in your browser. The APK is not published yet, so the same app runs here for anyone to test.",
};

const THINGS = [
  { icon: Users, t: "Your mentees, ranked", d: "Students, scores and the reason each one is flagged, on the phone a mentor already carries." },
  { icon: CalendarCheck, t: "This week", d: "Who to meet first, within the hours you have, matching the web planner." },
  { icon: Mic, t: "Ask Ascora", d: "Ask about the cohort in plain language and get an answer built from the live data." },
  { icon: ShieldCheck, t: "Same roles as the web", d: "Sign-in uses the same accounts and database rules, so a mentor only sees their own students." },
];

export default function MobilePage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Aurora />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-24 pt-32 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pt-40">
          <div>
            <Reveal>
              <Eyebrow>Android · Expo · React Native</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-6 font-display text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.035em] text-balance sm:text-6xl">
                The mentor app. <span className="text-white/60">Try it right here.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/65">
                The Ascora mobile app is built and works against the same database as the website. There is no APK to download yet, so the real app runs in the phone on this page for anyone to test.
              </p>
            </Reveal>

            <Reveal delay={0.22}>
              <div role="status" className="mt-8 max-w-xl rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] p-4 text-sm leading-relaxed text-amber-100/90">
                <p className="font-medium text-amber-100">Android APK: not published yet</p>
                <p className="mt-1 text-amber-100/75">
                  A signed installable build has not been produced. When it is, the download, version and checksum will appear on this page. Until then, use the browser version below.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.28}>
              <ul className="mt-10 grid gap-4 sm:grid-cols-2">
                {THINGS.map((x) => (
                  <li key={x.t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <x.icon className="size-5 text-[oklch(0.82_0.09_272)]" aria-hidden />
                    <p className="mt-3 font-medium">{x.t}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/55">{x.d}</p>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.34}>
              <div className="mt-10 space-y-3 rounded-2xl border border-white/10 p-5 text-sm text-white/65">
                <p className="font-medium text-white">How to sign in</p>
                <p>
                  On the sign-in screen pick <strong className="font-medium text-white">Head of department</strong> or <strong className="font-medium text-white">Mentor</strong> for a ready demo account, or choose a student to preview their view. All data is a synthetic cohort of 1,200 students.
                </p>
                <p>
                  On a real phone you can run it with Expo Go: <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">npm run start</code> inside <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">apps/mobile</code>.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <GhostCta href="/trust">How access is protected</GhostCta>
                <Link href="/login" className="press rounded-full px-6 py-3 font-medium text-white/70 hover:text-white">
                  Open the web dashboard
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.12}>
            <MobileSimFrame />
          </Reveal>
        </div>
      </section>
    </>
  );
}
