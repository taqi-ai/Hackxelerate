"use client";

import { useEffect, useRef, useState } from "react";

/** Runs before first paint (inline): the intro plays once per browser session and never with reduced motion. */
const DECIDE = `try{var d=document.documentElement;if(sessionStorage.getItem("ascora-intro")||matchMedia("(prefers-reduced-motion: reduce)").matches){d.classList.add("no-intro")}else{d.classList.add("intro");sessionStorage.setItem("ascora-intro","1")}}catch(e){document.documentElement.classList.add("no-intro")}`;

/** Full-screen logo intro on the landing page. The animation is CSS (.intro-overlay in globals.css), so it lifts on
 *  time even if JavaScript is slow; React only adds the Skip control and removes the layer once it is done. */
export function Intro() {
  const [gone, setGone] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => setGone(true), 3400);
    // Sound: the clip is trimmed so its swell peaks as the logo lands. Start both from zero together.
    // Browsers only allow sound before any click if the visitor has interacted with the site before;
    // when they refuse, the intro simply plays silently.
    if (document.documentElement.classList.contains("intro") && audio.current && video.current) {
      video.current.currentTime = 0;
      audio.current.currentTime = 0;
      audio.current.volume = 0.8;
      audio.current.play().catch(() => {});
      video.current.play().catch(() => {});
    }
    return () => {
      window.clearTimeout(t);
      audio.current?.pause();
    };
  }, []);
  const skip = () => {
    document.documentElement.classList.remove("intro");
    document.documentElement.classList.add("no-intro");
    audio.current?.pause();
    setGone(true);
  };
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DECIDE }} />
      {!gone && (
        <div aria-hidden className="intro-overlay fixed inset-0 z-[100] grid place-items-center bg-black">
          <div className="intro-logo w-[min(560px,78vw)]">
            <audio ref={audio} src="/assets/intro-sound.wav" preload="auto" />
            <video
              ref={video}
              className="pointer-events-none h-auto w-full select-none"
              autoPlay
              muted
              playsInline
              preload="auto"
              poster="/assets/logo-teaser-poster.webp"
            >
              <source src="/assets/logo-teaser.webm" type="video/webm" />
              <source src="/assets/logo-teaser.mp4" type="video/mp4" />
            </video>
          </div>
          <button
            type="button"
            tabIndex={-1}
            onClick={skip}
            className="absolute bottom-8 right-8 rounded-full px-4 py-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            Skip
          </button>
        </div>
      )}
    </>
  );
}
