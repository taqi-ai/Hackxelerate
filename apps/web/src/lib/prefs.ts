"use client";

/**
 * Per-device preferences, kept in localStorage. Every read falls back to a sensible default when storage
 * is blocked, so nothing depends on them being present.
 */
export type Prefs = {
  motion: "system" | "reduce";
  hours: number; // default weekly mentoring hours in the planner
  home: "/overview" | "/this-week" | "/students";
};

const DEFAULTS: Prefs = { motion: "system", hours: 3, home: "/overview" };
const KEY = "ascora-prefs";

export function getPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  const next = { ...getPrefs(), [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: the change lasts for this page only */
  }
  window.dispatchEvent(new CustomEvent("ascora-prefs", { detail: next }));
}

export function resetPrefs() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing stored */
  }
  window.dispatchEvent(new CustomEvent("ascora-prefs", { detail: DEFAULTS }));
}
