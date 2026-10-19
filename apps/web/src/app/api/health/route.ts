import { NextResponse } from "next/server";
import { configChecks, isReady } from "@/lib/readiness";

export const dynamic = "force-dynamic";

/** Readiness probe for deployments and uptime checks. `?probe=live` only confirms the process answers.
 *  The full check reports booleans for required settings and whether the ML service answers within 2 s. */
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (new URL(request.url).searchParams.get("probe") === "live") return NextResponse.json({ status: "ok" }, { headers });

  const checks: Record<string, boolean> = configChecks(process.env);
  let ml = false;
  if (checks.ml_api_url) {
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_ML_API_URL!.replace(/\/$/, "")}/health/live`, {
        signal: AbortSignal.timeout(2000),
        cache: "no-store",
      });
      ml = r.ok;
    } catch {
      ml = false;
    }
  }
  checks.ml_service = ml;
  const ready = isReady(checks);
  return NextResponse.json({ status: ready ? "ready" : "not_ready", checks }, { status: ready ? 200 : 503, headers });
}
