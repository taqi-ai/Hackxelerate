import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { BrandMark } from "@/components/brand";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-[100dvh] lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r bg-sidebar p-12 lg:flex">
        <BrandMark />
        <div className="max-w-md space-y-5">
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-balance">
            From early warning to real intervention.
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Ascora joins ERP, attendance, LMS, placement, skills, clubs and feedback into one view of every student, explains
            who needs support and why, and tracks what mentors do about it.
          </p>
        </div>
        <ul className="grid max-w-md grid-cols-3 gap-6 text-sm">
          <li>
            <p className="font-medium">Explainable</p>
            <p className="text-muted-foreground">Every score shows its drivers</p>
          </li>
          <li>
            <p className="font-medium">Two risks</p>
            <p className="text-muted-foreground">Academic and placement, never blended</p>
          </li>
          <li>
            <p className="font-medium">Private</p>
            <p className="text-muted-foreground">Role-based access, audited views</p>
          </li>
        </ul>
        {/* ASSET A-04: login page visual (see ASSETS_NEEDED.md) */}
      </section>
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">Use your college account. Access depends on your role.</p>
          </div>
          <LoginForm next={next} />
        </div>
      </section>
    </main>
  );
}
