import { redirect } from "next/navigation";
import { getProfile } from "@/lib/data";
import { AppSidebar, MobileNav } from "@/components/app-shell";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[248px_1fr]">
      <AppSidebar role={profile.role} />
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
          <MobileNav role={profile.role} />
          <div className="ml-auto flex items-center gap-1.5">
            <span className="hidden rounded-md border px-2 py-0.5 text-xs text-muted-foreground sm:inline">
              {profile.role === "admin" ? "Admin · whole campus" : `Mentor · ${profile.mentor_id}`}
            </span>
            <ThemeToggle />
            <UserMenu name={profile.full_name} email={profile.email} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
