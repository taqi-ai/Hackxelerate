"use client";

import Image from "next/image";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { EyeOff, Fingerprint, LockKeyhole, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

/** A tile whose border and backdrop light up under the cursor. Pointer position is written straight to CSS, no re-renders. */
function Tile({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        ref.current!.style.setProperty("--mx", `${e.clientX - r.left}px`);
        ref.current!.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0e0e15] p-6 sm:p-8",
        "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100",
        "before:bg-[radial-gradient(420px_circle_at_var(--mx)_var(--my),oklch(0.8_0.07_272/0.13),transparent_60%)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

const SOURCE_CHIPS = ["ERP", "Register", "LMS", "Clubs", "Placement", "Skills", "Feedback"];

function MergeVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  return (
    <div ref={ref} className="relative mt-8 h-40" aria-hidden>
      {SOURCE_CHIPS.map((s, i) => {
        const angle = (i / SOURCE_CHIPS.length) * Math.PI * 2;
        const x = Math.cos(angle) * 150;
        const y = Math.sin(angle) * 58;
        return (
          <motion.span
            key={s}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70"
            initial={{ x, y, opacity: 0 }}
            animate={inView ? { x: [x, x, x * 0.18], y: [y, y, y * 0.18], opacity: [0, 1, 0.0] } : {}}
            transition={{ duration: 2.2, times: [0, 0.45, 1], delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            {s}
          </motion.span>
        );
      })}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-[oklch(0.2_0.02_272)] px-4 py-3 text-center shadow-[0_0_60px_-10px_oklch(0.8_0.07_272/0.5)]"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1 } : {}}
        transition={{ delay: 1.55, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="font-display text-sm font-semibold text-white">1 student, 1 view</p>
        <p className="text-[11px] text-white/55">every value traced to file and row</p>
      </motion.div>
    </div>
  );
}

const ASK = "3rd year students with no mock interviews and high placement risk";

function AskPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setN(ASK.length);
      return;
    }
    const id = setInterval(() => setN((v) => (v >= ASK.length ? (clearInterval(id), v) : v + 1)), 28);
    return () => clearInterval(id);
  }, [inView, reduce]);
  const done = n >= ASK.length;
  return (
    <div ref={ref} className="mt-6 space-y-3 font-mono text-[12px]">
      <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white/85">
        {ASK.slice(0, n)}
        {!done && <span className="ml-px inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-brand" />}
      </div>
      <motion.pre
        className="overflow-hidden rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 leading-relaxed text-white/60"
        initial={{ opacity: 0, y: 6 }}
        animate={done ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <span className="text-brand">year</span>: [3]{"\n"}
        <span className="text-brand">placement_risk</span>: [&quot;High&quot;]{"\n"}
        <span className="text-brand">mocks_max</span>: 0
      </motion.pre>
    </div>
  );
}

export function Bento() {
  return (
    <div className="grid gap-4 lg:grid-cols-6">
      <Tile className="lg:col-span-4">
        <h3 className="font-display text-2xl font-semibold tracking-tight text-white">Messy data, one student</h3>
        <p className="mt-2 max-w-md text-white/60">
          Four roll-number formats, emails with typos, names written as initials. Ascora matches them with 100% precision on auto-accepted links, and sends the
          ambiguous ones to a person.
        </p>
        <MergeVisual />
      </Tile>
      <Tile className="lg:col-span-2">
        <h3 className="font-display text-2xl font-semibold tracking-tight text-white">Two risks, never blended</h3>
        <p className="mt-2 text-white/60">Academic risk and placement risk are separate models with separate reasons.</p>
        <div className="mt-8 space-y-3">
          {[
            ["Academic risk", "AUC 0.88", "oklch(0.72 0.15 22)", 0.88],
            ["Placement risk", "AUC 0.80", "oklch(0.8 0.12 80)", 0.8],
          ].map(([l, v, c, w]) => (
            <div key={l as string}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="text-white/75">{l}</span>
                <span className="tabular text-white/60">{v}</span>
              </div>
              <motion.div
                className="h-1.5 rounded-full"
                style={{ background: c as string, transformOrigin: "left" }}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: w as number }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          ))}
          <p className="pt-1 text-xs text-white/60">Held-out test set from the sample cohort. A plain baseline scores close; we say so.</p>
        </div>
      </Tile>
      <Tile className="lg:col-span-2">
        <h3 className="font-display text-2xl font-semibold tracking-tight text-white">Ask in plain English</h3>
        <p className="mt-2 text-white/60">Azure OpenAI turns a question into a validated filter. Never raw SQL.</p>
        <AskPreview />
      </Tile>
      <Tile className="p-0 sm:p-0 lg:col-span-4">
        <div className="p-6 pb-0 sm:p-8 sm:pb-0">
          <h3 className="font-display text-2xl font-semibold tracking-tight text-white">Groups that need different help</h3>
          <p className="mt-2 max-w-lg text-white/60">
            Six personas found in the data, from high academics with low placement readiness to disengaged students, each with a recommended action.
          </p>
        </div>
        <div className="relative mt-6 h-56 overflow-hidden">
          <Image
            src="/assets/shots/segments.webp"
            alt="Segments page showing student personas with sizes and recommended actions"
            width={2400}
            height={1500}
            loading="lazy"
            className="absolute left-6 top-0 w-[115%] max-w-none rounded-tl-xl border-l border-t border-white/10 transition-transform duration-700 group-hover:-translate-y-6"
          />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0e0e15] to-transparent" />
        </div>
      </Tile>
      <Tile className="lg:col-span-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:items-center">
          <div>
            <h3 className="font-display text-2xl font-semibold tracking-tight text-white">Private by design</h3>
            <p className="mt-2 text-white/60">Built for India&apos;s DPDP Act. Support, never surveillance.</p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              [Fingerprint, "Roles enforced by the database", "Mentors only ever see their own students."],
              [EyeOff, "No labels shown to students", "Risk is for mentors. Students are offered help."],
              [ScrollText, "Every profile view is audited", "Who looked at which student, and when."],
              [LockKeyhole, "Sensitive traits never predict", "Used only to audit the models for fairness."],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Fingerprint;
              return (
                <li key={t as string} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5">
                    <I className="size-4 text-brand" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-white">{t as string}</span>
                    <span className="block text-sm text-white/55">{d as string}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </Tile>
    </div>
  );
}
