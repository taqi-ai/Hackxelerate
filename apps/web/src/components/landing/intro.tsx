"use client";

import { useRef, useState } from "react";
import { Volume2 } from "lucide-react";

/** Runs before first paint (inline): the intro shows once per browser session and never with reduced motion. */
const DECIDE = `try{var d=document.documentElement;if(sessionStorage.getItem("ascora-intro")||matchMedia("(prefers-reduced-motion: reduce)").matches){d.classList.add("no-intro")}else{d.classList.add("intro");sessionStorage.setItem("ascora-intro","1")}}catch(e){document.documentElement.classList.add("no-intro")}`;

/** First-visit intro. Browsers only allow sound after the visitor taps something, so the black screen shows the
 *  Ascora mark and an Enter button; the tap starts the logo animation and its sound together from zero, and the
 *  curtain lifts (CSS, 2.3 s) exactly as the 3.2 s clip ends. The hero's entrance waits until then. */
export function Intro() {
  const [gone, setGone] = useState(false);
  const [playing, setPlaying] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<HTMLAudioElement>(null);

  const finish = () => {
    document.documentElement.classList.add("intro-done");
    window.setTimeout(() => setGone(true), 950);
  };

  const enter = (withSound: boolean) => {
    if (playing) return;
    setPlaying(true);
    overlay.current?.classList.add("play");
    const v = video.current;
    const a = audio.current;
    if (v) {
      v.currentTime = 0;
      v.play().catch(() => {});
    }
    if (a && withSound) {
      a.currentTime = 0;
      a.volume = 0.85;
      a.play().catch(() => {});
    }
    // the curtain starts lifting at 2.3 s: let the hero begin its entrance with it
    window.setTimeout(finish, 2300);
  };

  const skip = () => {
    audio.current?.pause();
    document.documentElement.classList.remove("intro");
    document.documentElement.classList.add("no-intro", "intro-done");
    setGone(true);
  };

  if (gone) return <script dangerouslySetInnerHTML={{ __html: DECIDE }} />;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DECIDE }} />
      {/* without JavaScript nothing could start the intro, so never show it */}
      <noscript>
        <style>{`.intro-overlay{display:none}`}</style>
      </noscript>
      <div ref={overlay} className="intro-overlay fixed inset-0 z-[100] grid place-items-center bg-black">
        <div className="flex flex-col items-center">
          <div className="intro-logo w-[min(560px,78vw)]">
            <audio ref={audio} src="/assets/intro-sound-v2.wav" preload="auto" />
            <video ref={video} className="pointer-events-none h-auto w-full select-none" muted playsInline preload="auto" poster="/assets/logo-teaser-poster.webp">
              <source src="/assets/logo-teaser.webm" type="video/webm" />
              <source src="/assets/logo-teaser.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="intro-gate mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => enter(true)}
              autoFocus
              className="press inline-flex h-12 items-center gap-2 rounded-full bg-[#f4f4f7] px-7 text-[15px] font-medium text-[#0a0a10] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.75_0.12_272)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <Volume2 className="size-4" aria-hidden />
              Enter
            </button>
            <button type="button" onClick={() => enter(false)} className="rounded-full px-3 py-2 text-sm text-white/60 hover:text-white">
              Enter without sound
            </button>
          </div>
        </div>
        <button type="button" onClick={skip} className="absolute bottom-8 right-8 rounded-full px-4 py-2 text-sm text-white/60 transition-colors hover:text-white">
          Skip
        </button>
      </div>
    </>
  );
}
