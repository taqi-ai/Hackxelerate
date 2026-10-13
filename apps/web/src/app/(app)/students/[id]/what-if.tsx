"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, SlidersHorizontal, WifiOff } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/kit";
import { mlFetch, MlUnavailable } from "@/lib/ml-api";
import { cn } from "@/lib/utils";

type Eval = {
  success_score: number;
  academic_risk_prob: number;
  academic_risk_level: string;
  placement_risk_prob: number | null;
  placement_risk_level: string;
};
type Resp = { before: Eval; after: Eval };

const LEVERS = [
  { key: "att_core", label: "Core-subject attendance", unit: "%", min: 0, max: 100, step: 1 },
  { key: "completion_rate", label: "Assignment completion", unit: "%", min: 0, max: 100, step: 1 },
  { key: "login_freq", label: "LMS logins per week", unit: "", min: 0, max: 12, step: 0.5 },
  { key: "mocks", label: "Mock interviews attended", unit: "", min: 0, max: 8, step: 1, placementOnly: true },
] as const;

export function WhatIf({ studentId, placementTrack }: { studentId: string; placementTrack: boolean }) {
  const [base, setBase] = useState<Record<string, number> | null>(null);
  const [vals, setVals] = useState<Record<string, number>>({});
  const [res, setRes] = useState<Resp | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "offline" | "error">("idle");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const levers = LEVERS.filter((l) => !("placementOnly" in l) || placementTrack);

  async function run(changes: Record<string, number>) {
    setState("loading");
    try {
      const r = await mlFetch<Resp & { features?: Record<string, number> }>("/whatif", {
        method: "POST",
        body: JSON.stringify({ student_id: studentId, changes }),
      });
      setRes(r);
      setState("idle");
    } catch (e) {
      if (e instanceof MlUnavailable) setState("offline");
      else {
        setError((e as Error).message);
        setState("error");
      }
    }
  }

  // load the student's current values once
  useEffect(() => {
    let alive = true;
    mlFetch<{ values: Record<string, number> }>(`/whatif/${studentId}/inputs`)
      .then((r) => {
        if (!alive) return;
        setBase(r.values);
        setVals(r.values);
      })
      .catch((e) => alive && setState(e instanceof MlUnavailable ? "offline" : "error"));
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [studentId]);

  function change(key: string, v: number) {
    const next = { ...vals, [key]: v };
    setVals(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const changes = Object.fromEntries(Object.entries(next).filter(([k, val]) => base && val !== base[k]));
      if (Object.keys(changes).length) run(changes);
      else setRes(null);
    }, 250);
  }

  if (state === "offline")
    return (
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
        <WifiOff className="mt-0.5 size-4 shrink-0" />
        The what-if simulator needs the ML service, which is offline right now. The recommendations above are precomputed and still valid.
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="size-4 text-brand" /> What-if simulator
        </p>
        {base && res && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setVals(base);
              setRes(null);
            }}
          >
            <RotateCcw className="size-3.5" /> Reset
          </Button>
        )}
      </div>
      {!base ? (
        <div className="space-y-3">
          {levers.map((l) => (
            <div key={l.key} className="h-9 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {levers.map((l) => (
            <div key={l.key} className="grid gap-2">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor={`wi-${l.key}`}>{l.label}</label>
                <span className="tabular text-muted-foreground">
                  {base[l.key] !== vals[l.key] && <span className="mr-1 line-through opacity-60">{fmt(base[l.key])}</span>}
                  <span className="font-medium text-foreground">{fmt(vals[l.key])}</span>
                  {l.unit}
                </span>
              </div>
              <Slider
                id={`wi-${l.key}`}
                min={l.min}
                max={l.max}
                step={l.step}
                value={[vals[l.key] ?? l.min]}
                onValueChange={([v]) => change(l.key, v)}
                aria-label={l.label}
              />
            </div>
          ))}
        </div>
      )}
      <div className={cn("grid grid-cols-3 gap-2 rounded-lg border p-3 text-sm transition-opacity", !res && "opacity-60")}>
        <Outcome label="Success Score" before={res?.before.success_score} after={res?.after.success_score} fmtv={(v) => v.toFixed(0)} higherIsBetter />
        <div>
          <p className="text-xs text-muted-foreground">Academic risk</p>
          {res ? <RiskBadge level={res.after.academic_risk_level} prob={res.after.academic_risk_prob} /> : <p className="text-muted-foreground">Move a slider</p>}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Placement risk</p>
          {res ? <RiskBadge level={res.after.placement_risk_level} prob={res.after.placement_risk_prob} /> : <p className="text-muted-foreground">-</p>}
        </div>
      </div>
      {state === "loading" && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Recomputing with the live models
        </p>
      )}
      {state === "error" && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function fmt(v: number | undefined) {
  if (v === undefined || v === null || Number.isNaN(v)) return "-";
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function Outcome({ label, before, after, fmtv, higherIsBetter }: { label: string; before?: number; after?: number; fmtv: (v: number) => string; higherIsBetter?: boolean }) {
  const delta = before !== undefined && after !== undefined ? after - before : 0;
  const good = higherIsBetter ? delta > 0 : delta < 0;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular font-semibold">
        {after !== undefined ? fmtv(after) : "-"}
        {delta !== 0 && <span className={cn("ml-1 text-xs", good ? "text-risk-low" : "text-risk-high")}>{delta > 0 ? `+${fmtv(delta)}` : fmtv(delta)}</span>}
      </p>
    </div>
  );
}
