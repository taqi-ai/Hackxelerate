"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const DEMO = [
  { label: "HOD / Admin", email: "admin@ascora.test", hint: "Whole campus, data integration, models" },
  { label: "Faculty mentor", email: "mentor@ascora.test", hint: "Only their 64 assigned students" },
];
const DEMO_PASSWORD = "AscoraDemo#2026";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const { error } = await createClient().auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message === "Invalid login credentials" ? "That email and password don't match an account." : error.message);
        return;
      }
      router.replace(next && next.startsWith("/") ? next : "/");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
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
        <Button type="submit" className="w-full" disabled={pending || !email || !password}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <div className="space-y-3">
        <p className="text-sm font-medium">Demo accounts</p>
        <div className="grid gap-2">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => {
                setEmail(d.email);
                setPassword(DEMO_PASSWORD);
              }}
              className="rounded-lg border bg-card px-3.5 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring active:translate-y-px"
            >
              <span className="block text-sm font-medium">{d.label}</span>
              <span className="block text-xs text-muted-foreground">{d.hint}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Demo password: <span className="font-mono">{DEMO_PASSWORD}</span>. All data in this demo is synthetic.
        </p>
      </div>
    </div>
  );
}
