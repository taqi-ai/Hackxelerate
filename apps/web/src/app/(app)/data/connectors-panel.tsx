"use client";

import { useEffect, useState } from "react";
import { Cable, FileUp, Loader2 } from "lucide-react";
import { Panel } from "@/components/kit";
import { MlUnavailable, mlFetch } from "@/lib/ml-api";
import { cn } from "@/lib/utils";

type Connector = { id: string; name: string; kind: "file" | "api"; supported: boolean; how: string; status: string; detail: string; last_sync: number | null };

const TONE: Record<string, string> = {
  Healthy: "bg-risk-low-soft text-risk-low ring-risk-low/25",
  Syncing: "bg-brand/10 text-brand ring-brand/25",
  Stale: "bg-risk-medium-soft text-risk-medium ring-risk-medium/25",
  "Needs attention": "bg-risk-high-soft text-risk-high ring-risk-high/25",
};

/** Data sources and their real status from the ML service. Only the file import exists; the rest say exactly what an
 *  institution must provide, and never show "connected" before a real authorised sync. */
export function ConnectorsPanel({ lastPublished }: { lastPublished: string | null }) {
  const [items, setItems] = useState<Connector[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mlFetch<{ connectors: Connector[] }>("/connectors", { timeoutMs: 15000 })
      .then((r) => setItems(r.connectors))
      .catch((e) => setError(e instanceof MlUnavailable ? "The analytics service is not reachable, so source status is unknown right now." : (e as Error).message));
  }, []);

  return (
    <Panel
      title="Sources and connectors"
      description={
        lastPublished
          ? `Data last published ${new Date(lastPublished).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST. Ascora reads only sources an institution has authorised.`
          : "Ascora reads only sources an institution has authorised."
      }
    >
      {error ? (
        <p className="text-sm text-muted-foreground" role="status">{error}</p>
      ) : !items ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Checking sources…
        </p>
      ) : (
        <ul className="divide-y">
          {items.map((c) => (
            <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="flex min-w-0 items-start gap-3">
                {c.kind === "file" ? <FileUp className="mt-0.5 size-4 text-muted-foreground" aria-hidden /> : <Cable className="mt-0.5 size-4 text-muted-foreground" aria-hidden />}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.supported ? c.detail : c.how}</p>
                </div>
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", TONE[c.status] ?? "bg-muted text-muted-foreground ring-border")}>
                {c.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
