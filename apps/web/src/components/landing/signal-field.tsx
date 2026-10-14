"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { CalendarCheck2, RotateCcw, TriangleAlert } from "lucide-react";
import { play } from "@/lib/sound";

/**
 * The hero's signature moment: seven campus systems stream into one student.
 * All values are the actual record of student CU24AIML0039 in the sample cohort.
 */
const SOURCES = ["ERP marks", "Attendance register", "LMS activity", "Clubs & events", "Placement cell", "Skills assessment", "Feedback forms"];
const TREND = [70, 70, 85, 85, 37, 48, 85, 70, 60, 10, 32, 5]; // weekly engagement index, weeks 1-12
const W = 560;
const H = 420;
const JOIN = { x: 330, y: 210 };
const EASE = [0.16, 1, 0.3, 1] as const;

function pathFor(i: number) {
  const y = 34 + i * 58;
  return `M 128 ${y} C 230 ${y}, 250 ${JOIN.y}, ${JOIN.x} ${JOIN.y}`;
}

export function SignalField() {
  const reduce = useReducedMotion();
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState(0);
  // decorative pulses depend on the user's motion preference, which only the browser knows: render after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (reduce) {
      setPhase(4);
      return;
    }
    setPhase(0);
    const t = [
      setTimeout(() => setPhase(1), 1600), // streams arrive: the student appears
      setTimeout(() => setPhase(2), 2700), // the quiet slide shows up in the trend
      setTimeout(() => setPhase(3), 3900), // flagged, with reasons
      setTimeout(() => setPhase(4), 5200), // and an action is planned
    ];
    return () => t.forEach(clearTimeout);
  }, [run, reduce]);

  const spark = TREND.map((v, i) => `${i === 0 ? "M" : "L"} ${i * (196 / 11)} ${44 - (v / 100) * 40}`).join(" ");

  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Seven campus data sources flowing into one student record">
        <defs>
          <linearGradient id="stream" x1="0" x2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="joinGlow">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {SOURCES.map((s, i) => {
          const y = 34 + i * 58;
          const d = pathFor(i);
          return (
            <g key={`${s}-${run}`}>
              <motion.text
                x={0}
                y={y + 4}
                className="fill-muted-foreground text-[13px]"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.08 * i, ease: EASE }}
              >
                {s}
              </motion.text>
              <motion.path
                d={d}
                fill="none"
                stroke="url(#stream)"
                strokeWidth={1.4}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.1, delay: 0.25 + 0.09 * i, ease: EASE }}
              />
              {mounted && !reduce && (
                <motion.circle
                  r={2.6}
                  fill="var(--brand)"
                  style={{ offsetPath: `path('${d}')`, offsetRotate: "0deg" } as React.CSSProperties}
                  initial={{ offsetDistance: "0%", opacity: 0 }}
                  animate={{ offsetDistance: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.3, delay: 0.45 + 0.09 * i, ease: "easeInOut", repeat: Infinity, repeatDelay: 2.4 + i * 0.3 }}
                />
              )}
            </g>
          );
        })}
        <motion.circle
          cx={JOIN.x}
          cy={JOIN.y}
          r={70}
          fill="url(#joinGlow)"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, scale: phase >= 1 ? 1 : 0.4 }}
          transition={{ duration: 0.9, ease: EASE }}
          style={{ transformOrigin: `${JOIN.x}px ${JOIN.y}px` }}
        />
      </svg>

      {/* the student, assembled from those streams */}
      <motion.div
        key={`card-${run}`}
        className="absolute right-0 top-1/2 w-[58%] min-w-[250px] -translate-y-1/2 rounded-2xl border border-white/10 bg-[oklch(0.17_0.01_275/0.82)] p-4 shadow-[0_30px_80px_-20px_oklch(0.8_0.07_272/0.35)] backdrop-blur-xl"
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 16, scale: phase >= 1 ? 1 : 0.96 }}
        transition={{ duration: 0.7, ease: EASE }}
        onAnimationComplete={() => phase === 1 && play("soft")}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-white">Arjun Gupta</p>
            <p className="text-[11px] text-white/55">CSE-AIML, Year 3</p>
          </div>
          <div className="text-right">
            <p className="font-display text-xl font-semibold leading-none text-white">9.15</p>
            <p className="text-[10px] text-white/60">CGPA</p>
          </div>
        </div>
        <div className="mt-3">
          <svg viewBox="0 0 196 48" className="h-12 w-full overflow-visible" aria-label="Weekly LMS engagement falling after week 8">
            <motion.path
              d={spark}
              fill="none"
              stroke={phase >= 2 ? "oklch(0.72 0.15 22)" : "var(--brand)"}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: phase >= 2 ? 1 : phase >= 1 ? 0.6 : 0 }}
              transition={{ duration: 1, ease: EASE }}
            />
          </svg>
          <p className="mt-1 text-[10px] text-white/60">LMS engagement, weeks 1 to 12</p>
        </div>
        <motion.div
          className="mt-3 flex items-start gap-2 rounded-lg bg-[oklch(0.28_0.06_22/0.55)] px-2.5 py-2 text-[11px] leading-snug text-[oklch(0.86_0.08_22)]"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: phase >= 3 ? 1 : 0, height: phase >= 3 ? "auto" : 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          onAnimationComplete={() => phase === 3 && play("tap")}
        >
          <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>Silent decliner: LMS activity down 64% since early semester, while the score still looks average.</span>
        </motion.div>
        <motion.div
          className="mt-2 flex items-center gap-2 rounded-lg bg-[oklch(0.27_0.045_162/0.6)] px-2.5 py-2 text-[11px] text-[oklch(0.88_0.08_162)]"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: phase >= 4 ? 1 : 0, y: phase >= 4 ? 0 : 6 }}
          transition={{ duration: 0.5, ease: EASE }}
          onAnimationComplete={() => phase === 4 && !reduce && play("success")}
        >
          <CalendarCheck2 className="size-3.5 shrink-0" aria-hidden />
          <span>Mentor check-in planned for this week</span>
        </motion.div>
      </motion.div>

      {mounted && !reduce && phase >= 4 && (
        <button
          type="button"
          onClick={() => setRun((r) => r + 1)}
          className="press absolute -bottom-2 right-0 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RotateCcw className="size-3" aria-hidden /> Replay
        </button>
      )}
    </div>
  );
}
