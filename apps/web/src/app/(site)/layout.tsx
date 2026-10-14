import Image from "next/image";
import Link from "next/link";
import { SiteNav } from "@/components/landing/nav";
import { SITE_LINKS } from "@/components/landing/site-links";
import { SoundLayer } from "@/components/sound";
import { getProfile } from "@/lib/data";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile().catch(() => null);
  return (
    <div className="dark grain min-h-[100dvh] overflow-x-clip bg-[#07070b] text-white [color-scheme:dark]">
      <a href="#content" className="sr-only z-50 rounded-md bg-white px-3 py-2 text-black focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <SiteNav signedIn={!!profile} />
      <SoundLayer />
      <main id="content">{children}</main>
      <footer className="border-t border-white/10">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Ascora home">
              <Image src="/assets/mark.png" alt="" width={24} height={20} className="h-5 w-6 object-contain" />
              <span className="font-display text-lg font-semibold">Ascora</span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-white/60">
              Student success intelligence for colleges. Built for KPMG in India&apos;s Smart Campus Analytics challenge at HacXLerate 2026.
            </p>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-white/80">Explore</p>
            <ul className="grid gap-2 text-sm text-white/60">
              {SITE_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-white/80">Product</p>
            <ul className="grid gap-2 text-sm text-white/60">
              <li>
                <Link href={profile ? "/overview" : "/login"} className="hover:text-white">
                  {profile ? "Open dashboard" : "Sign in"}
                </Link>
              </li>
              <li>
                <a href="https://github.com/taqi-ai/Hackxelerate" className="hover:text-white" rel="noreferrer" target="_blank">
                  Source code
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-white/5 px-4 py-6 text-xs text-white/60 sm:flex-row sm:justify-between sm:px-6">
          <span>The cohort shown is generated for this project. No real student data is used.</span>
          <span>Scores support mentors; they never replace their judgement.</span>
        </div>
      </footer>
    </div>
  );
}
