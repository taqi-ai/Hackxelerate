import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { getMentors, getProfile } from "@/lib/data";
import { OFFLINE } from "@/lib/offline";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader, Panel } from "@/components/kit";
import { AccountsClient, type Account, type Invite } from "./accounts-client";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const profile = await getProfile();
  if (profile?.role !== "admin") redirect("/overview");

  const header = (
    <PageHeader
      title="Accounts"
      description="Invite mentors, admins and students of your institution, and deactivate accounts when people leave. Access ends on their next request."
    />
  );
  if (OFFLINE) {
    return (
      <>
        {header}
        <Panel title="Not available offline">
          <EmptyState icon={KeyRound} title="Account management needs the live database">
            This copy runs on the offline snapshot, which has no user accounts.
          </EmptyState>
        </Panel>
      </>
    );
  }

  const supabase = await createClient();
  const [accounts, invites, mentors] = await Promise.all([
    supabase.rpc("list_accounts"),
    supabase
      .from("account_invites")
      .select("id, email, full_name, role, mentor_id, student_id, created_at, expires_at")
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    getMentors(),
  ]);
  const me = (accounts.data as Account[] | null)?.find((a) => a.id === profile.id);

  return (
    <>
      {header}
      <AccountsClient
        meId={profile.id}
        canManage={!!me && !me.shared_demo}
        accounts={(accounts.data as Account[] | null) ?? []}
        invites={(invites.data as Invite[] | null) ?? []}
        mentors={mentors.map((m) => ({ id: m.id, name: m.name }))}
        loadError={accounts.error ? "Accounts could not be loaded. Refresh to try again." : null}
      />
    </>
  );
}
