"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Smartphone } from "lucide-react";

/** First screen of the landing page.
 *  The product is the hero: the real campus overview (a screenshot of the current UI) lies on a tilted plane that
 *  flattens as the visitor scrolls, with the mobile app overlapping it. Copy and buttons load with one CSS sequence,
 *  so nothing waits for JavaScript; only the scroll-linked depth needs it. */
export function HeroLanding({ signedIn }: { signedIn: boolean }) {
  const reduce = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stage, offset: ["start 0.72", "start 0.12"] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });
  const rotateX = useTransform(p, [0, 1], reduce ? [0, 0] : [22, 0]);
  const scale = useTransform(p, [0, 1], reduce ? [1, 1] : [0.9, 1]);
  const phoneY = useTransform(p, [0, 1], reduce ? [0, 0] : [90, -30]);
  const glow = useTransform(p, [0, 1], [0.55, 1]);

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-[#07070b]">
      {/* a single horizon light behind the product; no mesh blobs */}
      <motion.div
        aria-hidden
        style={{ opacity: glow }}
        className="pointer-events-none absolute inset-x-0 top-[44%] -z-10 mx-auto h-[720px] max-w-6xl rounded-[50%] bg-[radial-gradient(closest-side,oklch(0.55_0.13_272/0.42),oklch(0.45_0.1_265/0.12)_55%,transparent)] blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_70%_55%_at_30%_20%,black,transparent)]"
      />

      <div className="mx-auto max-w-7xl px-4 pt-28 sm:px-6 lg:pt-32">
        <div className="grid items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="hero-fade text-sm text-white/65" style={{ "--d": "60ms" } as React.CSSProperties}>
              Smart Campus Analytics for KPMG in India, HacXLerate 2026
            </p>
            <h1
              id="hero-title"
              className="mt-5 font-display text-[2.35rem] font-medium leading-[0.98] tracking-[-0.045em] text-[#f4f4f7] sm:text-6xl lg:text-[5.4rem]"
            >
              <span className="hero-line">
                <span style={{ "--d": "120ms" } as React.CSSProperties}>From early warning</span>
              </span>
              <span className="hero-line">
                <span style={{ "--d": "220ms" } as React.CSSProperties}>to real intervention.</span>
              </span>
            </h1>
            <p className="hero-fade mt-7 max-w-[34rem] text-lg leading-relaxed text-white/70" style={{ "--d": "420ms" } as React.CSSProperties}>
              Ascora reads seven campus systems as one, explains which students need support and why, and tracks what mentors do next.
            </p>
            <div className="hero-fade mt-9 flex flex-wrap items-center gap-3" style={{ "--d": "540ms" } as React.CSSProperties}>
              <Link
                href={signedIn ? "/overview" : "/login"}
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#f4f4f7] pl-6 pr-5 text-[15px] font-medium text-[#0a0a10] transition-[transform,background-color] duration-200 hover:bg-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.75_0.12_272)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070b]"
              >
                {signedIn ? "Open dashboard" : "Open live demo"}
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link
                href="/mobile"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 px-5 text-[15px] font-medium text-white/90 transition-[transform,border-color,background-color] duration-200 hover:border-white/35 hover:bg-white/[0.04] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.75_0.12_272)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070b]"
              >
                <Smartphone className="size-4" aria-hidden />
                Try the mobile app
              </Link>
            </div>
          </div>

          {/* the phone sits in the right column and overlaps the product plane below it */}
          <div className="relative hidden lg:col-span-4 lg:block">
            <motion.div style={{ y: phoneY }} className="relative z-20 ml-auto -mb-56 w-[15.5rem] xl:w-[17rem]">
              <div className="hero-plane rounded-[2.4rem] border border-white/15 bg-[#050508] p-2 shadow-[0_40px_90px_-30px_rgb(0_0_0/0.95),0_0_0_1px_rgb(255_255_255/0.04)_inset]" style={{ "--d": "650ms" } as React.CSSProperties}>
                <Image
                  src="/assets/ui/mobile-home.webp"
                  alt="The Ascora mobile app"
                  width={780}
                  height={1688}
                  sizes="272px"
                  className="h-auto w-full rounded-[1.95rem]"
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* product plane */}
        <div ref={stage} className="relative mt-16 [perspective:2200px] lg:mt-20">
          <div className="hero-plane" style={{ "--d": "380ms" } as React.CSSProperties}>
            <motion.div
              style={{ rotateX, scale, transformOrigin: "50% 0%" }}
              className="relative overflow-hidden rounded-2xl border border-white/12 bg-[#0b0b12] shadow-[0_60px_140px_-40px_oklch(0.45_0.12_272/0.75)] will-change-transform"
            >
              <Image
                src="/assets/ui/overview.webp"
                alt="Ascora campus overview with student counts, risk levels, the weekly engagement heatmap and the mentor agenda"
                width={2400}
                height={1500}
                priority
                sizes="(min-width: 1280px) 1232px, 100vw"
                className="h-auto w-full"
              />
              <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]" />
            </motion.div>
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#07070b] to-transparent" />
        </div>
      </div>
    </section>
  );
}
