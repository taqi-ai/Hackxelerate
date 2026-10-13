"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SoundToggle } from "@/components/sound";
import { cn } from "@/lib/utils";
import { SITE_LINKS } from "./site-links";

export function SiteNav({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setSolid(v > 24));
  const cta = signedIn ? { href: "/overview", label: "Open dashboard" } : { href: "/login", label: "Get started" };
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,border-color] duration-300",
        solid || open ? "border-b border-white/10 bg-[#07070b]/75 backdrop-blur-xl" : "border-b border-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6" aria-label="Main">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Ascora home">
          <Image src="/assets/mark.png" alt="" width={24} height={20} className="h-5 w-6 object-contain" priority />
          <span className="font-display text-lg font-semibold tracking-tight text-white">Ascora</span>
        </Link>
        <div className="relative hidden items-center gap-1 text-sm md:flex">
          {SITE_LINKS.map((l) => {
            const active = path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative rounded-full px-3.5 py-1.5 transition-colors", active ? "text-white" : "text-white/60 hover:text-white")}
              >
                {active && <motion.span layoutId="site-nav" className="absolute inset-0 rounded-full bg-white/[0.08]" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                <span className="relative">{l.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SoundToggle className="text-white/70 hover:bg-white/10 hover:text-white" />
          {!signedIn && (
            <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm text-white/75 hover:text-white sm:inline-block">
              Sign in
            </Link>
          )}
          <Link
            href={cta.href}
            className="press hidden rounded-full bg-white px-4 py-2 text-sm font-medium text-[#07070b] hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-block"
          >
            {cta.label}
          </Link>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full text-white/80 hover:bg-white/10 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-white/10 md:hidden"
          >
            <div className="grid gap-1 px-4 py-4">
              {[...SITE_LINKS, ...(signedIn ? [] : [{ href: "/login", label: "Sign in" }]), cta].map((l) => (
                <Link key={l.href + l.label} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base text-white/85 hover:bg-white/5">
                  {l.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
