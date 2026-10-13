/** Thin client for the FastAPI ML service. Every call has a timeout and a typed error, so the UI can degrade gracefully. */
export const ML_API = process.env.NEXT_PUBLIC_ML_API_URL ?? "http://localhost:8000";

export class MlUnavailable extends Error {}

export async function mlFetch<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), init?.timeoutMs ?? 15000);
  try {
    const res = await fetch(`${ML_API}${path}`, { ...init, signal: ctrl.signal, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
    if (!res.ok) {
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
