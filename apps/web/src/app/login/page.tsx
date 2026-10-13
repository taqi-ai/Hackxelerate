import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { BrandMark } from "@/components/brand";
import { SoundLayer } from "@/components/sound";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-[100dvh] lg:grid-cols-[1.1fr_1fr]">
      <section className="grain relative hidden flex-col justify-between overflow-hidden bg-[#07070b] p-12 text-white lg:flex">
        <div aria-hidden className="pointer-events-none absolute -left-40 top-1/3 size-[620px] rounded-full bg-[radial-gradient(closest-side,oklch(0.8_0.07_272/0.18),transparent)] motion-safe:animate-[drift_14s_ease-in-out_infinite_alternate]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,oklch(1_0_0/0.035)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_30%_50%,black,transparent_70%)]" />
        <Image src="/assets/logo-dark.webp" alt="Ascora" width={1400} height={467} priority className="relative -ml-10 -mt-6 h-auto w-80" />
        <div className="relative max-w-md space-y-5">
          <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-[-0.03em] text-balance">From early warning to real intervention.</h1>
          <p className="text-base leading-relaxed text-white/70">
            Ascora joins ERP, attendance, LMS, placement, skills, clubs and feedback into one view of every student, explains who needs support and why,
            and tracks what mentors do about it.
          </p>
        </div>
        <ul className="relative grid max-w-md grid-cols-3 gap-6 text-sm">
          <li>
            <p className="font-medium">Explainable</p>
            <p className="text-white/60">Every score shows its drivers</p>
          </li>
          <li>
            <p className="font-medium">Two risks</p>
            <p className="text-white/60">Academic and placement, never blended</p>
          </li>
          <li>
            <p className="font-medium">Private</p>
            <p className="text-white/60">Role-based access, audited views</p>
          </li>
        </ul>
      </section>
      <section className="relative flex items-center justify-center overflow-hidden px-4 py-12 sm:px-8">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent)]" />
        <div className="edge relative w-full max-w-sm space-y-8 rounded-3xl border bg-card/70 p-7 shadow-[0_30px_80px_-30px_var(--glow)] backdrop-blur-xl sm:p-8">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-display text-3xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Use your college account. Access depends on your role.</p>
          </div>
          <LoginForm next={next} />
        </div>
      </section>
      <SoundLayer />
    </main>
  );
}
