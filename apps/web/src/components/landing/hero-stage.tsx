"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { CalendarCheck2, Layers, MessageSquareText, Sparkles, TriangleAlert } from "lucide-react";
import { SignalField } from "./signal-field";

const EASE = [0.16, 1, 0.3, 1] as const;
const SCENE_MS = 9000;

const SCENES = [
  { key: "join", label: "Join", icon: Layers },
  { key: "watch", label: "Watch", icon: TriangleAlert },
  { key: "ask", label: "Ask", icon: MessageSquareText },
  { key: "act", label: "Act", icon: CalendarCheck2 },
] as const;

/** weekly average logins for one branch: a steady semester that sags after week 8 */
const WAVE = [
  [5, 6, 6, 5, 6, 6, 5, 4, 3, 2, 2, 1],
  [6, 7, 6, 6, 5, 6, 6, 5, 5, 4, 4, 3],
  [4, 5, 6, 6, 6, 5, 5, 4, 3, 3, 2, 2],
  [6, 6, 7, 7, 6, 6, 7, 6, 6, 5, 5, 5],
];
const ROWS = ["CSE", "CSE-AIML", "ECE", "ME"];

function tileStyle(v: number) {
  if (v >= 6) return { background: "var(--brand)", boxShadow: "0 0 14px -3px var(--brand)" };
  const a = v >= 5 ? 40 : v >= 3 ? 24 : 12;
  return {
    backgroundColor: `color-mix(in oklch, var(--brand) ${a}%, transparent)`,
    backgroundImage: `repeating-linear-gradient(115deg, color-mix(in oklch, var(--brand) ${a + 20}%, transparent) 0 1.5px, transparent 1.5px 5px)`,
  };
}

function Watch() {
  return (
    <div className="w-full rounded-3xl border border-white/10 bg-[oklch(0.15_0.01_275/0.85)] p-5 shadow-[0_40px_100px_-30px_oklch(0.8_0.07_272/0.45)] backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <p className="font-display text-base font-semibold text-white">Weekly engagement</p>
        <span className="text-[11px] text-white/45">Logins per student, weeks 1 to 12</span>
      </div>
      <div className="mt-4 grid grid-cols-[64px_repeat(12,1fr)] gap-1.5">
        {WAVE.map((row, r) => (
          <div key={ROWS[r]} className="contents">
            <span className="self-center text-[11px] text-white/55">{ROWS[r]}</span>
            {row.map((v, i) => (
              <motion.span
                key={i}
                className="aspect-[1.1] rounded-[6px]"
                style={tileStyle(v)}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, delay: 0.04 * (i + r * 2), ease: EASE }}
              />
            ))}
          </div>
        ))}
        <span />
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className={i >= 8 ? "text-center text-[10px] text-[oklch(0.8_0.12_22)]" : "text-center text-[10px] text-white/35"}>
            {i + 1}
          </span>
        ))}
      </div>
      <motion.div
        className="mt-5 flex items-start gap-2.5 rounded-xl bg-[oklch(0.28_0.06_22/0.55)] px-3 py-2.5 text-xs leading-snug text-[oklch(0.88_0.08_22)]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.6, ease: EASE }}
      >
        <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden />
        <span>Engagement slides after the mid-semester exams, weeks before marks show it. Ascora flags it while there is time to help.</span>
      </motion.div>
    </div>
  );
}

const QUESTION = "ECE students with attendance under 70%";

function Ask() {
  const [typed, setTyped] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return setTyped(QUESTION.length);
    const id = setInterval(() => setTyped((t) => (t >= QUESTION.length ? t : t + 1)), 42);
    return () => clearInterval(id);
  }, [reduce]);
  const done = typed >= QUESTION.length;
  const rows = [
    { n: "Abdul Varughese", a: "63%", s: 14 },
    { n: "Dominic Chana", a: "67%", s: 9 },
    { n: "Arya Mannan", a: "69%", s: 28 },
  ];
  return (
    <div className="w-full rounded-3xl border border-white/10 bg-[oklch(0.15_0.01_275/0.85)] p-5 shadow-[0_40px_100px_-30px_oklch(0.7_0.13_320/0.4)] backdrop-blur-xl">
      <div className="flex items-center gap-2 text-[11px] text-white/45">
        <Sparkles className="size-3.5 text-[oklch(0.82_0.1_320)]" aria-hidden /> Ask Ascora
      </div>
      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white">
        {QUESTION.slice(0, typed)}
        {!done && <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-white" aria-hidden />}
      </div>
      <motion.p className="mt-4 text-xs text-white/55" initial={{ opacity: 0 }} animate={{ opacity: done ? 1 : 0 }} transition={{ duration: 0.4 }}>
        45 students match, 17 of them at high academic risk. Lowest scores first:
      </motion.p>
      <ul className="mt-3 space-y-2">
        {rows.map((r, i) => (
          <motion.li
            key={r.n}
            className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: done ? 1 : 0, x: done ? 0 : 18 }}
            transition={{ delay: done ? 0.15 * i : 0, duration: 0.5, ease: EASE }}
          >
            <span className="w-8 text-center font-display text-lg font-semibold text-[oklch(0.78_0.15_22)]">{r.s}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-white">{r.n}</span>
            <span className="text-xs text-white/50">Attendance {r.a}</span>
            <span className="rounded-md bg-[oklch(0.3_0.08_22/0.6)] px-1.5 py-0.5 text-[10px] text-[oklch(0.88_0.08_22)]">High</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function Act() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cards = [
    { t: "Abdul Varughese", s: "Mentor meeting", d: "Today", c: "oklch(0.78 0.15 22)" },
    { t: "Dominic Chana", s: "Peer tutoring", d: "Thu", c: "oklch(0.8 0.12 80)" },
    { t: "Arya Mannan", s: "Mentor meeting", d: "Sat", c: "oklch(0.8 0.1 162)" },
  ];
  return (
    <div className="w-full rounded-3xl border border-white/10 bg-[oklch(0.15_0.01_275/0.85)] p-5 shadow-[0_40px_100px_-30px_oklch(0.72_0.12_162/0.35)] backdrop-blur-xl">
      <div className="grid grid-cols-6 gap-1 text-center">
        {days.map((d, i) => (
          <motion.div key={d} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.4, ease: EASE }}>
            <p className="text-[10px] text-white/40">{d}</p>
            <span className={i === 2 ? "mx-auto mt-1 grid size-8 place-items-center rounded-full bg-[var(--brand)] text-sm font-semibold text-[#07070b] shadow-[0_0_18px_-2px_var(--brand)]" : "mx-auto mt-1 grid size-8 place-items-center rounded-full text-sm text-white/70"}>
              {14 + i}
            </span>
          </motion.div>
        ))}
      </div>
      <ul className="mt-5 space-y-2.5">
        {cards.map((c, i) => (
          <motion.li
            key={c.t}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + 0.35 * i, duration: 0.6, ease: EASE }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white">{c.t}</p>
              <span className="size-2 rounded-full" style={{ background: c.c, boxShadow: `0 0 10px ${c.c}` }} />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-white/50">
              <span>{c.s}</span>
              <span className="flex items-center gap-1">
                <CalendarCheck2 className="size-3" aria-hidden /> {c.d}
              </span>
            </div>
          </motion.li>
        ))}
      </ul>
      <motion.p className="mt-4 text-center text-xs text-white/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.9 }}>
        Every plan is logged with a baseline, so you can see if it worked.
      </motion.p>
    </div>
  );
}

/**
 * The hero visual: four scenes that take over from each other (join, watch, ask, act),
 * with progress pills to jump between them. Pauses while hovered; static first scene for reduced motion.
 */
export function HeroStage() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || reduce || paused) return;
    const t = setTimeout(() => setI((x) => (x + 1) % SCENES.length), SCENE_MS);
    return () => clearTimeout(t);
  }, [i, paused, reduce, mounted]);

  const scene = SCENES[i].key;
  return (
    <div onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
      <div className="relative mx-auto flex min-h-[420px] w-full max-w-[560px] items-center sm:min-h-[460px]">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 m-auto size-[420px] rounded-full bg-[conic-gradient(from_90deg,oklch(0.6_0.17_272/0.35),oklch(0.65_0.15_320/0.25),oklch(0.7_0.12_200/0.3),oklch(0.6_0.17_272/0.35))] blur-3xl motion-safe:animate-[spin_30s_linear_infinite]" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={scene}
            className="w-full"
            initial={{ opacity: 0, y: 24, scale: 0.97, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -18, scale: 0.98, filter: "blur(8px)" }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            {scene === "join" && <SignalField />}
            {scene === "watch" && <Watch />}
            {scene === "ask" && <Ask />}
            {scene === "act" && <Act />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div role="tablist" aria-label="Product tour" className="mx-auto mt-6 flex max-w-[560px] gap-2">
        {SCENES.map((s, n) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={n === i}
            onClick={() => setI(n)}
            className="group flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="relative block h-1 overflow-hidden rounded-full bg-white/10">
              {n < i && <span className="absolute inset-0 bg-white/50" />}
              {n === i && mounted && (
                <motion.span
                  key={`${i}-${paused}`}
                  className="absolute inset-y-0 left-0 bg-[var(--brand)]"
                  initial={{ width: reduce || paused ? "100%" : "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: reduce || paused ? 0 : SCENE_MS / 1000, ease: "linear" }}
                />
              )}
            </span>
            <span className={n === i ? "mt-2 flex items-center gap-1.5 text-xs text-white" : "mt-2 flex items-center gap-1.5 text-xs text-white/40 group-hover:text-white/70"}>
              <s.icon className="size-3" aria-hidden /> {s.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
