"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { play } from "@/lib/sound";

export type AgendaEvent = { id: string; date: string; title: string; sub: string; owner: string | null; href: string; overdue: boolean; status: string };

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parse(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
// fixed names: Intl output can differ between the server and the browser and break hydration
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WD_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MO_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function initials(name: string) {
  return name
    .replace(/^(Dr\.|Prof\.)\s*/, "")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

/** A week strip with the selected day, then the check-ins due in that week as cards. */
export function AgendaCalendar({ events, today }: { events: AgendaEvent[]; today: string }) {
  const [picked, setPicked] = useState(today);
  // the strip shows 6 days starting two days before the picked day, like a rolling planner
  const start = useMemo(() => {
    const d = parse(picked);
    d.setDate(d.getDate() - 2);
    return d;
  }, [picked]);
  const days = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const byDay = useMemo(() => {
    const m = new Map<string, AgendaEvent[]>();
    events.forEach((e) => m.set(e.date, [...(m.get(e.date) ?? []), e]));
    return m;
  }, [events]);

  const shift = (n: number) => {
    const d = parse(picked);
    d.setDate(d.getDate() + n);
    setPicked(ymd(d));
    play("tick");
  };

  // the picked day first, then the rest of the visible window, then what is overdue
  const windowKeys = days.map(ymd);
  const list = [
    ...(byDay.get(picked) ?? []),
    ...events.filter((e) => e.date !== picked && windowKeys.includes(e.date)),
    ...events.filter((e) => e.overdue && !windowKeys.includes(e.date)),
  ].slice(0, 4);
  const pd = parse(picked);
  const month = `${MO_LONG[pd.getMonth()]} ${pd.getFullYear()}`;

  return (
    <div className="relative overflow-hidden rounded-[1.4rem] border bg-gradient-to-b from-card via-card to-brand/[0.07] p-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => shift(-6)} aria-label="Earlier days" className="press grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
          <ChevronLeft className="size-4" />
        </button>
        <p className="font-display font-semibold">{month}</p>
        <button type="button" onClick={() => shift(6)} aria-label="Later days" className="press grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-6 gap-1 text-center">
        {days.map((d) => {
          const key = ymd(d);
          const sel = key === picked;
          const has = byDay.get(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setPicked(key);
                play("tick");
              }}
              aria-pressed={sel}
              aria-label={`${WD_LONG[d.getDay()]} ${d.getDate()} ${MO_LONG[d.getMonth()]}${has ? `, ${has.length} due` : ""}`}
              className="group flex flex-col items-center gap-1.5 rounded-xl py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-[11px] text-muted-foreground">{WD[d.getDay()]}</span>
              <span
                className={cn(
                  "relative grid size-8 place-items-center rounded-full text-sm tabular transition-colors",
                  sel ? "bg-brand font-semibold text-primary-foreground shadow-[0_0_18px_-2px_var(--brand)]" : "group-hover:bg-accent",
                  key === today && !sel && "ring-1 ring-brand/60",
                )}
              >
                {d.getDate()}
                {has && !sel && <span className={cn("absolute -bottom-1 size-1 rounded-full", has.some((e) => e.overdue) ? "bg-risk-high" : "bg-brand")} />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-2.5">
        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">Nothing due around this day.</p>
        ) : (
          list.map((e) => (
            <Link
              key={e.id}
              href={e.href}
              className={cn(
                "edge group block rounded-2xl border bg-background/50 p-3.5 transition-colors hover:bg-accent/60",
                e.date === picked && "bg-gradient-to-br from-brand/[0.14] to-background/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-medium">{e.title}</p>
                {e.status === "in_progress" && <span className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-medium text-brand">In progress</span>}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{e.sub}</p>
              <div className="mt-3 flex items-center justify-between">
                {e.owner ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="grid size-6 place-items-center rounded-full bg-gradient-to-br from-brand/60 to-brand/20 text-[10px] font-semibold text-foreground ring-2 ring-card">
                      {initials(e.owner)}
                    </span>
                    <span className="truncate">{e.owner}</span>
                  </span>
                ) : (
                  <span />
                )}
                <span className={cn("flex shrink-0 items-center gap-1 text-[11px]", e.overdue ? "text-risk-high" : "text-muted-foreground")}>
                  <CalendarClock className="size-3" aria-hidden />
                  {e.overdue ? "Overdue" : e.date === today ? "Today" : `${WD[parse(e.date).getDay()]}, ${parse(e.date).getDate()} ${MO[parse(e.date).getMonth()]}`}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      <Link
        href="/this-week"
        className="press mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-brand/85 py-2.5 text-sm font-medium text-primary-foreground hover:bg-brand"
      >
        <Plus className="size-4" aria-hidden /> Plan a check-in
      </Link>
    </div>
  );
}
