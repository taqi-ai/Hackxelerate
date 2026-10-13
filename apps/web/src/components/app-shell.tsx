"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChartNoAxesCombined,
  ClipboardCheck,
  DatabaseZap,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  ScanSearch,
  ShieldCheck,
  Shapes,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard, roles: ["admin", "mentor"] },
  { href: "/this-week", label: "This week", icon: ClipboardCheck, roles: ["admin", "mentor"] },
  { href: "/students", label: "Students", icon: Users, roles: ["admin", "mentor"] },
  { href: "/segments", label: "Segments", icon: Shapes, roles: ["admin", "mentor"] },
  { href: "/interventions", label: "Interventions", icon: ChartNoAxesCombined, roles: ["admin", "mentor"] },
  { href: "/ask", label: "Ask Ascora", icon: MessageSquareText, roles: ["admin", "mentor"] },
  { href: "/data", label: "Data integration", icon: DatabaseZap, roles: ["admin"] },
  { href: "/model", label: "Score & models", icon: ScanSearch, roles: ["admin", "mentor"] },
  { href: "/fairness", label: "Fairness & privacy", icon: ShieldCheck, roles: ["admin"] },
] as const;

function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="grid gap-0.5" aria-label="Main">
      {NAV.filter((n) => (n.roles as readonly string[]).includes(role)).map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar({ role }: { role: Role }) {
  return (
    <aside className="sticky top-0 hidden h-[100dvh] flex-col gap-6 border-r bg-sidebar px-3 py-4 lg:flex">
      <Link href="/" className="px-2">
        <BrandMark />
      </Link>
      <NavLinks role={role} />
      <p className="mt-auto px-2.5 text-xs leading-relaxed text-muted-foreground">
        Synthetic demo data. Scores support mentors; they never replace their judgement.
      </p>
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
        <SheetContent side="left" className="w-72 bg-sidebar p-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="mb-6 px-2">
            <BrandMark />
          </div>
          <NavLinks role={role} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <BrandMark compact />
    </div>
  );
}
