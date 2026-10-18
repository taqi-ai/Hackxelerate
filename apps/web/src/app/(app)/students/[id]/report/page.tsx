import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getInterventions, getProfile, getStudent360 } from "@/lib/data";
import { StudentReportView } from "@/components/student/student-report-view";
import { buildStudentJourney } from "@/lib/journey-utils";
import { istParts } from "@/lib/dates";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Student 360 Report — ${id}` };
}

export default async function StudentReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, d, interventions] = await Promise.all([
    getProfile(),
    getStudent360(id),
    getInterventions(id),
  ]);

  if (!d || !d.student || !profile) {
    notFound();
  }

  const now = istParts();
  const generatedAt = `${now.date} (Campus IST)`;

  const journeyEvents = buildStudentJourney({
    student: d.student,
    academic: d.academic,
    attendance: d.attendance,
    lms: d.lms,
    engagement: d.engagement,
    feedback: d.feedback,
    interventions,
  });

  return (
    <div className="py-2">
      <StudentReportView
        data={d}
        interventions={interventions}
        journeyEvents={journeyEvents}
        generatedAt={generatedAt}
        generatedBy={{
          name: profile.full_name,
          role: profile.role === "admin" ? "Institutional Administrator" : profile.role === "mentor" ? "Designated Mentor" : "Student",
        }}
      />
    </div>
  );
}
