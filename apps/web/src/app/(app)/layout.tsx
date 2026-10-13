import { redirect } from "next/navigation";
import { getProfile } from "@/lib/data";
import { AppSidebar, MobileNav, SearchButton } from "@/components/app-shell";
import { CommandPalette } from "@/components/command-palette";
import { SoundLayer, SoundToggle } from "@/components/sound";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[260px_1fr]">
      <a href="#main" className="sr-only z-50 rounded-md bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <AppSidebar role={profile.role} name={profile.full_name} />
      <div className="relative flex min-w-0 flex-col">
        {/* ambient brand glow behind the content */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_50%_0%,var(--glow),transparent)]" />
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/70 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55 sm:px-6">
          <MobileNav role={profile.role} />
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-1 hidden rounded-full border bg-background/60 px-2.5 py-0.5 text-xs text-muted-foreground sm:inline">
              {profile.role === "admin" ? "Admin · whole campus" : `Mentor · ${profile.mentor_id}`}
            </span>
            <SearchButton />
            <SoundToggle />
            <ThemeToggle />
            <UserMenu name={profile.full_name} email={profile.email} />
          </div>
        </header>
        <main id="main" className="relative mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
      <CommandPalette role={profile.role} />
      <SoundLayer />
    </div>
  );
}
