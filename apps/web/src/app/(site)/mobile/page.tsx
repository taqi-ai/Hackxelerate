import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Download, Mic, ShieldCheck, Users } from "lucide-react";
import { MobileSimFrame } from "@/components/landing/mobile-sim-frame";
import { Aurora, Eyebrow, GhostCta } from "@/components/landing/site-kit";
import { Reveal } from "@/components/motion";

const APK = {
  url: "https://ascoradownloadseb0c.blob.core.windows.net/app/ascora-1.0.0.apk",
  file: "Ascora-1.0.0.apk",
  version: "1.0.0",
  size: "61 MB",
  date: "14 Oct 2026",
  sha256: "de74a1f9985120774bea60f46e2165953e41897cf3b5866faa2938765112892e",
};

export const metadata: Metadata = {
  title: "Mobile app",
  description: "Download the Ascora Android app, or try it in your browser.",
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
                The mentor app. <span className="text-white/60">On your phone.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/65">
                The Ascora Android app uses the same accounts and data as the website. Download it to your phone, or try it right here in the browser.
              </p>
            </Reveal>

            <Reveal delay={0.22}>
              <div className="mt-8 max-w-xl rounded-2xl border border-white/12 bg-white/[0.04] p-5">
                <a
                  href={APK.url}
                  download={APK.file}
                  className="press inline-flex h-12 items-center gap-2 rounded-full bg-[#f4f4f7] px-6 font-medium text-[#0a0a10] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Download className="size-4" aria-hidden />
                  Download for Android
                </a>
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                  <div><dt className="text-white/55">Version</dt><dd>{APK.version}</dd></div>
                  <div><dt className="text-white/55">Size</dt><dd>{APK.size}</dd></div>
                  <div><dt className="text-white/55">Requires</dt><dd>Android 7.0+</dd></div>
                  <div><dt className="text-white/55">Released</dt><dd>{APK.date}</dd></div>
                </dl>
                <details className="mt-4 text-sm text-white/65">
                  <summary className="cursor-pointer text-white/80">How to install</summary>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    <li>Tap Download for Android, then open the file from your notifications or Downloads.</li>
                    <li>If Android asks, allow your browser to install apps (Settings, Install unknown apps). This is needed for any app installed outside the Play Store.</li>
                    <li>Tap Install, then Open. If Play Protect shows a scan prompt, choose Scan app or Install anyway: Ascora is new and not yet on the Play Store.</li>
                  </ol>
                  <p className="mt-2 break-all text-xs text-white/50">SHA-256: {APK.sha256}</p>
                  <p className="mt-1 text-xs text-white/50">On an iPhone, use the browser version on this page.</p>
                </details>
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
                  On the sign-in screen pick <strong className="font-medium text-white">Head of department</strong> or <strong className="font-medium text-white">Mentor</strong> for a ready account, or choose a student to preview their view. All data is a synthetic cohort of 1,200 students.
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
