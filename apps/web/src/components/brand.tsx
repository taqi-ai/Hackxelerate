import { cn } from "@/lib/utils";

/** Placeholder mark until the real logo arrives (ASSETS_NEEDED.md A-01). */
export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm"
      >
        A
      </span>
      {!compact && <span className="text-lg font-semibold tracking-tight">Ascora</span>}
    </div>
  );
}
