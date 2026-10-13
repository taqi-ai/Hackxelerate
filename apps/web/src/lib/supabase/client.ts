import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xomihahbrxacgrwclect.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_XuDcQnqMy5ZXUdiCPsqBGg_iigElt_4";

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

