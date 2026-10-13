"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { play, setSoundEnabled, soundEnabled } from "@/lib/sound";

/** Plays a soft tap for real controls anywhere in the app. Opt out per element with data-silent. */
export function SoundLayer() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        'button, a[href], [role="menuitem"], [role="tab"], [role="option"], [role="checkbox"], [role="switch"]',
      );
      if (!el || el.closest("[data-silent]") || el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return;
      play(el.getAttribute("role") === "tab" ? "soft" : "tap");
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}

export function SoundToggle({ className }: { className?: string }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(soundEnabled());
    const h = (e: Event) => setOn((e as CustomEvent<boolean>).detail);
    window.addEventListener("ascora-sound", h);
    return () => window.removeEventListener("ascora-sound", h);
  }, []);
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      data-silent
      aria-label={on ? "Mute interface sounds" : "Turn interface sounds on"}
      aria-pressed={on}
      onClick={() => {
        const next = !on;
        setSoundEnabled(next);
        setOn(next);
        if (next) play("toggle");
      }}
    >
      {on ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
    </Button>
  );
}
