import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";

/** Slow-moving colour field behind page heroes. Pure CSS, paused for reduced motion. */
export function Aurora({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute -left-40 -top-56 h-[620px] w-[620px] rounded-full bg-[radial-gradient(closest-side,oklch(0.62_0.16_272/0.32),transparent)] blur-2xl animate-[aurora_22s_ease-in-out_infinite]" />
      <div className="absolute -right-32 top-10 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,oklch(0.7_0.13_200/0.18),transparent)] blur-2xl animate-[aurora_28s_ease-in-out_infinite_reverse]" />
      <div className="absolute bottom-[-280px] left-1/3 h-[520px] w-[720px] rounded-full bg-[radial-gradient(closest-side,oklch(0.65_0.14_320/0.14),transparent)] blur-2xl animate-[aurora_34s_ease-in-out_infinite]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70 backdrop-blur">
      <span className="size-1.5 rounded-full bg-[oklch(0.8_0.12_272)] shadow-[0_0_10px_oklch(0.8_0.12_272)]" />
      {children}
    </span>
  );
}

export function PageHero({ eyebrow, title, lead, children }: { eyebrow: string; title: React.ReactNode; lead: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden">
      <Aurora />
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-36 sm:px-6 lg:pb-24 lg:pt-44">
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-6 max-w-4xl font-display text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.035em] text-balance sm:text-6xl lg:text-7xl">{title}</h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/60 text-pretty">{lead}</p>
        </Reveal>
        {children && <Reveal delay={0.24}>{children}</Reveal>}
      </div>
    </section>
  );
}

export function SectionHead({ kicker, title, lead, center }: { kicker?: string; title: React.ReactNode; lead?: React.ReactNode; center?: boolean }) {
  return (
    <Reveal className={cn(center && "mx-auto text-center")}>
      {kicker && <p className="text-sm font-medium text-[oklch(0.8_0.07_272)]">{kicker}</p>}
      <h2 className={cn("mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl", center && "mx-auto")}>{title}</h2>
      {lead && <p className={cn("mt-4 max-w-2xl text-lg text-white/60 text-pretty", center && "mx-auto")}>{lead}</p>}
    </Reveal>
  );
}

/** The animated logo teaser. Its black background disappears with screen blending on dark surfaces. */
export function LogoVideo({ className }: { className?: string }) {
  return (
    <video
      className={cn("pointer-events-none select-none mix-blend-screen", className)}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster="/assets/logo-teaser-poster.webp"
      aria-label="Ascora logo animation"
    >
      <source src="/assets/logo-teaser.webm" type="video/webm" />
      <source src="/assets/logo-teaser.mp4" type="video/mp4" />
    </video>
  );
}

export function PrimaryCta({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "press group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-[#07070b] shadow-[0_0_40px_-6px_oklch(0.8_0.07_272/0.6)] hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

export function GhostCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="press rounded-full border border-white/15 px-6 py-3 font-medium text-white/85 hover:border-white/30 hover:bg-white/5">
      {children}
    </Link>
  );
}

/** Closing band shared by every marketing page. */
export function ClosingCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-28 sm:px-6">
      <div className="relative isolate overflow-hidden rounded-[2rem] border border-white/10 bg-[#030307] px-6 py-16 text-center sm:px-12">
        <Aurora className="opacity-30" />
        <Reveal className="relative">
          <LogoVideo className="mx-auto h-auto w-full max-w-[420px]" />
          <h2 className="mx-auto mt-6 max-w-2xl font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">From early warning to real intervention</h2>
          <p className="mx-auto mt-4 max-w-md text-white/60">Sign in as a head of department or a faculty mentor and walk a full cohort of 1,200 students.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <PrimaryCta href={signedIn ? "/overview" : "/login"}>{signedIn ? "Open dashboard" : "Get started"}</PrimaryCta>
            <GhostCta href="/how-it-works">How it works</GhostCta>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
