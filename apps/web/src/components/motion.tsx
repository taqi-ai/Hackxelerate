"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform, type Variants } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Reveal once when scrolled into view. */
export function Reveal({ children, delay = 0, y = 18, className }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.55, ease: EASE } },
};

/** Children appear in sequence on mount (dashboards) or on scroll (landing). */
export function Stagger({ children, className, onView = false }: { children: React.ReactNode; className?: string; onView?: boolean }) {
  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      {...(onView ? { whileInView: "show", viewport: { once: true, amount: 0.15 } } : { animate: "show" })}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}

/** Number that counts up when it first becomes visible. */
export function CountUp({ value, decimals = 0, duration = 1.1, className, suffix = "" }: { value: number; decimals?: number; duration?: number; className?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`);
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration, ease: EASE });
    return () => c.stop();
  }, [inView, value, duration, reduce, mv]);
  return (
    <motion.span ref={ref} className={cn("tabular", className)}>
      {text}
    </motion.span>
  );
}

/** Success Score as an animated ring. Colour follows the same bands as the rest of the app. */
export function ScoreRing({ score, size = 128, stroke = 10, label = "Success Score" }: { score: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 65 ? "var(--risk-low)" : score >= 40 ? "var(--brand)" : "var(--risk-high)";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${label} ${Math.round(score)} out of 100`}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1.4, ease: EASE, delay: 0.15 }}
          style={{ filter: `drop-shadow(0 0 10px color-mix(in oklch, ${color} 45%, transparent))` }}
        />
      </svg>
      <div className="absolute text-center">
        <CountUp value={score} className="block text-4xl font-semibold tracking-tight" />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
