"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";
import { SoundToggle } from "@/components/sound";
import { cn } from "@/lib/utils";

export function LandingNav({ signedIn }: { signedIn: boolean }) {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setSolid(v > 24));
  return (
    <motion.header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300",
        solid ? "border-b border-white/10 bg-[#07070b]/70 backdrop-blur-xl" : "border-b border-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6" aria-label="Main">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Ascora home">
          <Image src="/assets/mark.png" alt="" width={24} height={20} className="h-5 w-6 object-contain" priority />
          <span className="font-display text-lg font-semibold tracking-tight text-white">Ascora</span>
        </Link>
        <div className="hidden items-center gap-6 text-sm text-white/60 md:flex">
          <a href="#how" className="hover:text-white">How it works</a>
          <a href="#product" className="hover:text-white">Product</a>
          <a href="#trust" className="hover:text-white">Trust</a>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SoundToggle className="text-white/70 hover:bg-white/10 hover:text-white" />
          {signedIn ? (
            <Link href="/overview" className="press rounded-full bg-white px-4 py-2 text-sm font-medium text-[#07070b] hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm text-white/75 hover:text-white sm:inline-block">
                Sign in
              </Link>
              <Link href="/login" className="press rounded-full bg-white px-4 py-2 text-sm font-medium text-[#07070b] hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Try the demo
              </Link>
            </>
          )}
        </div>
      </nav>
    </motion.header>
  );
}
