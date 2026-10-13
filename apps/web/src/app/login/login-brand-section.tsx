"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { motion, useSpring, useReducedMotion } from "framer-motion";

/**
 * LoginBrandSection:
 * Left-side branding showcase with 3D floating orb aura, pointer parallax on the logo and headline,
 * and dimensional pillar cards.
 */
export function LoginBrandSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const springConfig = { damping: 25, stiffness: 100, mass: 0.6 };
  const floatX = useSpring(0, springConfig);
  const floatY = useSpring(0, springConfig);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;

    floatX.set(normX * 15);
    floatY.set(normY * 15);
  }

  function handleMouseLeave() {
    floatX.set(0);
    floatY.set(0);
  }

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="grain relative hidden flex-col justify-between overflow-hidden bg-[#07070b] p-12 text-white lg:flex select-none"
    >
      {/* 3D Volumetric Ambient Aurora Glow */}
      <motion.div
        aria-hidden
        style={{
          x: reduceMotion ? 0 : floatX,
          y: reduceMotion ? 0 : floatY,
        }}
        className="pointer-events-none absolute -left-32 top-1/4 size-[650px] rounded-full bg-[radial-gradient(closest-side,oklch(0.75_0.15_272/0.22),transparent)] blur-3xl motion-safe:animate-[drift_16s_ease-in-out_infinite_alternate]"
      />

      {/* Floating 3D Geometric Atmospheric Mesh */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,oklch(1_0_0/0.035)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_30%_50%,black,transparent_75%)]"
      />

      {/* Official Ascora Logo with subtle floating motion */}
      <motion.div
        animate={
          reduceMotion
            ? {}
            : {
                y: [0, -4, 0],
              }
        }
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative -ml-10 -mt-6"
      >
        <Image
          src="/assets/logo-dark.webp"
          alt="Ascora"
          width={1400}
          height={467}
          priority
          className="h-auto w-80 filter drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]"
        />
      </motion.div>

      {/* Headline & Value Proposition with Stagger Entrance and subtle 3D translation */}
      <motion.div
        style={{
          x: reduceMotion ? 0 : floatX,
          y: reduceMotion ? 0 : floatY,
        }}
        className="relative max-w-md space-y-5"
      >
        <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-[-0.03em] text-balance">
          From early warning to real intervention.
        </h1>
        <p className="text-base leading-relaxed text-white/70">
          Ascora joins ERP, attendance, LMS, placement, skills, clubs and feedback into one view of every student, explains who needs support and why, and tracks what mentors do about it.
        </p>
      </motion.div>

      {/* 3D-Elevated Feature Pillars */}
      <ul className="relative grid max-w-md grid-cols-3 gap-6 text-sm">
        <li className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.05]">
          <p className="font-medium text-white">Explainable</p>
          <p className="mt-1 text-xs text-white/60">Every score shows its drivers</p>
        </li>
        <li className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.05]">
          <p className="font-medium text-white">Two risks</p>
          <p className="mt-1 text-xs text-white/60">Academic and placement, never blended</p>
        </li>
        <li className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.05]">
          <p className="font-medium text-white">Private</p>
          <p className="mt-1 text-xs text-white/60">Role-based access, audited views</p>
        </li>
      </ul>
    </section>
  );
}
