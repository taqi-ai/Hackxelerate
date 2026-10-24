"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  UserCheck,
  Clock,
  CheckCircle2,
  CalendarPlus,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel, EmptyState } from "@/components/kit";
import { InterventionRow } from "../students/[id]/intervention-panel";
import { deriveRecommendation } from "@/lib/recommendations";
import type { Intervention, StudentRow } from "@/lib/types";
import { cn } from "@/lib/utils";

interface InterventionsQueueClientProps {
  students: StudentRow[];
  interventions: (Intervention & { student_name?: string })[];
  openCount: number;
  doneCount: number;
}

export function InterventionsQueueClient({
  students,
  interventions,
  openCount,
  doneCount,
}: InterventionsQueueClientProps) {
  const [activeTab, setActiveTab] = useState<"prescriptions" | "active" | "completed">("prescriptions");

  // Filters state
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [personaFilter, setPersonaFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  // Derive prescriptive recommendations for all students
  const prescriptions = useMemo(() => {
    return students.map((s) => deriveRecommendation(s));
  }, [students]);

  // Unique filter values
  const departments = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.branch) set.add(s.branch);
    });
    return Array.from(set).sort();
  }, [students]);

  const personas = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.persona) set.add(s.persona);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered recommendations queue
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((p) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = p.student_name.toLowerCase().includes(q);
        const matchesRoll = p.roll_number.toLowerCase().includes(q);
        if (!matchesName && !matchesRoll) return false;
      }
      if (deptFilter !== "all" && p.department !== deptFilter) return false;
      if (personaFilter !== "all" && p.segment_persona !== personaFilter) return false;
      if (ownerFilter !== "all" && p.suggested_owner !== ownerFilter) return false;
      if (priorityFilter !== "all" && p.priority !== priorityFilter) return false;
      return true;
    });
  }, [prescriptions, search, deptFilter, personaFilter, ownerFilter, priorityFilter]);

  // Filtered interventions
  const filteredInterventions = useMemo(() => {
    return interventions.filter((i) => {
      const st = byId.get(i.student_id);
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = (i.student_name ?? "").toLowerCase().includes(q);
        const matchesRoll = i.student_id.toLowerCase().includes(q);
        if (!matchesName && !matchesRoll) return false;
      }
      if (deptFilter !== "all" && st?.branch !== deptFilter) return false;
      if (personaFilter !== "all" && st?.persona !== personaFilter) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      return true;
    });
  }, [interventions, byId, search, deptFilter, personaFilter, statusFilter]);

  const activeInterventions = useMemo(() => {
    return filteredInterventions.filter((i) => i.status === "open" || i.status === "in_progress");
  }, [filteredInterventions]);

  const completedInterventions = useMemo(() => {
    return filteredInterventions.filter((i) => i.status === "done");
  }, [filteredInterventions]);

  return (
    <div className="space-y-4">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 rounded-lg bg-muted/60 p-1">
          <button
            onClick={() => setActiveTab("prescriptions")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
              activeTab === "prescriptions"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="size-3.5 text-brand" />
            Prescriptive Queue
            <span className="rounded-full bg-brand/10 px-1.5 py-0.2 font-mono text-[10px] text-brand">
              {filteredPrescriptions.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
              activeTab === "active"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="size-3.5 text-amber-500" />
            Active Follow-ups
            <span className="rounded-full bg-amber-500/10 px-1.5 py-0.2 font-mono text-[10px] text-amber-600 dark:text-amber-400">
              {openCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
              activeTab === "completed"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            Closed Loop History
            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.2 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
              {doneCount}
            </span>
          </button>
        </div>

        {/* Clear Filters helper */}
        {(search || deptFilter !== "all" || personaFilter !== "all" || ownerFilter !== "all" || priorityFilter !== "all" || statusFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setDeptFilter("all");
              setPersonaFilter("all");
              setOwnerFilter("all");
              setPriorityFilter("all");
              setStatusFilter("all");
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Multi-Dimensional Filter Bar */}
      <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-6 bg-card border rounded-xl p-3 shadow-sm">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or roll number..."
            className="h-9 pl-8 text-xs"
          />
        </div>

        {/* Department Filter */}
        <div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Persona Filter */}
        <div>
          <Select value={personaFilter} onValueChange={setPersonaFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Segment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Segments</SelectItem>
              {personas.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Owner Filter */}
        <div>
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              <SelectItem value="Faculty Mentor">Faculty Mentor</SelectItem>
              <SelectItem value="Training & Placement Cell">Training & Placement Cell</SelectItem>
              <SelectItem value="Student Wellness Counsellor">Student Wellness Counsellor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="P0 Critical">P0 Critical (48h)</SelectItem>
              <SelectItem value="P1 High">P1 High (7d)</SelectItem>
              <SelectItem value="P2 Watch">P2 Watch (14d)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Tab 1: Prescriptions Queue */}
      {activeTab === "prescriptions" && (
        <Panel
          title="Prescriptive Recommendation Queue"
          description="Evidence-backed actions derived from attendance, LMS trends, academic backlogs, and employability indicators."
        >
          {filteredPrescriptions.length === 0 ? (
            <EmptyState icon={Filter} title="No matching recommendations">
              Try resetting your search query or loosening your filters.
            </EmptyState>
          ) : (
            <div className="divide-y">
              {filteredPrescriptions.slice(0, 50).map((r) => (
                <article
                  key={r.student_id}
                  className="flex flex-col gap-3 py-3.5 transition-colors hover:bg-muted/10 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1.5 flex-1 pr-4">
                    {/* Header: Student, Department, Year, Persona & Priority */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/students/${r.student_id}`}
                        className="font-semibold text-foreground text-sm hover:underline"
                      >
                        {r.student_name}
                      </Link>
                      <span className="font-mono text-xs text-muted-foreground">({r.roll_number})</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                        {r.department} · Year {r.year}
                      </span>
                      <span className="rounded border border-brand/20 bg-brand/5 px-2 py-0.5 text-[11px] font-medium text-brand">
                        {r.segment_persona}
                      </span>
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider",
                          r.priority === "P0 Critical"
                            ? "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/20"
                            : r.priority === "P1 High"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                            : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                        )}
                      >
                        {r.priority} · {r.sla_target}
                      </span>
                    </div>

                    {/* Prescribed Action */}
                    <div className="flex items-baseline gap-2 pt-0.5">
                      <span className="text-xs font-semibold text-foreground">Action:</span>
                      <span className="text-xs font-medium text-foreground bg-muted/40 px-2 py-0.5 rounded">
                        {r.prescribed_action}
                      </span>
                    </div>

                    {/* Evidence-Based Reason */}
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">Evidence:</strong> {r.evidence_reason}
                    </p>

                    {/* Suggested Institutional Owner & Observed Metrics */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <UserCheck className="size-3.5 text-brand" />
                        Suggested Owner: <strong>{r.suggested_owner}</strong>
                      </span>
                      {r.observed_metrics.attendance_pct !== null && (
                        <span>Att: {r.observed_metrics.attendance_pct.toFixed(0)}%</span>
                      )}
                      {r.observed_metrics.lms_completion_pct !== null && (
                        <span>LMS Comp: {r.observed_metrics.lms_completion_pct.toFixed(0)}%</span>
                      )}
                      {r.observed_metrics.cgpa !== null && (
                        <span>CGPA: {r.observed_metrics.cgpa.toFixed(2)}</span>
                      )}
                      <span>
                        Acad Risk: {(r.observed_metrics.academic_risk_prob * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Action Link to Student Profile to Plan Intervention */}
                  <div className="self-start sm:self-center">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/students/${r.student_id}`}>
                        <CalendarPlus className="size-3.5" /> Plan Action
                      </Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
          {filteredPrescriptions.length > 50 && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Showing top 50 of {filteredPrescriptions.length} recommendations. Use filters to narrow down by department or priority.
            </p>
          )}
        </Panel>
      )}

      {/* Tab 2: Active Interventions */}
      {activeTab === "active" && (
        <Panel title="Active Interventions Requiring Review" description="Update status inline or log follow-up measurements">
          {activeInterventions.length === 0 ? (
            <EmptyState title="No active interventions match filters">
              Review prescriptive recommendations or clear active filters.
            </EmptyState>
          ) : (
            <ul className="divide-y">
              {activeInterventions.map((i) => (
                <InterventionRow key={i.id} i={i} current={byId.get(i.student_id) ?? null} showStudent />
              ))}
            </ul>
          )}
        </Panel>
      )}

      {/* Tab 3: Completed Interventions & Follow-up History */}
      {activeTab === "completed" && (
        <Panel
          title="Completed Interventions & Closed-Loop Follow-ups"
          description="Verified baseline snapshots vs recorded follow-up assessments."
        >
          {completedInterventions.length === 0 ? (
            <EmptyState title="No completed interventions match filters">
              Completed cases with observed follow-up evaluations will appear here.
            </EmptyState>
          ) : (
            <ul className="divide-y">
              {completedInterventions.map((i) => (
                <InterventionRow key={i.id} i={i} current={byId.get(i.student_id) ?? null} showStudent />
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}
