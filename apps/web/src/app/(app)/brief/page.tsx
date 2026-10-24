import type { Metadata } from "next";
import { getProfile, getStudentRows } from "@/lib/data";
import { BriefClient } from "./brief-client";

export const metadata: Metadata = {
  title: "Executive Decision Brief",
  description: "Dean's executive briefing on early academic detection, dual-risk projections, and capacity-aware intervention.",
};

export default async function BriefPage() {
  const profile = await getProfile();
  let rows: any[] = [];
  try {
    rows = await getStudentRows();
  } catch {
    rows = [];
  }

  return <BriefClient role={profile?.role ?? "admin"} rows={rows} />;
}
