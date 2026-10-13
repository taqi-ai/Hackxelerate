"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AgendaEvent = { id: string; date: string; title: string; sub: string; href: string; overdue: boolean };

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Month calendar with intervention due dates, plus the next few items as a list. */
export function AgendaCalendar({ events, today }: { events: AgendaEvent[]; today: string }) {
  const [y0, m0] = today.split("-").map(Number);
  const [cursor, setCursor] = useState({ y: y0, m: m0 - 1 });
  const [picked, setPicked] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const m = new Map<string, AgendaEvent[]>();
    events.forEach((e) => m.set(e.date, [...(m.get(e.date) ?? []), e]));
    return m;
  }, [events]);

  const first = new Date(cursor.y, cursor.m, 1);
  const lead = (first.getDay() + 6) % 7; // weeks start on Monday
  const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(cursor.y, cursor.m, i + 1))];
  const monthLabel = first.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const list = picked ? byDay.get(picked) ?? [] : events.filter((e) => e.date >= today || e.overdue).slice(0, 4);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-display font-semibold">{monthLabel}</p>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="size-8" aria-label="Previous month" onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Next month" onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="pb-1 text-muted-foreground">
            {d}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`x${i}`} />;
          const key = ymd(d);
          const has = byDay.get(key);
          const isToday = key === today;
          const isPicked = key === picked;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setPicked(isPicked ? null : key)}
              aria-pressed={isPicked}
              aria-label={`${d.toLocaleDateString("en-IN", { day: "numeric", month: "long" })}${has ? `, ${has.length} due` : ""}`}
              className={cn(
                "relative grid aspect-square place-items-center rounded-lg tabular transition-colors hover:bg-accent",
                isToday && "bg-primary font-semibold text-primary-foreground hover:bg-primary/90",
                isPicked && !isToday && "ring-2 ring-ring",
              )}
            >
              {d.getDate()}
              {has && (
                <span
                  className={cn(
                    "absolute bottom-1 size-1 rounded-full",
                    isToday ? "bg-primary-foreground" : has.some((e) => e.overdue) ? "bg-risk-high" : "bg-brand",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{picked ? new Date(picked).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" }) : "Coming up"}</p>
        {list.length === 0 ? (
          <p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
            {picked ? "Nothing due this day." : "No check-ins scheduled. Plan one from a student's profile."}
          </p>
        ) : (
          list.map((e) => (
            <Link key={e.id} href={e.href} className="flex items-center gap-3 rounded-xl border bg-background/40 px-3 py-2.5 transition-colors hover:bg-accent">
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", e.overdue ? "bg-risk-high/15 text-risk-high" : "bg-brand/15 text-brand")}>
                <CalendarClock className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{e.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{e.sub}</span>
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
