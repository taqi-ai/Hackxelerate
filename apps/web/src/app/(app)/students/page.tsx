import type { Metadata } from "next";
import { getMentors, getSegments, getStudentRows } from "@/lib/data";
import { PageHeader } from "@/components/kit";
import { StudentsTable } from "./students-table";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [rows, segments, mentors, sp] = await Promise.all([getStudentRows(), getSegments(), getMentors(), searchParams]);
  return (
    <>
      <PageHeader
        title="Students"
        description="Every student in one table. Filter by risk, segment or intent, then open a profile to see why a student is flagged and what to do."
      />
      <StudentsTable
        rows={rows}
        personas={segments.map((s) => s.persona)}
        mentors={mentors.map((m) => ({ id: m.id, name: m.name }))}
        initial={{
          academic: sp.academic,
          placement: sp.placement,
          alert: sp.alert,
          persona: sp.persona,
          q: sp.q,
        }}
      />
    </>
  );
}
