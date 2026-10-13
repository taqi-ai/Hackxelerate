"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from "framer-motion";
import { Sparkles, Activity } from "lucide-react";

/**
 * Cinematic3DHeroVisual:
 * Upgraded with pointer-reactive 3D dynamic tilt physics, floating student card with independent z-elevation,
 * volumetric specular illumination, and scroll-linked depth parallax.
 */
export function Cinematic3DHeroVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const reduceMotion = useReducedMotion();

  // Scroll parallax vectors
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const yScrollBackdrop = useTransform(scrollYProgress, [0, 1], [-20, 35]);
  const yScrollFront = useTransform(scrollYProgress, [0, 1], [0, -40]);

  // Pointer tilt physics with springs
  const springConfig = { damping: 25, stiffness: 120, mass: 0.6 };
  const mouseRotateX = useSpring(0, springConfig);
  const mouseRotateY = useSpring(0, springConfig);
  const glareX = useSpring(50, springConfig);
  const glareY = useSpring(50, springConfig);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;

    mouseRotateX.set(normY * -12);
    mouseRotateY.set(normX * 14);
    glareX.set(50 + normX * 40);
    glareY.set(50 + normY * 40);
  }

  function handleMouseLeave() {
    setIsHovered(false);
    mouseRotateX.set(0);
    mouseRotateY.set(0);
    glareX.set(50);
    glareY.set(50);
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: 1400 }}
      className="relative mx-auto w-full max-w-[620px] select-none py-4"
    >
      {/* 3D Volumetric Glow Orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.65_0.15_272/0.28),transparent)] blur-3xl motion-safe:animate-[drift_16s_ease-in-out_infinite_alternate]"
      />

      {/* Outer 3D Rotated Perspective Stage */}
      <motion.div
        animate={
          reduceMotion
            ? {}
            : {
                y: [0, -6, 0],
              }
        }
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          rotateX: reduceMotion ? 0 : mouseRotateX,
          rotateY: reduceMotion ? 0 : mouseRotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative"
      >
        {/* Layer 1: Base Primary Overview Canvas */}
        <motion.div
          style={{ y: reduceMotion ? 0 : yScrollBackdrop }}
          className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0a0a12]/90 p-1 shadow-[0_40px_120px_-25px_oklch(0.8_0.07_272/0.45)] backdrop-blur-2xl ring-1 ring-white/10"
        >
          {/* Header Chrome */}
          <div className="flex h-9 items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 backdrop-blur-md">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-white/20" />
              <span className="size-2.5 rounded-full bg-white/20" />
              <span className="size-2.5 rounded-full bg-white/20" />
              <span className="ml-3 font-mono text-[11px] text-white/50">ascora-overview · live</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 animate-pulse rounded-full bg-[oklch(0.8_0.12_162)] shadow-[0_0_8px_oklch(0.8_0.12_162)]" />
              <span className="text-[10px] font-medium tracking-wide text-white/60">SYNCHRONIZED</span>
            </div>
          </div>

          {/* Actual Overview Screenshot */}
          <div className="relative aspect-[16/10] overflow-hidden rounded-b-[22px]">
            <Image
              src="/assets/shots/overview.webp"
              alt="Ascora Campus Overview"
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 95vw"
              className="object-cover object-top transition-transform duration-700 hover:scale-[1.01]"
            />
            {/* Specular glare overlay */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
              style={{
                opacity: isHovered ? 0.35 : 0,
                background: `radial-gradient(circle 320px at ${glareX.get()}% ${glareY.get()}%, rgba(255,255,255,0.2), transparent 70%)`,
              }}
            />
            {/* Edge vignette */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0a12]/70 via-transparent to-transparent" />
          </div>
        </motion.div>

        {/* Layer 2: Floating Foreground Student 360 Card with Depth Elevation */}
        <motion.div
          animate={
            reduceMotion
              ? {}
              : {
                  y: [0, -10, 0],
                  rotateZ: [0, 1, -1, 0],
                }
          }
          transition={{
            duration: 5.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.4,
          }}
          style={{
            y: reduceMotion ? 0 : yScrollFront,
            transform: "translateZ(75px)",
          }}
          className="absolute -bottom-8 -left-6 hidden w-[70%] max-w-[340px] overflow-hidden rounded-2xl border border-white/20 bg-[#12121e]/95 p-3.5 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl ring-1 ring-white/15 sm:block"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-lg bg-brand/20 text-brand">
                <Sparkles className="size-3.5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-white">Arjun Gupta</p>
                <p className="text-[10px] text-white/50">CU24AIML0039 · Year 3</p>
              </div>
            </div>
            <span className="rounded-md bg-[oklch(0.3_0.08_22/0.7)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.88_0.08_22)]">
              Silent Decliner
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span className="text-white/60">Success Score</span>
            <span className="font-display font-semibold text-brand">62 / 100</span>
          </div>

          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand to-[oklch(0.8_0.12_162)]"
              initial={{ width: 0 }}
              animate={{ width: "62%" }}
              transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          <p className="mt-2.5 text-[10.5px] leading-snug text-white/65">
            SHAP Driver: LMS logins down 64% over 14 days. Recourse: +15% attendance recovers safety.
          </p>
        </motion.div>

        {/* Layer 3: Floating Telemetry Status Pill (Top Right) */}
        <motion.div
          animate={
            reduceMotion
              ? {}
              : {
                  y: [0, -5, 0],
                }
          }
          transition={{
            duration: 4.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.8,
          }}
          style={{
            transform: "translateZ(95px)",
          }}
          className="absolute -right-4 -top-5 flex items-center gap-2 rounded-full border border-white/20 bg-[#0e0e18]/90 px-3.5 py-1.5 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.8)] backdrop-blur-xl"
        >
          <Activity className="size-3.5 text-[oklch(0.8_0.12_162)]" />
          <span className="text-[11px] font-medium text-white/90">7 Feeds Normalized</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
