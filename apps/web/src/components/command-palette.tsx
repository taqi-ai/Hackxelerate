"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CornerDownLeft, Loader2, Search, UserRound } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { searchStudents, type StudentHit } from "@/app/(app)/search-action";
import { NAV_ITEMS } from "@/components/nav-items";
import { play } from "@/lib/sound";
import { riskTone } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

export function CommandPalette({ role }: { role: Role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<StudentHit[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("ascora-command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("ascora-command", onOpen);
    };
  }, []);

  useEffect(() => {
    play(open ? "open" : "close");
    if (!open) {
      setQ("");
      setHits([]);
    }
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => start(async () => setHits(await searchStudents(q))), 180);
    return () => clearTimeout(t);
  }, [q]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search Ascora" description="Jump to a page or find a student">
      <CommandInput placeholder="Search students by name or roll number, or jump to a page…" value={q} onValueChange={setQ} />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>{pending ? "Searching…" : q.length >= 2 ? "No students or pages match." : "Type at least 2 characters to search students."}</CommandEmpty>
        {hits.length > 0 && (
          <CommandGroup heading="Students">
            {hits.map((h) => (
              <CommandItem key={h.id} value={`${h.name} ${h.id}`} onSelect={() => go(`/students/${h.id}`)}>
                <UserRound className="size-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  {h.name}
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{h.id}</span>
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {h.branch} Y{h.year}-{h.section}
                </span>
                {h.risk && <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset", riskTone(h.risk))}>{h.risk}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {pending && hits.length === 0 && (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Searching…
          </div>
        )}
        <CommandSeparator />
        <CommandGroup heading="Go to">
          {NAV_ITEMS.filter((n) => (n.roles as readonly string[]).includes(role)).map(({ href, label, icon: Icon, hint }) => (
            <CommandItem key={href} value={`${label} ${hint}`} onSelect={() => go(href)}>
              <Icon className="size-4 text-muted-foreground" />
              <span className="flex-1">{label}</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">{hint}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Search className="size-3" /> Results respect your role: mentors only find their own students.
        </span>
        <span className="flex items-center gap-1">
          <CornerDownLeft className="size-3" /> to open
        </span>
      </div>
    </CommandDialog>
  );
}

export function openCommandPalette() {
  window.dispatchEvent(new Event("ascora-command"));
}
