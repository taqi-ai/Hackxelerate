import Image from "next/image";
import { cn } from "@/lib/utils";

/** The Ascora mark on a dark tile (assets/brand/ascora-mark.png, supplied by the team). */
export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#07070b] shadow-sm ring-1 ring-black/10 dark:ring-white/10">
        <Image src="/assets/mark.png" alt="" width={20} height={16} className="h-4 w-5 object-contain" priority />
      </span>
      {!compact && <span className="text-lg font-semibold tracking-tight">Ascora</span>}
    </div>
  );
}
