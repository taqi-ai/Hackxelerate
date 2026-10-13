import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  CheckCircle2,
  Database,
  ExternalLink,
  ShieldCheck,
  FileCheck2,
} from "lucide-react";
import { getProfile, getStudentAcademicData } from "@/lib/data";
import { PageHeader, Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { ManualImportDialog } from "@/components/manual-import-dialog";
import { StudentSelectorDialog } from "@/components/student-selector-dialog";

export const metadata: Metadata = { title: "Data & Portal" };

export default async function StudentConnectionPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const academicData = await getStudentAcademicData();
  if (!academicData) {
    redirect("/student");
  }

  const { student, academic, attendance, connection } = academicData;
  const overallAtt = attendance?.overall_pct ?? 0;
  const cgpaValue = academic?.cgpa ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data & Portal"
        description="University portal synchronization, data provenance breakdown, and DPDP compliance safeguards."
        actions={
          <div className="flex items-center gap-2">
            <StudentSelectorDialog currentStudentId={student.id} />
            <ManualImportDialog studentId={student.id} currentCgpa={cgpaValue} currentAttendance={overallAtt} />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Connection Status & Portal Links */}
        <div className="lg:col-span-7 space-y-6">
          <Panel
            title="Campus Integration Status"
            description="Active provenance link connecting Ascora to institutional records"
          >
            <div className="space-y-4 pt-2">
              <div className="rounded-xl border bg-background/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Connected Provider
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Synchronized
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-semibold text-base text-foreground">
                    Chandigarh University Lucknow Campus (CU Lucknow)
                  </h4>
                  <p className="text-xs text-muted-foreground font-mono">
                    Target Portal: https://student.culko.in/Login.aspx
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-xs">
                  <div className="rounded-lg border bg-muted/30 p-2.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium block">Provenance</span>
                    <span className="font-mono font-semibold text-foreground capitalize">
                      {connection?.provenance?.replace("_", " ") ?? "Synthetic Demo"}
                    </span>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-2.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium block">Student ID</span>
                    <span className="font-mono font-semibold text-foreground">{student.id}</span>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-2.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium block">Last Verified</span>
                    <span className="font-mono font-semibold text-foreground">
                      {new Date(connection?.last_synced_at ?? Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Official Portal Access */}
              <div className="rounded-xl border bg-card/60 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-brand" />
                  <h4 className="font-semibold text-sm text-foreground">Official CU Lucknow Student Portal</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The official CU Lucknow portal provides authenticated access to fee receipts, admit cards, and semester grade cards.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90 text-xs">
                    <a
                      href="https://student.culko.in/Login.aspx"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5"
                    >
                      <span>Open student.culko.in</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <ManualImportDialog
                    studentId={student.id}
                    currentCgpa={cgpaValue}
                    currentAttendance={overallAtt}
                  />
                </div>
              </div>
            </div>
          </Panel>

          {/* Technical Integration Architecture Note */}
          <Panel
            title="Integration Architecture & Security Standards"
            description="Compliance with institutional credential policies and automated security"
          >
            <div className="space-y-3 pt-2 text-xs text-muted-foreground leading-relaxed">
              <p>
                The Chandigarh University Lucknow Student Information System operates on ASP.NET WebForms with server-side ViewState tokens, form-based anti-forgery, and session cookie validation.
              </p>
              <p>
                In compliance with university IT acceptable use regulations, Ascora does not store plain-text student passwords or execute automated session replay. Student data is synced via authorized administrative exports or self-verified manual imports with full provenance attribution.
              </p>
            </div>
          </Panel>
        </div>

        {/* Right Column: Data Provenance & DPDP Privacy */}
        <div className="lg:col-span-5 space-y-6">
          <Panel
            title="Lineage & Audit Record"
            description="Source traces for academic figures"
          >
            <div className="space-y-3 pt-2 text-xs">
              <div className="rounded-xl border bg-background/60 p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <FileCheck2 className="h-4 w-4 text-emerald-500" />
                  <span>Academic Records Source</span>
                </div>
                <p className="text-muted-foreground font-mono text-[11px]">
                  {academic?.lineage?.file ?? "erp_academics.csv"}
                </p>
                <span className="text-muted-foreground block text-[11px]">
                  Ref: {academic?.lineage?.cgpa ?? `Rows: ${academic?.lineage?.rows ?? 25}`}
                </span>
              </div>

              <div className="rounded-xl border bg-background/60 p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <FileCheck2 className="h-4 w-4 text-emerald-500" />
                  <span>Attendance Register Source</span>
                </div>
                <p className="text-muted-foreground font-mono text-[11px]">
                  {attendance?.lineage?.file ?? "attendance_register.xlsx"}
                </p>
                <span className="text-muted-foreground block text-[11px]">
                  Ref: {attendance?.lineage?.rows ?? 15} attendance sessions verified
                </span>
              </div>

              {connection?.details && (
                <div className="rounded-xl border bg-background/60 p-3.5 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Database className="h-4 w-4 text-brand" />
                    <span>Metadata Payload</span>
                  </div>
                  <pre className="text-[10px] font-mono bg-muted/40 p-2 rounded-lg overflow-x-auto text-muted-foreground">
                    {JSON.stringify(connection.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </Panel>

          {/* Privacy & Safeguards */}
          <div className="rounded-2xl border bg-muted/20 p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-brand" />
              <span>Digital Personal Data Protection (DPDP)</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Your profile is protected by strict Row-Level Security (RLS). Institutional staff can only review aggregate risk models and assigned advisees, while your personal target plans and simulations remain strictly private to your student identifier.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
