import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { BrandMark } from "@/components/brand";
import { SoundLayer } from "@/components/sound";
import { LoginPerspectiveStage } from "./login-perspective-stage";
import { LoginBrandSection } from "./login-brand-section";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-[100dvh] lg:grid-cols-[1.1fr_1fr]">
      {/* 3D-Enhanced Brand Showcase Left Column */}
      <LoginBrandSection />

      {/* 3D Interactive Perspective Tilt Login Form Right Column */}
      <section className="relative flex items-center justify-center overflow-hidden px-4 py-12 sm:px-8">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent)]" />
        <LoginPerspectiveStage>
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-display text-3xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Use your college account. Access depends on your role.</p>
          </div>
          <LoginForm next={next} />
        </LoginPerspectiveStage>
      </section>
      <SoundLayer />
    </main>
  );
}
