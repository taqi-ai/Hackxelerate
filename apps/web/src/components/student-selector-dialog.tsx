"use client";

import { useState, useTransition, useEffect } from "react";
import { Check, Filter, Loader2, Search, UserCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectDemoStudentAction } from "@/app/(app)/actions";
import { play } from "@/lib/sound";

interface StudentSummary {
  id: string;
  name: string;
  branch: string;
  year: number;
  section: string;
}

const QUICK_PICKS: StudentSummary[] = [
  { id: "CU24AIML0001", name: "Daksh Bakshi", branch: "CSE-AIML", year: 3, section: "A" },
  { id: "CU24AIML0039", name: "Arjun Gupta", branch: "CSE-AIML", year: 3, section: "A" },
  { id: "CU24CSE0015", name: "Priya Sharma", branch: "CSE", year: 2, section: "B" },
  { id: "CU24ECE0008", name: "Rohan Verma", branch: "ECE", year: 4, section: "A" },
];

export function StudentSelectorDialog({
  currentStudentId,
  triggerText,
  triggerVariant = "outline",
}: {
  currentStudentId?: string;
  triggerText?: string;
  triggerVariant?: "default" | "outline" | "secondary";
}) {
  const defaultLabel = currentStudentId ? `Switch Profile (${currentStudentId})` : "Browse 1,200 Student Cohort...";
  const label = triggerText ?? defaultLabel;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("all");
  const [year, setYear] = useState<number | undefined>(undefined);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(currentStudentId || null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (branch !== "all") params.set("branch", branch);
        if (year) params.set("year", String(year));

        const res = await fetch(`/api/students/search?${params.toString()}`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (active) {
          setStudents(data.students || []);
        }
      } catch {
        if (active) setStudents(QUICK_PICKS);
      } finally {
        if (active) setLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query, branch, year]);

  function handleSelect(id: string) {
    setSelectedId(id);
    play("tap");
    startTransition(async () => {
      const res = await selectDemoStudentAction(id);
      if (res.ok) {
        play("success");
        setOpen(false);
        window.location.href = "/student";
      } else {
        play("error");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} className="press h-10 w-full rounded-xl text-sm font-medium">
          <UserCheck className="mr-2 size-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="font-display text-xl font-semibold">Select Demonstration Student</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose from the 1,200 synthetic student cohort. Each profile includes verified attendance, assessment marks, SGPA/CGPA, and model risk flags.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-6">
          {/* Quick Picks for Judges */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Recommended for evaluation</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {QUICK_PICKS.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleSelect(st.id)}
                  disabled={pending}
                  className="press rounded-xl border bg-card/60 p-2.5 text-left transition-colors hover:border-brand/40 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <p className="truncate text-xs font-semibold text-foreground">{st.name}</p>
                  <p className="font-mono text-[10px] text-brand">{st.id}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {st.branch} · Y{st.year}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="grid gap-2 sm:grid-cols-[1fr_140px_100px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by Roll ID or Name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 pl-9 text-xs"
              />
            </div>

            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="h-10 rounded-lg border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Branches</option>
              <option value="CSE">CSE</option>
              <option value="CSE-AIML">CSE-AIML</option>
              <option value="ECE">ECE</option>
              <option value="ME">ME</option>
              <option value="Civil">Civil</option>
            </select>

            <select
              value={year ? String(year) : "all"}
              onChange={(e) => setYear(e.target.value === "all" ? undefined : Number(e.target.value))}
              className="h-10 rounded-lg border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>
          </div>

          {/* Students Directory List */}
          <div className="max-h-[300px] overflow-y-auto rounded-xl border bg-muted/20">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : students.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center p-4 text-center">
                <Filter className="mb-2 size-6 text-muted-foreground/40" />
                <p className="text-xs font-medium">No matching students found</p>
                <p className="text-[11px] text-muted-foreground">Try adjusting your search query or filters.</p>
              </div>
            ) : (
              <div className="divide-y">
                {students.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <div>
                      <p className="text-xs font-semibold text-foreground">{st.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {st.id} · {st.branch} · Year {st.year} ({st.section})
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => handleSelect(st.id)}
                      className="press h-8 text-xs font-medium"
                    >
                      {pending && selectedId === st.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <>
                          <Check className="mr-1 size-3" />
                          Launch
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
