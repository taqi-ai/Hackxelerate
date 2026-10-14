"use client";

import { play } from "@/lib/sound";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleDashed, Loader2, Play, Upload, WifiOff, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/kit";
import { ML_API, mlFetch, mlToken, MlUnavailable } from "@/lib/ml-api";
import { cn } from "@/lib/utils";
import { refreshCohortAction } from "@/app/(app)/actions";

type Step = { key: string; label: string; status: string; seconds: number | null; metrics: Record<string, unknown>; detail: string[] };
type Run = { run_id: string; status: "running" | "done" | "error"; steps: Step[]; summary: Record<string, any>; error: string | null };

function metricLine(s: Step) {
  const m = s.metrics;
  const bits: string[] = [];
  const add = (label: string, v: unknown) => {
    if (v === undefined || v === null) return;
    // the publish step reports rows per table: show the total
    const n = typeof v === "object" ? Object.values(v as Record<string, number>).reduce((a, b) => a + (Number(b) || 0), 0) : v;
    bits.push(`${label} ${typeof n === "number" ? n.toLocaleString("en-IN") : String(n)}`);
  };
  add("files", m.files);
  add("rows", m.rows);
  add("students", m.students);
  add("auto-linked", m.auto);
  add("needs review", m.review);
  add("duplicates merged", (m.erp_duplicate_rows as number | undefined));
  add("conflicts", m.total);
  add("AUC", m.academic_auc);
  add("k", m.k);
  add("insights", m.count);
  return bits.slice(0, 4).join(" · ");
}

export function PipelineRunner() {
  const router = useRouter();
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);

  async function poll(id: string) {
    for (;;) {
      await new Promise((r) => setTimeout(r, 1200));
      const r = await mlFetch<Run>(`/pipeline/runs/${id}`);
      setRun(r);
      if (r.status !== "running") return r;
    }
  }

  async function start(source: "demo" | "upload") {
    setBusy(true);
    setError(null);
    setOffline(false);
    setRun(null);
    try {
      let upload_id: string | undefined;
      if (source === "upload") {
        const fd = new FormData();
        files.forEach((f) => fd.append("files", f));
        const res = await fetch(`${ML_API}/pipeline/upload`, { method: "POST", body: fd, headers: { Authorization: `Bearer ${await mlToken()}` } });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? "Upload failed");
        upload_id = (await res.json()).upload_id;
      }
      const { run_id } = await mlFetch<{ run_id: string }>("/pipeline/run", { method: "POST", body: JSON.stringify({ source, upload_id, publish: true }) });
      const done = await poll(run_id);
      if (done.status === "done") {
        play("success");
        await refreshCohortAction();
        router.refresh();
      } else {
        play("error");
        setError(done.error ?? "The run failed");
      }
    } catch (e) {
      if (e instanceof MlUnavailable || (e as Error).name === "TypeError") setOffline(true);
      else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Run the pipeline" description="Use the bundled campus exports, or upload your own CSV, Excel and JSON exports.">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => start("demo")} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Run on campus exports
        </Button>
        <input ref={fileRef} type="file" multiple accept=".csv,.xlsx,.json" className="sr-only" onChange={(e) => setFiles([...(e.target.files ?? [])])} aria-label="Choose source files" />
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Upload className="size-4" /> {files.length ? `${files.length} files selected` : "Choose files"}
        </Button>
        {files.length > 0 && (
          <Button variant="secondary" onClick={() => start("upload")} disabled={busy}>
            Run on uploaded files
          </Button>
        )}
      </div>

      {offline && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/60 px-4 py-3 text-sm">
          <WifiOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p>
            The ML service isn&apos;t reachable at <span className="font-mono text-xs">{ML_API}</span>. The last published run is shown below, so nothing is lost.
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {run && (
        <ol className="mt-5 grid gap-1.5" aria-label="Pipeline steps" aria-live="polite">
          {run.steps.map((s) => (
            <li key={s.key} className="grid grid-cols-[1.25rem_1fr_auto] items-start gap-3 rounded-lg px-3 py-2 odd:bg-muted/40">
              <span className="mt-0.5">
                {s.status === "done" ? (
                  <CheckCircle2 className="size-4 text-risk-low" />
                ) : s.status === "running" ? (
                  <Loader2 className="size-4 animate-spin text-brand" />
                ) : s.status === "error" ? (
                  <XCircle className="size-4 text-risk-high" />
                ) : (
                  <CircleDashed className="size-4 text-muted-foreground" />
                )}
              </span>
              <span className="min-w-0">
                <span className={cn("block text-sm", s.status === "pending" && "text-muted-foreground")}>{s.label}</span>
                {s.status !== "pending" && <span className="block truncate text-xs text-muted-foreground">{metricLine(s)}</span>}
                {s.detail.slice(0, 3).map((d) => (
                  <span key={d} className="block text-xs text-muted-foreground">
                    {d}
                  </span>
                ))}
              </span>
              <span className="tabular text-xs text-muted-foreground">{s.seconds !== null ? `${s.seconds}s` : ""}</span>
            </li>
          ))}
        </ol>
      )}
      {run?.status === "done" && (
        <p className="mt-3 text-sm text-risk-low">
          Done. {run.summary.students?.toLocaleString("en-IN")} students unified; fuzzy matching precision {((run.summary.matching?.precision_auto ?? 0) * 100).toFixed(1)}%, recall{" "}
          {((run.summary.matching?.recall_auto ?? 0) * 100).toFixed(1)}%.
        </p>
      )}
    </Panel>
  );
}
