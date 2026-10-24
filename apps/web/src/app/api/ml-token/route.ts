import { NextResponse } from "next/server";
import { getProfile } from "@/lib/data";
import { mintMlToken } from "@/lib/ml-token";
import { isDemoAccount } from "@/lib/demo-accounts";

/** offline mode has no database profile; its synthetic cohort is the evaluation campus (migration 0010) */
const EVALUATION_INSTITUTION = "00000000-0000-4000-8000-0000000000a1";

export const dynamic = "force-dynamic";

/** Only a signed-in user (Supabase session) gets a token; the role claim comes from the profiles table, never the client. */
export async function GET() {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  if (profile.role !== "admin" && profile.role !== "mentor") {
    return NextResponse.json({ error: "Forbidden: institutional access required" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  try {
    // the institution travels with the token: one analytics deployment serves one institution
    const inst = profile.institution_id ?? EVALUATION_INSTITUTION;
    const { token, exp } = mintMlToken({ sub: profile.id, role: profile.role, inst, ...(profile.role === "mentor" && profile.mentor_id ? { mid: profile.mentor_id } : {}), ...(isDemoAccount(profile.email) ? { demo: true } : {}) });
    return NextResponse.json({ token, exp }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "ML service auth is not configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
