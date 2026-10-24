import type { Metadata } from "next";
import { getDriverMap, getProfile, getStudentRows } from "@/lib/data";
import { PageHeader } from "@/components/kit";
import { AskClient } from "./ask-client";

export const metadata: Metadata = { title: "Ask Ascora" };

export default async function AskPage() {
  const [rows, driverMap, profile] = await Promise.all([
    getStudentRows(),
    getDriverMap(),
    getProfile(),
  ]);

  const drivers: Record<string, { academic: any[]; placement: any[] }> = {};
  for (const [id, d] of driverMap.entries()) {
    drivers[id] = d;
  }

  return (
    <>
      <PageHeader
        title="Ask Ascora"
        description="Plain-English decision copilot. Questions translate into schema-validated analytical filters and TreeSHAP evidence (never raw SQL) scoped to your permitted student roster."
      />
      <AskClient
        rows={rows}
        drivers={drivers}
        role={profile?.role ?? "admin"}
        mentorId={profile?.mentor_id ?? null}
      />
    </>
  );
}
