"use client";

import Image from "next/image";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { play } from "@/lib/sound";

const STEPS = [
  {
    key: "flag",
    title: "Flag",
    body: "Seven systems become one view of each student. Ascora ranks who needs attention first, and finds the quiet decliners a marks sheet hides.",
    img: "/assets/shots/overview.webp",
    alt: "Ascora overview with cohort health, risk counts and insights",
  },
  {
    key: "explain",
    title: "Explain",
    body: "Every flag shows its reasons in plain language, compared with the cohort, and marks which ones a mentor can actually change.",
    img: "/assets/shots/student.webp",
    alt: "A student profile showing the Success Score ring and the drivers behind the flag",
  },
  {
    key: "act",
    title: "Act",
    body: "Mentors enter the hours they have. Ascora plans who to meet and suggests the right support for each student's main driver.",
    img: "/assets/shots/thisweek.webp",
    alt: "Weekly planner listing which students to meet and the suggested intervention",
  },
  {
    key: "measure",
    title: "Measure",
    body: "Interventions are logged with a baseline, models are audited for accuracy and fairness, and the score formula is open for anyone to read.",
    img: "/assets/shots/model.webp",
    alt: "Score and model transparency page with formula, weights and stability",
  },
] as const;

function Step({ i, active, onActive }: { i: number; active: boolean; onActive: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (inView) onActive(i);
  }, [inView, i, onActive]);
  const s = STEPS[i];
  return (
    <div ref={ref} className="flex min-h-[60vh] items-center lg:min-h-[78vh]">
      <div className={cn("max-w-md transition-opacity duration-500", active ? "opacity-100" : "opacity-70")}>
        <p className="mb-3 font-mono text-xs text-brand">
          {i + 1} of {STEPS.length}
        </p>
        <h3 className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">{s.title}</h3>
        <p className="mt-4 text-lg leading-relaxed text-white/85">{s.body}</p>
        {/* phones: the screenshot sits under its step instead of in a pinned frame */}
        <div className="mt-6 overflow-hidden rounded-xl border border-white/10 lg:hidden">
          <Image src={s.img} alt={s.alt} width={2400} height={1500} className="h-auto w-full" loading="lazy" />
        </div>
      </div>
    </div>
  );
}

export function Story() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const set = (i: number) =>
    setActive((prev) => {
      if (prev !== i) play("soft");
      return i;
    });
  return (
    <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        {STEPS.map((_, i) => (
          <Step key={STEPS[i].key} i={i} active={active === i} onActive={set} />
        ))}
      </div>
      <div className="relative hidden lg:block">
        <div className="sticky top-[12vh] h-[76vh]">
          <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d14] shadow-[0_40px_120px_-30px_oklch(0.8_0.07_272/0.35)]">
            <div className="flex h-9 items-center gap-1.5 border-b border-white/10 px-4" aria-hidden>
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="ml-3 truncate font-mono text-[11px] text-white/60">ascora-five.vercel.app</span>
            </div>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={STEPS[active].key}
                className="absolute inset-x-0 bottom-0 top-9"
                initial={{ opacity: 0, scale: 1.02, filter: "blur(6px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.99, filter: "blur(6px)" }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <Image src={STEPS[active].img} alt={STEPS[active].alt} fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover object-left-top" />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
