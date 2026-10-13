"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Command, Menu, Search } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NAV_ITEMS } from "@/components/nav-items";
import { openCommandPalette } from "@/components/command-palette";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const GROUPS = ["Insight", "Action", "Trust"] as const;

function NavLinks({ role, onNavigate, layoutKey }: { role: Role; onNavigate?: () => void; layoutKey: string }) {
  const path = usePathname();
  const items = NAV_ITEMS.filter((n) => (n.roles as readonly string[]).includes(role));
  return (
    <nav className="grid gap-5" aria-label="Main">
      {GROUPS.map((g) => {
        const list = items.filter((i) => i.group === g);
        if (!list.length) return null;
        return (
          <div key={g} className="grid gap-0.5">
            <p className="px-2.5 pb-1 text-[11px] font-medium text-muted-foreground/80">{g}</p>
            {list.map(({ href, label, icon: Icon }) => {
              const active = path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "press relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={`nav-active-${layoutKey}`}
                      className="absolute inset-0 rounded-lg bg-sidebar-accent ring-1 ring-inset ring-white/5"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  {active && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-brand" aria-hidden />}
                  <Icon className="relative size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className="relative">{label}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

export function AppSidebar({ role, name }: { role: Role; name: string }) {
  return (
    <aside className="sticky top-0 hidden h-[100dvh] flex-col gap-6 border-r bg-sidebar px-3 py-4 lg:flex">
      <Link href="/overview" className="rounded-lg px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Ascora overview">
        <BrandMark />
      </Link>
      <button
        type="button"
        onClick={openCommandPalette}
        data-silent
        className="press flex items-center gap-2 rounded-lg border bg-background/60 px-2.5 py-2 text-sm text-muted-foreground hover:border-ring/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 text-left">Search</span>
        <kbd className="flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          <Command className="size-2.5" aria-hidden />K
        </kbd>
      </button>
      <NavLinks role={role} layoutKey="desk" />
      <div className="mt-auto rounded-xl border bg-background/40 p-3">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Synthetic demo data. Scores support mentors; they never replace their judgement.</p>
      </div>
    </aside>
  );
}

export function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open navigation">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 overscroll-contain bg-sidebar p-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="mb-6 px-2">
            <BrandMark />
          </div>
          <NavLinks role={role} layoutKey="mobile" onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <BrandMark compact />
    </div>
  );
}

export function SearchButton() {
  return (
    <Button variant="ghost" size="icon" className="lg:hidden" onClick={openCommandPalette} aria-label="Search" data-silent>
      <Search className="size-4" />
    </Button>
  );
}
