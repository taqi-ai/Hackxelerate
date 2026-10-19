/** Which required settings are present. Booleans only: values are never returned or logged. */
export function configChecks(env: Record<string, string | undefined>) {
  return {
    supabase_url: !!env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon_key: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ml_api_url: !!env.NEXT_PUBLIC_ML_API_URL,
    ml_token_secret: !!env.ASCORA_TOKEN_SECRET,
  };
}

export function isReady(checks: Record<string, boolean>) {
  return Object.values(checks).every(Boolean);
}
