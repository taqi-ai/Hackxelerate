import type { Metadata } from "next";
import { getStudentRows } from "@/lib/data";
import { PageHeader } from "@/components/kit";
import { AskClient } from "./ask-client";

export const metadata: Metadata = { title: "Ask Ascora" };

export default async function AskPage() {
  const rows = await getStudentRows();
  return (
    <>
      <PageHeader
        title="Ask Ascora"
        description="Ask in plain English. The question becomes a validated filter (never raw SQL) that runs on the students you are allowed to see."
      />
      <AskClient rows={rows} />
    </>
  );
}
