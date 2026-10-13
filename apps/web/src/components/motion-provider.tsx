"use client";

import { MotionConfig } from "framer-motion";

/** Honour the OS "reduce motion" setting everywhere: transforms are skipped, fades stay. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
