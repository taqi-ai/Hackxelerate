import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, BellRing, CalendarCheck, Smartphone, Sparkles } from "lucide-react";
import { Aurora, Eyebrow } from "@/components/landing/site-kit";
import { cn } from "@/lib/utils";

/** Facts measured on the frozen demo cohort. Same numbers as the proof strip further down the page. */
const FACTS = [
  { v: "7", l: "campus systems joined" },
  { v: "1,200", l: "students in the demo cohort" },
  { v: "2", l: "separate risks, never blended" },
  { v: "100%", l: "precision on auto-matched links" },
];

const RISE = "motion-reduce:animate-none [animation-fill-mode:both]";

/** A floating glass note. Copy mirrors what the real student page says for a flagged student in the demo cohort. */
function Note({ icon: Icon, tag, children, className, delay = "0s" }: { icon: typeof BellRing; tag: string; children: React.ReactNode; className?: string; delay?: string }) {
  return (
    <div
      className={cn(
        "absolute hidden max-w-[15.5rem] rounded-2xl border border-white/10 bg-[#0c0c14]/85 p-3.5 text-left shadow-[0_20px_60px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl motion-safe:animate-[float_9s_ease-in-out_infinite] md:block",
        className,
      )}
      style={{ animationDelay: delay }}
    >
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[oklch(0.82_0.09_272)]">
        <Icon className="size-3.5" aria-hidden />
        {tag}
      </p>
      <p className="mt-1.5 text-[13px] leading-snug text-white/80">{children}</p>
    </div>
  );
}

/** First screen of the landing page: the promise, the two ways in, and the real product (current UI captures). */
export function HeroShowcase({ signedIn }: { signedIn: boolean }) {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <Aurora />
      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pb-10 pt-28 text-center sm:px-6 sm:pt-32 lg:pt-36">
        <div className={cn("animate-[page-enter_700ms_cubic-bezier(0.22,1,0.36,1)]", RISE)}>
          <Eyebrow>HacXLerate 2026 · KPMG in India · Challenge 04</Eyebrow>
        </div>
        <h1
          id="hero-title"
          className={cn("mt-7 max-w-5xl text-balance font-display text-[2.55rem] font-semibold leading-[1.02] tracking-[-0.04em] animate-[page-enter_800ms_80ms_cubic-bezier(0.22,1,0.36,1)] sm:text-6xl lg:text-[4.6rem]", RISE)}
        >
          From early warning to{" "}
          <span className="bg-gradient-to-r from-[oklch(0.86_0.09_285)] via-[oklch(0.82_0.1_240)] to-[oklch(0.84_0.1_195)] bg-clip-text text-transparent">real intervention.</span>
        </h1>
        <p className={cn("mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-white/65 animate-[page-enter_800ms_160ms_cubic-bezier(0.22,1,0.36,1)]", RISE)}>
          Ascora joins seven campus systems into one view of every student, scores and explains who needs support, then helps a mentor act and checks that it worked.
        </p>
        <div className={cn("mt-9 flex flex-wrap items-center justify-center gap-3 animate-[page-enter_800ms_240ms_cubic-bezier(0.22,1,0.36,1)]", RISE)}>
          <Link
            href={signedIn ? "/overview" : "/login"}
            className="press group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-[#07070b] shadow-[0_0_44px_-6px_oklch(0.8_0.07_272/0.65)] hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {signedIn ? "Open dashboard" : "Open the live demo"}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <Link
            href="/mobile"
            className="press inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 font-medium text-white/90 hover:border-white/30 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Smartphone className="size-4" aria-hidden />
            Test the Android app
          </Link>
        </div>
        <p className="mt-3 text-xs text-white/60">The Android app is built, but there is no APK yet. Try it in your browser now, no install needed.</p>

        {/* product stage */}
        <div className={cn("relative mt-14 w-full max-w-6xl animate-[page-enter_1000ms_320ms_cubic-bezier(0.22,1,0.36,1)]", RISE)}>
          <div aria-hidden className="absolute -inset-x-10 -bottom-10 top-1/3 -z-10 rounded-[3rem] bg-[radial-gradient(closest-side,oklch(0.62_0.16_272/0.35),transparent)] blur-3xl" />
          <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#0a0a10] shadow-[0_40px_120px_-30px_oklch(0.62_0.16_272/0.55)] [mask-image:linear-gradient(to_bottom,black_82%,transparent)]">
            <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.03] px-4 py-2.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="ml-3 truncate rounded-md bg-white/[0.05] px-3 py-0.5 text-[11px] text-white/60">ascora-five.vercel.app/overview</span>
            </div>
            <Image
              src="/assets/shots/overview.webp"
              alt="The Ascora campus overview: score cards, weekly engagement heatmap and the mentor agenda"
              width={2400}
              height={1500}
              priority
              sizes="(min-width: 1152px) 1152px, 100vw"
              className="h-auto w-full"
            />
          </div>

          <div className="absolute -bottom-6 right-2 hidden w-[9.5rem] rotate-[4deg] rounded-[1.6rem] border border-white/20 bg-black p-1.5 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.95)] sm:block md:right-8 md:w-[11.5rem] lg:-right-4 lg:w-[13rem]">
            <Image src="/assets/shots/mobile-welcome.webp" alt="The Ascora Android app welcome screen" width={780} height={1688} sizes="208px" className="h-auto w-full rounded-[1.2rem]" />
          </div>

          <Note icon={BellRing} tag="Early warning" className="-left-6 top-[18%] lg:-left-14">
            No LMS logins in 14 days while marks still look fine.
          </Note>
          <Note icon={Sparkles} tag="Why" className="-left-2 top-[48%] lg:-left-10" delay="-3s">
            Core attendance 62%, below the 65% comfort zone. SHAP shows the drivers.
          </Note>
          <Note icon={CalendarCheck} tag="Act" className="bottom-[14%] left-[26%]" delay="-6s">
            Mentor meeting booked. The baseline score is frozen to measure the effect.
          </Note>
        </div>

        <p className="mt-6 text-xs text-white/60">Screens show the synthetic demo cohort. No real student data is used.</p>

        <dl className="mt-10 grid w-full max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
          {FACTS.map((f) => (
            <div key={f.l} className="bg-[#09090f] px-4 py-5">
              <dt className="sr-only">{f.l}</dt>
              <dd>
                <span className="font-display text-3xl font-semibold tracking-tight">{f.v}</span>
                <span className="mt-1 block text-xs text-white/55">{f.l}</span>
              </dd>
            </div>
          ))}
        </dl>

        <a
          href="#platform"
          className="group mt-12 inline-flex flex-col items-center gap-2 rounded-full text-xs text-white/55 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
        >
          Scroll to see how it works
          <span className="grid size-9 place-items-center rounded-full border border-white/15 group-hover:border-white/40">
            <ArrowDown className="size-4 motion-safe:animate-bounce" aria-hidden />
          </span>
        </a>
      </div>
    </section>
  );
}
