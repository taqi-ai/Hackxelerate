import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getConflicts, getProfile, getQualityReport, getReviewQueue } from "@/lib/data";
import { PageHeader } from "@/components/kit";
import { PipelineRunner } from "./pipeline-runner";
import { QualityReport } from "./quality-report";

export const metadata: Metadata = { title: "Data integration" };

export default async function DataPage() {
  const profile = await getProfile();
  if (profile?.role !== "admin") redirect("/overview");
  const [quality, conflicts, review] = await Promise.all([getQualityReport(), getConflicts(60), getReviewQueue(40)]);
  return (
    <>
      <PageHeader
        title="Data integration"
        description="Seven messy campus systems become one student view. Every step is logged, every link has a confidence, and every value remembers the file and row it came from."
      />
      <PipelineRunner />
      <QualityReport report={quality?.report ?? null} conflicts={conflicts as any[]} review={review as any} />
    </>
  );
}
