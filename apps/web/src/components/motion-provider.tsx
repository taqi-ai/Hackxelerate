"use client";

import { MotionConfig } from "framer-motion";
import { useEffect, useState } from "react";
import { getPrefs, type Prefs } from "@/lib/prefs";

/**
 * Honour the OS "reduce motion" setting everywhere (transforms are skipped, fades stay),
 * or always reduce motion when the user chose that in Settings.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"user" | "always">("user");
  useEffect(() => {
    const apply = (p: Prefs) => {
      setMode(p.motion === "reduce" ? "always" : "user");
      document.documentElement.toggleAttribute("data-reduce-motion", p.motion === "reduce");
    };
    apply(getPrefs());
    const h = (e: Event) => apply((e as CustomEvent<Prefs>).detail);
    window.addEventListener("ascora-prefs", h);
    return () => window.removeEventListener("ascora-prefs", h);
  }, []);
  return <MotionConfig reducedMotion={mode}>{children}</MotionConfig>;
}
