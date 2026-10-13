"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { play } from "@/lib/sound";
import { getPrefs } from "@/lib/prefs";

const QUICK = [
  { label: "HOD / Admin", email: "admin@ascora.test", hint: "Whole campus, data integration, models" },
  { label: "Faculty mentor", email: "mentor@ascora.test", hint: "Only their 64 assigned students" },
];
const SHARED_PASSWORD = "AscoraDemo#2026";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
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
        setError(error.message === "Invalid login credentials" ? "That email and password don't match an account. Check them, or pick an account below." : error.message);
        return;
      }
      play("success");
      router.replace(next && next.startsWith("/") && next !== "/" ? next : getPrefs().home);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" spellCheck={false} placeholder="name@college.edu…" required value={email} onChange={(e) => setEmail(e.target.value)} />
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
          {pending && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <div className="space-y-3">
        <p className="text-sm font-medium">Quick sign-in</p>
        <div className="grid gap-2">
          {QUICK.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => {
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
  );
}
