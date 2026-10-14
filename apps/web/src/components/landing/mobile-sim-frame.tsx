"use client";

import { useState } from "react";
import { ExternalLink, Play, RotateCcw } from "lucide-react";

/** The real Expo app, exported for the web (public/mobile-sim), shown inside a phone frame.
 *  It loads only after a click so the landing pages never pay for the 2 MB bundle. */
export function MobileSimFrame() {
  const [on, setOn] = useState(false);
  const [nonce, setNonce] = useState(0);
  return (
    <div className="mx-auto w-full max-w-[400px]">
      <div className="relative rounded-[3rem] border border-white/15 bg-black p-3 shadow-[0_50px_120px_-30px_oklch(0.62_0.16_272/0.6)]">
        <div aria-hidden className="absolute left-1/2 top-5 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
        <div className="relative aspect-[390/844] w-full overflow-hidden rounded-[2.3rem] bg-[#07070b]">
          {on ? (
            <iframe key={nonce} src="/mobile-sim" title="Ascora mobile app, running in your browser" className="absolute inset-0 size-full border-0" loading="lazy" allow="clipboard-write" />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-[url(/assets/shots/mobile-welcome.webp)] bg-cover bg-top">
              <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
              <button
                type="button"
                onClick={() => setOn(true)}
                className="press relative inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-[#07070b] shadow-[0_0_40px_-6px_oklch(0.8_0.07_272/0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Play className="size-4 fill-current" aria-hidden />
                Launch the app
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-center gap-3 text-sm">
        <button
          type="button"
          disabled={!on}
          onClick={() => setNonce((n) => n + 1)}
          className="press inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-white/80 hover:border-white/30 hover:bg-white/5 disabled:opacity-40"
        >
          <RotateCcw className="size-3.5" aria-hidden /> Restart
        </button>
        <a href="/mobile-sim" target="_blank" rel="noopener noreferrer" className="press inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-white/80 hover:border-white/30 hover:bg-white/5">
          <ExternalLink className="size-3.5" aria-hidden /> Open full screen
        </a>
      </div>
    </div>
  );
}
