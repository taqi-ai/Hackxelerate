"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Clock, Trash2, Calendar, Target, Award, BookOpen } from "lucide-react";
import type { StudentPlan } from "@/lib/types";
import { updateStudentPlanStatusAction, deleteStudentPlanAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { play } from "@/lib/sound";

export function PlanList({
  plans,
}: {
  plans: StudentPlan[];
  studentId?: string;
}) {
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filteredPlans = plans.filter((p) => {
    if (filter === "all") return true;
    return p.status === filter;
  });

  function handleToggleStatus(plan: StudentPlan) {
    play("tap");
    const nextStatus = plan.status === "completed" ? "active" : "completed";
    setPendingId(plan.id);
    startTransition(async () => {
      const res = await updateStudentPlanStatusAction(plan.id, nextStatus);
      if (res.ok) {
        play(nextStatus === "completed" ? "success" : "toggle");
      }
      setPendingId(null);
    });
  }

  function handleDelete(id: string) {
    play("tap");
    setPendingId(id);
    startTransition(async () => {
      const res = await deleteStudentPlanAction(id);
      if (res.ok) {
        play("soft");
      }
      setPendingId(null);
    });
  }

  const categoryIcons: Record<string, React.ReactNode> = {
    attendance: <Clock className="h-4 w-4 text-sky-500" />,
    marks: <Target className="h-4 w-4 text-emerald-500" />,
    cgpa: <Award className="h-4 w-4 text-violet-500" />,
    deadline: <Calendar className="h-4 w-4 text-amber-500" />,
    general: <BookOpen className="h-4 w-4 text-blue-500" />,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(["all", "active", "completed"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                play("tap");
                setFilter(tab);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                filter === tab
                  ? "bg-brand text-brand-foreground shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab} ({tab === "all" ? plans.length : plans.filter((p) => p.status === tab).length})
            </button>
          ))}
        </div>
      </div>

      {filteredPlans.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center bg-card/40">
          <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-foreground">No plans found in this view</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Use the calculators or target planner to set goals for attendance recovery, examination scores, and CGPA milestones.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPlans.map((plan) => {
            const isCompleted = plan.status === "completed";
            const isPending = pendingId === plan.id;

            return (
              <div
                key={plan.id}
                className={`rounded-xl border p-4 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                  isCompleted
                    ? "bg-muted/20 border-border opacity-70"
                    : "bg-card hover:border-brand/30 shadow-xs"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(plan)}
                    disabled={isPending}
                    className="mt-0.5 text-muted-foreground hover:text-brand transition-colors shrink-0"
                    title={isCompleted ? "Mark active" : "Mark completed"}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {plan.title}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted border text-muted-foreground capitalize">
                        {categoryIcons[plan.category] ?? <BookOpen className="h-3 w-3" />}
                        {plan.category}
                      </span>
                      {plan.due_date && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                          <Calendar className="h-3 w-3" /> Due {plan.due_date}
                        </span>
                      )}
                    </div>

                    {plan.notes && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {plan.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(plan.id)}
                    disabled={isPending}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500"
                    title="Delete plan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
