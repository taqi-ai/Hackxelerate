import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** "Need help?" prompt that points to Ask Ascora, with a small inline illustration. */
export function HelpCard() {
  return (
    <div className="edge relative overflow-hidden rounded-2xl border bg-gradient-to-br from-brand/15 via-card to-card p-5">
      <svg viewBox="0 0 120 90" className="pointer-events-none absolute -bottom-3 -right-3 h-24 w-32 text-brand opacity-90" aria-hidden>
        <rect x="18" y="14" width="72" height="44" rx="14" fill="currentColor" opacity="0.18" />
        <path d="M34 58 l-6 14 l16-14z" fill="currentColor" opacity="0.18" />
        <rect x="30" y="28" width="40" height="5" rx="2.5" fill="currentColor" opacity="0.55" />
        <rect x="30" y="39" width="26" height="5" rx="2.5" fill="currentColor" opacity="0.35" />
        <path d="M100 20 l2.5 6 l6 2.5 l-6 2.5 l-2.5 6 l-2.5-6 l-6-2.5 l6-2.5z" fill="currentColor" opacity="0.8" />
        <path d="M86 62 l1.6 3.8 l3.8 1.6 l-3.8 1.6 l-1.6 3.8 l-1.6-3.8 l-3.8-1.6 l3.8-1.6z" fill="currentColor" opacity="0.55" />
      </svg>
      <p className="font-display text-lg font-semibold">Need an answer fast?</p>
      <p className="mt-1 max-w-[15rem] text-sm text-muted-foreground">Ask in plain English, like &ldquo;ECE students with attendance under 70%&rdquo;.</p>
      <Link href="/ask" className="press mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Ask Ascora <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}
