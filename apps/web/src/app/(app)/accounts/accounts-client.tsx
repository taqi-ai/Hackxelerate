"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Lock, MailPlus, UserCheck, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, Panel } from "@/components/kit";
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
import { play } from "@/lib/sound";
import { inviteAccountAction, revokeInviteAction, setAccountDisabledAction } from "./actions";

export type Account = {
  id: string; full_name: string; role: "admin" | "mentor" | "student"; mentor_id: string | null; student_id: string | null;
  email: string; disabled_at: string | null; shared_demo: boolean; created_at: string;
};
export type Invite = {
  id: string; email: string; full_name: string; role: Account["role"]; mentor_id: string | null; student_id: string | null;
  created_at: string; expires_at: string;
};

const ROLE_LABEL: Record<Account["role"], string> = { admin: "Admin", mentor: "Mentor", student: "Student" };
const SELECT = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function AccountsClient({ meId, canManage, accounts, invites, mentors, loadError }: {
  meId: string; canManage: boolean; accounts: Account[]; invites: Invite[]; mentors: { id: string; name: string }[]; loadError: string | null;
}) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ email: "", fullName: "", role: "mentor" as Account["role"], mentorId: "", studentId: "" });
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, done: string, after?: () => void) {
    start(async () => {
      const res = await fn();
      if (res.ok) {
        play("success");
        toast.success(done);
        after?.();
      } else {
        play("error");
        toast.error(res.error ?? "Something went wrong");
      }
    });
  }

  function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await inviteAccountAction(form);
      if (!res.ok) {
        play("error");
        setError(res.error);
        return;
      }
      play("success");
      toast.success(`Invite created for ${form.email}`);
      setForm((f) => ({ ...f, email: "", fullName: "", studentId: "" }));
    });
  }

  return (
    <div className="grid gap-6">
      {!canManage && (
        <p className="flex items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" /> You are signed in with a shared evaluation account, so this page is read-only and email addresses are masked. Personal admin accounts can invite and deactivate people.
        </p>
      )}
      {loadError && <p className="text-sm text-destructive" role="alert">{loadError}</p>}

      <Panel title="Invite someone" description="They create their account with this exact email address. The invite turns into access only after they confirm the address. Invites expire after 14 days.">
        <form onSubmit={invite} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="inv-email">Email</Label>
            <Input id="inv-email" type="email" autoComplete="off" spellCheck={false} disabled={!canManage} value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@college.edu" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="inv-name">Full name</Label>
            <Input id="inv-name" autoComplete="off" disabled={!canManage} value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="inv-role">Role</Label>
            <select id="inv-role" className={SELECT} disabled={!canManage} value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Account["role"] })}>
              <option value="mentor">Mentor (sees their assigned students)</option>
              <option value="student">Student (sees only their own record)</option>
              <option value="admin">Admin (whole institution)</option>
            </select>
          </div>
          {form.role === "mentor" && (
            <div className="grid gap-2">
              <Label htmlFor="inv-mentor">Mentor record</Label>
              <select id="inv-mentor" className={SELECT} disabled={!canManage} value={form.mentorId}
                onChange={(e) => setForm({ ...form, mentorId: e.target.value })}>
                <option value="">Choose a mentor</option>
                {mentors.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.id})</option>)}
              </select>
            </div>
          )}
          {form.role === "student" && (
            <div className="grid gap-2">
              <Label htmlFor="inv-student">Roll number</Label>
              <Input id="inv-student" autoComplete="off" spellCheck={false} disabled={!canManage} value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: e.target.value })} placeholder="CU24CSE0001" />
            </div>
          )}
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={!canManage || pending}>
              {pending ? <Loader2 className="animate-spin" /> : <MailPlus />} Create invite
            </Button>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Ascora does not send the email itself: tell the person to open <span className="font-mono">/join</span> and sign up with this address.
          </p>
        </form>
      </Panel>

      <Panel title={`Pending invites (${invites.length})`}>
        {invites.length === 0 ? (
          <EmptyState icon={MailPlus} title={canManage ? "No pending invites" : "Hidden for shared accounts"} />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Expires</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {invites.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs">{i.email}</TableCell>
                  <TableCell>{i.full_name}</TableCell>
                  <TableCell>{ROLE_LABEL[i.role]} {i.mentor_id ?? i.student_id ?? ""}</TableCell>
                  <TableCell className="tabular">{fmtDate(i.expires_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" disabled={!canManage || pending}
                      onClick={() => run(() => revokeInviteAction(i.id), `Invite for ${i.email} revoked`)}>Revoke</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <Panel title={`Accounts (${accounts.length})`} description="Deactivating keeps the person's history and audit trail but ends all access.">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {accounts.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.full_name}{a.id === meId && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</TableCell>
                <TableCell className="font-mono text-xs">{a.email}</TableCell>
                <TableCell>{ROLE_LABEL[a.role]} {a.mentor_id ?? a.student_id ?? ""}{a.shared_demo && <Badge variant="outline" className="ml-1">shared</Badge>}</TableCell>
                <TableCell>{a.disabled_at ? <Badge variant="destructive">Deactivated</Badge> : <Badge variant="secondary">Active</Badge>}</TableCell>
                <TableCell className="text-right">
                  {a.id !== meId && (
                    <Button size="sm" variant="ghost" disabled={!canManage || pending}
                      onClick={() => run(() => setAccountDisabledAction(a.id, !a.disabled_at), a.disabled_at ? `${a.full_name} reactivated` : `${a.full_name} deactivated`)}>
                      {a.disabled_at ? <><UserCheck /> Reactivate</> : <><UserX /> Deactivate</>}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </div>
  );
}
