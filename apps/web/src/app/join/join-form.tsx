"use client";

import { useState, useTransition } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { play } from "@/lib/sound";

export function JoinForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError("Enter the email address your invite was made for.");
    if (password.length < 10) return setError("Use at least 10 characters for your password.");
    if (password !== confirm) return setError("The two passwords do not match.");
    start(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      });
      if (error) {
        play("error");
        setError(/not allowed|disabled/i.test(error.message) ? "Account creation is not open on this deployment yet. Ask your institution's admin." : error.message);
        return;
      }
      if (data.session) {
        // only happens if "Confirm email" is off in Supabase Auth, which proves nothing about the address; that setting
        // must stay on (docs/engineering/RELEASE_READINESS.md), so do not apply the invite from here
        await supabase.auth.signOut();
        setError("This deployment does not confirm email addresses, so invites cannot be applied. Ask your admin.");
        return;
      }
      play("success");
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="flex gap-3 rounded-xl border bg-muted/40 p-4 text-sm" role="status">
        <MailCheck className="size-5 shrink-0 text-brand" />
        <p>Check <span className="font-medium">{email}</span> for a confirmation link. After confirming, sign in: your invite is applied on your first sign-in.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="join-email">Email</Label>
        <Input id="join-email" type="email" autoComplete="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="join-password">Password</Label>
        <Input id="join-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="join-confirm">Confirm password</Label>
        <Input id="join-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Create account
      </Button>
    </form>
  );
}
