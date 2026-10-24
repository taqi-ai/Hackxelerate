import type { Metadata } from "next";
import { getStudentRows, getArtifacts, getSegments, getStudent360 } from "@/lib/data";
import { BriefDeck } from "./brief-deck";

export const metadata: Metadata = {
  title: "Dean's Executive Decision Brief",
};

export default async function ExecutiveBriefPage() {
  const [rows, artifacts, segments, arjunData] = await Promise.all([
    getStudentRows(),
    getArtifacts(["cohort", "model_academic", "model_placement"]),
    getSegments(),
    getStudent360("CU24AIML0039"),
  ]);

  return (
    <BriefDeck
      rows={rows}
      cohortArtifact={artifacts.cohort}
      modelAcademicArtifact={artifacts.model_academic}
      modelPlacementArtifact={artifacts.model_placement}
      segments={segments}
      demoStudent={arjunData}
    />
  );
}
