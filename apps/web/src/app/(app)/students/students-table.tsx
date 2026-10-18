"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDownUp, Columns3, Download, FileText, FilterX, Search, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, RiskBadge, ScoreValue } from "@/components/kit";
import { INTENT_LABEL, maskEmail } from "@/lib/format";
import { matchesStudentQuery } from "@/lib/search-utils";
import type { StudentRow } from "@/lib/types";

const ALERT_LABEL: Record<string, string> = {
  silent_decliner: "Silent decliner",
  lms_silent: "LMS silent 14+ days",
  core_attendance: "Core attendance < 65%",
  attendance_drop: "Attendance falling",
  backlogs: "2+ backlogs",
  no_mock: "No mock interview",
  assignments: "Assignments < 50%",
};

type Filters = {
  q: string;
  branch: string;
  year: string;
  section: string;
  mentor: string;
  academic: string;
  placement: string;
  persona: string;
  intent: string;
  alert: string;
  minScore: string;
  maxScore: string;
};

const ALL = "all";

export function StudentsTable({
  rows,
  personas,
  mentors,
  initial,
}: {
  rows: StudentRow[];
  personas: string[];
  mentors: { id: string; name: string }[];
  initial: Partial<Record<"academic" | "placement" | "alert" | "persona" | "q", string>>;
}) {
  const empty: Filters = {
    q: "",
    branch: ALL,
    year: ALL,
    section: ALL,
    mentor: ALL,
    academic: ALL,
    placement: ALL,
    persona: ALL,
    intent: ALL,
    alert: ALL,
    minScore: "",
    maxScore: "",
  };
  const [f, setF] = useState<Filters>({
    ...empty,
    q: initial.q ?? "",
    academic: initial.academic ?? ALL,
    placement: initial.placement ?? ALL,
    alert: initial.alert ?? ALL,
    persona: initial.persona ?? ALL,
  });
  const [sorting, setSorting] = useState<SortingState>([{ id: "priority", desc: true }]);
  const [visibility, setVisibility] = useState<VisibilityState>({ email: false, mentor_id: false, intent: false });

  const mentorName = useMemo(() => new Map(mentors.map((m) => [m.id, m.name])), [mentors]);
  const branches = useMemo(() => [...new Set(rows.map((r) => r.branch))].sort(), [rows]);
  const sections = useMemo(() => [...new Set(rows.map((r) => r.section))].sort(), [rows]);
  const mentorIds = useMemo(() => [...new Set(rows.map((r) => r.mentor_id).filter(Boolean))].sort() as string[], [rows]);

  const filtered = useMemo(() => {
    const q = f.q.trim();
    const min = f.minScore === "" ? -1 : Number(f.minScore);
    const max = f.maxScore === "" ? 101 : Number(f.maxScore);
    return rows.filter(
      (r) =>
        (!q || matchesStudentQuery(r.name, r.id, q)) &&
        (f.branch === ALL || r.branch === f.branch) &&
        (f.year === ALL || String(r.year) === f.year) &&
        (f.section === ALL || r.section === f.section) &&
        (f.mentor === ALL || r.mentor_id === f.mentor) &&
        (f.academic === ALL || r.academic_risk_level === f.academic) &&
        (f.placement === ALL || r.placement_risk_level === f.placement) &&
        (f.persona === ALL || r.persona === f.persona) &&
        (f.intent === ALL || r.intent === f.intent) &&
        (f.alert === ALL || r.alerts.some((a) => a.type === f.alert)) &&
        r.success_score >= min &&
        r.success_score <= max,
    );
  }, [rows, f]);

  const columns = useMemo<ColumnDef<StudentRow>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Student",
        cell: ({ row }) => (
          <Link href={`/students/${row.original.id}`} className="group block min-w-44">
            <span className="block font-medium group-hover:underline">{row.original.name}</span>
            <span className="block font-mono text-xs text-muted-foreground">{row.original.id}</span>
          </Link>
        ),
      },
      { id: "email", accessorKey: "email", header: "Email", cell: ({ getValue }) => <span className="text-xs">{maskEmail(getValue() as string)}</span> },
      {
        id: "group",
        accessorFn: (r) => `${r.branch} Y${r.year}-${r.section}`,
        header: "Class",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">
            {row.original.branch} <span className="text-muted-foreground">Y{row.original.year}-{row.original.section}</span>
          </span>
        ),
      },
      { id: "mentor_id", accessorKey: "mentor_id", header: "Mentor", cell: ({ getValue }) => <span className="text-sm">{mentorName.get(getValue() as string) ?? "-"}</span> },
      {
        id: "success_score",
        accessorKey: "success_score",
        header: "Score",
        cell: ({ getValue }) => <ScoreValue score={getValue() as number} />,
      },
      {
        id: "academic",
        accessorKey: "academic_risk_prob",
        header: "Academic risk",
        cell: ({ row }) => <RiskBadge level={row.original.academic_risk_level} prob={row.original.academic_risk_prob} />,
      },
      {
        id: "placement",
        accessorFn: (r) => r.placement_risk_prob ?? -1,
        header: "Placement risk",
        cell: ({ row }) =>
          row.original.placement_risk_level === "N/A" ? (
            <span className="text-xs text-muted-foreground">{INTENT_LABEL[row.original.intent] ?? "Not on track"}</span>
          ) : (
            <RiskBadge level={row.original.placement_risk_level} prob={row.original.placement_risk_prob} />
          ),
      },
      { id: "intent", accessorKey: "intent", header: "Intent", cell: ({ getValue }) => INTENT_LABEL[getValue() as string] ?? "-" },
      { id: "persona", accessorKey: "persona", header: "Segment", cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span> },
      {
        id: "alerts",
        accessorFn: (r) => r.alerts.length,
        header: "Alerts",
        cell: ({ row }) =>
          row.original.alerts.length ? (
            <span className="text-xs" title={row.original.alerts.map((a) => a.text).join("\n")}>
              {ALERT_LABEL[row.original.alerts[0].type] ?? row.original.alerts[0].type}
              {row.original.alerts.length > 1 && <span className="text-muted-foreground"> +{row.original.alerts.length - 1}</span>}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">None</span>
          ),
      },
      { id: "priority", accessorKey: "priority", header: "Priority", cell: ({ getValue }) => <span className="tabular text-sm">{(getValue() as number).toFixed(2)}</span> },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Link
              href={`/students/${row.original.id}/report`}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground/90 transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand"
              title="Generate Student 360 Report"
            >
              <FileText className="size-3 text-brand" />
              <span>Report</span>
            </Link>
          </div>
        ),
      },
    ],
    [mentorName],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  const activeFilters = Object.entries(f).filter(([k, v]) => v !== (empty as any)[k]);

  function exportCsv() {
    const header = ["roll_no", "name", "branch", "year", "section", "mentor", "success_score", "academic_risk", "academic_prob", "placement_risk", "placement_prob", "intent", "segment", "alerts"];
    const lines = table.getSortedRowModel().rows.map(({ original: r }) =>
      [r.id, r.name, r.branch, r.year, r.section, mentorName.get(r.mentor_id ?? "") ?? "", r.success_score, r.academic_risk_level, r.academic_risk_prob, r.placement_risk_level, r.placement_risk_prob ?? "", r.intent, r.persona, r.alerts.map((a) => a.type).join("|")]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ascora-students-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const sel = (key: keyof Filters, label: string, options: { v: string; l: string }[], width = "w-40") => (
    <Select value={f[key]} onValueChange={(v) => setF((p) => ({ ...p, [key]: v }))}>
      <SelectTrigger className={`${width} h-9`} aria-label={label}>
        <SelectValue placeholder={label}>{f[key] === ALL ? `${label}: all` : `${label}: ${options.find((o) => o.v === f[key])?.l ?? f[key]}`}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label}: all</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.v} value={o.v}>
            {o.l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  const risks = ["High", "Medium", "Low"].map((v) => ({ v, l: v }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={f.q}
              onChange={(e) => setF((p) => ({ ...p, q: e.target.value }))}
              placeholder="Search name or roll number"
              aria-label="Search students"
              className="h-9 pl-8"
            />
          </div>
          {sel("academic", "Academic risk", risks)}
          {sel("placement", "Placement risk", [...risks, { v: "N/A", l: "Not on placement track" }])}
          {sel("persona", "Segment", personas.map((p) => ({ v: p, l: p })), "w-56")}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sel("branch", "Branch", branches.map((b) => ({ v: b, l: b })))}
          {sel("year", "Year", [{ v: "2", l: "2nd year" }, { v: "3", l: "3rd year" }], "w-32")}
          {sel("section", "Section", sections.map((s) => ({ v: s, l: `Section ${s}` })), "w-32")}
          {mentorIds.length > 1 && sel("mentor", "Mentor", mentorIds.map((m) => ({ v: m, l: mentorName.get(m) ?? m })), "w-52")}
          {sel("intent", "Intent", Object.entries(INTENT_LABEL).map(([v, l]) => ({ v, l })))}
          {sel("alert", "Alert", Object.entries(ALERT_LABEL).map(([v, l]) => ({ v, l })), "w-48")}
          <div className="flex items-center gap-1.5">
            <Input
              inputMode="numeric"
              value={f.minScore}
              onChange={(e) => setF((p) => ({ ...p, minScore: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
              placeholder="Min"
              aria-label="Minimum score"
              className="h-9 w-16"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              inputMode="numeric"
              value={f.maxScore}
              onChange={(e) => setF((p) => ({ ...p, maxScore: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
              placeholder="Max"
              aria-label="Maximum score"
              className="h-9 w-16"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {activeFilters.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setF(empty)}>
                <FilterX className="size-4" /> Clear
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns3 className="size-4" /> Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllLeafColumns()
                  .filter((c) => c.id !== "name")
                  .map((c) => (
                    <DropdownMenuCheckboxItem key={c.id} checked={c.getIsVisible()} onCheckedChange={(v) => c.toggleVisibility(!!v)} onSelect={(e) => e.preventDefault()}>
                      {String(c.columnDef.header)}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="size-4" /> CSV
            </Button>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {filtered.length.toLocaleString("en-IN")} of {rows.length.toLocaleString("en-IN")} students
      </p>

      {filtered.length === 0 ? (
        <EmptyState icon={UsersRound} title="No students match these filters">
          Try removing the {activeFilters[activeFilters.length - 1]?.[0] ?? "last"} filter, or{" "}
          <button className="underline underline-offset-2" onClick={() => setF(empty)}>
            clear all filters
          </button>
          .
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="hover:bg-transparent">
                    {hg.headers.map((h) => (
                      <TableHead key={h.id} className="whitespace-nowrap">
                        {h.column.getCanSort() ? (
                          <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={h.column.getToggleSortingHandler()}>
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            <ArrowDownUp className={`size-3 ${h.column.getIsSorted() ? "text-foreground" : "opacity-40"}`} />
                          </button>
                        ) : (
                          flexRender(h.column.columnDef.header, h.getContext())
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
