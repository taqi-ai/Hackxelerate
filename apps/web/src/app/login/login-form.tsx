"use client";

import { useState, useTransition } from "react";
import {
  ExternalLink,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { play } from "@/lib/sound";
import { getPrefs } from "@/lib/prefs";
import { StudentSelectorDialog } from "@/components/student-selector-dialog";
import { ManualImportDialog } from "@/components/manual-import-dialog";
import { selectDemoStudentAction } from "@/app/(app)/actions";

const QUICK = [
  { label: "HOD / Admin", email: "admin@ascora.test", hint: "Whole campus, data integration, models" },
  { label: "Faculty mentor", email: "mentor@ascora.test", hint: "Only their 64 assigned students" },
];
const SHARED_PASSWORD = "AscoraDemo#2026";

const STUDENT_QUICK_PICKS = [
  { id: "CU24AIML0001", name: "Daksh Bakshi", branch: "CSE-AIML", year: 3 },
  { id: "CU24AIML0039", name: "Arjun Gupta", branch: "CSE-AIML", year: 3 },
];

export function LoginForm({ next }: { next?: string }) {
  const [tab, setTab] = useState<"institutional" | "student">("institutional");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      play("error");
      setError("Enter your email and password, or pick an account below.");
      return;
    }
    start(async () => {
      const { error } = await createClient().auth.signInWithPassword({ email, password });
      if (error) {
        play("error");
        setError(
          error.message === "Invalid login credentials"
            ? "That email and password do not match an account. Check them, or pick an account below."
            : error.message
        );
        return;
      }
      // first sign-in of an invited person: turn the pending invite into their profile (no-op otherwise)
      await createClient().rpc("claim_invite").then(() => undefined, () => undefined);
      play("success");
      const { exitDemoStudentAction } = await import("@/app/(app)/actions");
      await exitDemoStudentAction();
      const dest = next && next.startsWith("/") && next !== "/" ? next : getPrefs().home;
      window.location.href = dest;
    });
  }

  function handleDemoStudentPick(studentId: string) {
    play("tap");
    start(async () => {
      const res = await selectDemoStudentAction(studentId);
      if (res.ok) {
        play("success");
        window.location.href = "/student";
      } else {
        play("error");
        setError(res.error || "Could not open the student view. Try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Role Navigation Tab Switcher */}
      <div className="grid grid-cols-2 gap-1 rounded-xl border bg-muted/40 p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => {
            play("toggle");
            setTab("institutional");
          }}
          className={`press flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
            tab === "institutional"
              ? "bg-background font-semibold text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <KeyRound className="size-3.5" />
          Faculty & Admin
        </button>
        <button
          type="button"
          onClick={() => {
            play("toggle");
            setTab("student");
          }}
          className={`press flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
            tab === "student"
              ? "bg-background font-semibold text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <GraduationCap className="size-3.5" />
          Student Login
        </button>
      </div>

      {tab === "institutional" ? (
        <div className="space-y-6">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="name@college.edu..."
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="press h-11 w-full rounded-xl text-[15px]" disabled={pending}>
              {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Sign in
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Invited by your institution?{" "}
              <a href="/join" className="font-medium text-foreground underline-offset-4 hover:underline">Create your account</a>
            </p>
          </form>

          <div className="space-y-3">
            <p className="text-sm font-medium">Quick sign-in</p>
            <div className="grid gap-2">
              {QUICK.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => {
                    play("tap");
                    setEmail(d.email);
                    setPassword(SHARED_PASSWORD);
                  }}
                  className="press rounded-xl border bg-background/50 px-3.5 py-2.5 text-left hover:border-ring/40 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="block text-sm font-medium">{d.label}</span>
                  <span className="block text-xs text-muted-foreground">{d.hint}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Shared password: <span className="font-mono">{SHARED_PASSWORD}</span>. Pick a role to fill the form, then sign in.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Option A: Demo Student */}
          <div className="rounded-2xl border bg-card/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center rounded-full border bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                Student view
              </span>
              <span className="text-[11px] text-muted-foreground">1,200 Cohort</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Students</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Explore personalized academic, attendance, marks, and What-If planning for students in the 1,200-student cohort.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {STUDENT_QUICK_PICKS.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleDemoStudentPick(st.id)}
                  disabled={pending}
                  className="press rounded-lg border bg-background/60 p-2 text-left hover:border-brand/40 hover:bg-accent/40"
                >
                  <p className="truncate text-xs font-medium">{st.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{st.id}</p>
                </button>
              ))}
            </div>

            <div className="pt-1">
              <StudentSelectorDialog triggerText="Search Full 1,200 Cohort..." triggerVariant="default" />
            </div>
          </div>

          {/* Option B: Connect CU Lucknow Portal */}
          <div className="rounded-2xl border bg-card/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center rounded-full border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Option B · External Integration
              </span>
              <span className="text-[11px] text-muted-foreground">CUIMS</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Connect CU Lucknow Portal</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect directly with the Chandigarh University student portal at <span className="font-mono text-foreground">student.culko.in</span>.
              </p>
            </div>

            <div className="rounded-xl border bg-muted/30 p-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
              <Lock className="size-3.5 shrink-0 mt-0.5 text-brand" />
              <span>
                University policy requires direct authentication with anti-bot verification. Ascora preserves official security and never intercepts credentials.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href="https://student.culko.in/Login.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex h-10 items-center justify-center rounded-xl border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent hover:border-ring/40"
              >
                <ExternalLink className="mr-1.5 size-3.5" />
                Open Portal
              </a>
              <ManualImportDialog triggerText="Manual Import" triggerVariant="outline" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
