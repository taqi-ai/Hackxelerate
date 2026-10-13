import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * The Overview's opening card: who you are, the one thing that matters this week, and where to go.
 * Always dark (in both themes) so the brand orb and logo glow read the same everywhere.
 */
export function CampusHero({ greeting, summary, chips }: { greeting: string; summary: React.ReactNode; chips: { label: string; href: string }[] }) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-[#0b0b14] p-6 text-white shadow-[0_30px_80px_-40px_oklch(0.5_0.16_272/0.7)] sm:p-8">
      {/* layered orb: the 3D-feeling centrepiece, pure CSS */}
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 size-[340px] sm:-right-6 sm:-top-16">
        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_200deg,oklch(0.7_0.16_272),oklch(0.72_0.15_320),oklch(0.78_0.12_200),oklch(0.7_0.16_272))] opacity-80 blur-[2px] motion-safe:animate-[spin_24s_linear_infinite]" />
        <div className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle_at_30%_30%,oklch(0.95_0.03_272),oklch(0.55_0.14_272)_45%,oklch(0.2_0.06_272)_80%)] shadow-[inset_-20px_-30px_60px_oklch(0.15_0.05_272)]" />
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,transparent_55%,#0b0b14_100%)]" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_circle_at_0%_100%,oklch(0.55_0.16_272/0.25),transparent_60%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_right,black,transparent_70%)]" />

      <div className="relative max-w-xl">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70 backdrop-blur">
          <Sparkles className="size-3" aria-hidden /> Campus intelligence
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.02em] sm:text-[2.4rem] sm:leading-[1.08]">{greeting}</h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/65">{summary}</p>
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <Link
            href="/this-week"
            className="press group inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#0b0b14] hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Plan this week <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          {chips.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="press rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-sm text-white/80 backdrop-blur hover:bg-white/10 hover:text-white"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
