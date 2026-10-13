"use client";

import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Words rise and sharpen one after another. The gradient part is passed in so it can be styled on its own. */
export function Headline({ lead, accent }: { lead: string; accent: string }) {
  const word = (w: string, i: number, cls?: string) => (
    <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
      <motion.span
        className={`inline-block ${cls ?? ""}`}
        initial={{ y: "105%", opacity: 0, filter: "blur(10px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.8, delay: 0.12 + i * 0.07, ease: EASE }}
      >
        {w}&nbsp;
      </motion.span>
    </span>
  );
  const a = lead.split(" ");
  const b = accent.split(" ");
  return (
    <>
      {a.map((w, i) => word(w, i))}
      {b.map((w, i) => word(w, a.length + i, "bg-gradient-to-r from-[oklch(0.88_0.08_272)] via-[oklch(0.82_0.11_300)] to-[oklch(0.84_0.09_200)] bg-clip-text text-transparent"))}
    </>
  );
}
