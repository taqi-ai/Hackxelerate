import { describe, expect, it } from "vitest";
import { configChecks, isReady } from "./readiness";

describe("readiness", () => {
  it("reports each missing setting without exposing values", () => {
    const c = configChecks({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", ASCORA_TOKEN_SECRET: "secret-value" });
    expect(c).toEqual({ supabase_url: true, supabase_anon_key: false, ml_api_url: false, ml_token_secret: true });
    expect(JSON.stringify(c)).not.toContain("secret-value");
    expect(isReady(c)).toBe(false);
  });
  it("is ready only when everything is present", () => {
    const c = configChecks({ NEXT_PUBLIC_SUPABASE_URL: "a", NEXT_PUBLIC_SUPABASE_ANON_KEY: "b", NEXT_PUBLIC_ML_API_URL: "c", ASCORA_TOKEN_SECRET: "d" });
    expect(isReady(c)).toBe(true);
  });
});
