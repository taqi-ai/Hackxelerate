import type { Metadata } from "next";
import { getProfile, getStudentRows } from "@/lib/data";
import { PageHeader } from "@/components/kit";
import { Planner } from "./planner";

export const metadata: Metadata = { title: "This week" };

export default async function ThisWeek() {
  const [rows, profile] = await Promise.all([getStudentRows(), getProfile()]);
  const top = [...rows].sort((a, b) => b.priority - a.priority).slice(0, 80);
  return (
    <>
      <PageHeader
        title="Who to meet this week"
        description={
          profile?.role === "mentor"
            ? "Enter the hours you have. Ascora picks the meetings that help the most students, balancing risk, urgency and how fixable the drivers are."
            : "A mentor's view: enter available hours and get a ranked meeting list. Admins see the top of the whole campus."
        }
      />
      <Planner rows={top} />
    </>
  );
}
