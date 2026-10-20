import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Create your account" };

export default function JoinPage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-3">
          <BrandMark />
          <h1 className="font-display text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            For people invited by their institution&apos;s admin. Use the email address the invite was made for. Without an invite, the account sees nothing.
          </p>
        </div>
        <JoinForm />
        <p className="text-sm text-muted-foreground">
          Already have an account? <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
