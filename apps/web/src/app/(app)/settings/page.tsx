import type { Metadata } from "next";
import { getProfile, getStudentRows } from "@/lib/data";
import { OFFLINE } from "@/lib/offline";
import { PageHeader } from "@/components/kit";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [profile, rows] = await Promise.all([getProfile(), getStudentRows()]);
  return (
    <>
      <PageHeader title="Settings" description="Your account, how Ascora looks and behaves on this device, and the health of the system." />
      <SettingsClient
        name={profile?.full_name ?? "Unknown"}
        email={profile?.email ?? ""}
        role={profile?.role === "admin" ? "admin" : "mentor"}
        mentorId={profile?.mentor_id ?? null}
        visibleStudents={rows.length}
        offline={OFFLINE}
        mlUrl={process.env.NEXT_PUBLIC_ML_API_URL ?? ""}
      />
    </>
  );
}
