/** Client for the FastAPI ML service. Every call carries a short-lived signed token from /api/ml-token,
 *  has a timeout, and fails with a typed error so the UI can degrade gracefully. */
export const ML_API = process.env.NEXT_PUBLIC_ML_API_URL ?? "http://localhost:8000";

export class MlUnavailable extends Error {}

let cached: { token: string; exp: number } | null = null;

export async function mlToken(): Promise<string> {
  if (cached && cached.exp - 30 > Date.now() / 1000) return cached.token;
  const res = await fetch("/api/ml-token", { cache: "no-store" });
  // an expired session is redirected to /login by the middleware (HTML), not answered with JSON
  if (res.redirected || res.status === 401) throw new Error("Your session has expired. Sign in again.");
  if (!res.ok) throw new MlUnavailable("The ML service is not configured.");
  cached = await res.json();
  return cached!.token;
}

export async function mlFetch<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const token = await mlToken();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), init?.timeoutMs ?? 25000);
  try {
    const res = await fetch(`${ML_API}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      if (res.status === 401) cached = null;
      const body = await res.json().catch(() => ({}));
      throw new Error(typeof body.detail === "string" ? body.detail : `ML service error ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof TypeError || (e as Error).name === "AbortError") throw new MlUnavailable("The ML service is not reachable right now.");
    throw e;
  } finally {
    clearTimeout(t);
  }
}
