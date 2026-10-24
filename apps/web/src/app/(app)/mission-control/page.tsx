import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/kit";
import { loadMission, PLAN_DATES } from "./load";
import { MissionControl } from "./mission-control";

export const metadata: Metadata = { title: "Mission Control" };

export default async function MissionControlPage() {
  const data = await loadMission();
  if (!data) redirect("/login?next=/mission-control");
  return (
    <>
      <PageHeader
        title="Mission Control"
        description={
          <>
            A weekly support plan built from the capacity you have. It ranks students by explainable risk, matches each to one
            intervention that fits, and shows what is left over. Nothing is saved until you approve it. All data here is a{" "}
            <strong>synthetic demonstration cohort</strong>.
          </>
        }
      />
      <MissionControl students={data.students} role={data.role} mentors={data.mentors} dates={PLAN_DATES()} />
    </>
  );
}
