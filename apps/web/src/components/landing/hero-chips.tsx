import { CalendarDays, Layers, Sparkles } from "lucide-react";

const glass =
  "absolute hidden rounded-2xl border border-white/10 bg-[oklch(0.17_0.01_275/0.7)] px-3.5 py-2.5 text-xs text-white/80 shadow-[0_20px_50px_-20px_oklch(0.8_0.07_272/0.45)] backdrop-blur-xl lg:flex lg:items-center lg:gap-2.5 motion-safe:animate-[float_7s_ease-in-out_infinite]";

/** Small floating glass chips around the hero visual. Decorative: they restate what the visual shows. */
export function HeroChips() {
  return (
    <div aria-hidden>
      <div className={`${glass} -left-6 -top-20`}>
        <span className="grid size-7 place-items-center rounded-lg bg-[oklch(0.8_0.07_272/0.18)] text-[oklch(0.85_0.08_272)]">
          <Layers className="size-3.5" />
        </span>
        <span>
          <span className="block font-medium text-white">7 sources, 1 record</span>
          <span className="text-white/50">Matched and de-duplicated</span>
        </span>
      </div>
      <div className={`${glass} -bottom-20 left-28 [animation-delay:-2.5s]`}>
        <span className="grid size-7 place-items-center rounded-lg bg-[oklch(0.72_0.12_162/0.2)] text-[oklch(0.85_0.1_162)]">
          <CalendarDays className="size-3.5" />
        </span>
        <span>
          <span className="block font-medium text-white">Check-in booked</span>
          <span className="text-white/50">Owner, due date, follow-up</span>
        </span>
      </div>
      <div className={`${glass} -right-6 -top-10 [animation-delay:-4.5s]`}>
        <span className="grid size-7 place-items-center rounded-lg bg-[oklch(0.7_0.13_320/0.2)] text-[oklch(0.85_0.09_320)]">
          <Sparkles className="size-3.5" />
        </span>
        <span>
          <span className="block font-medium text-white">Ask Ascora</span>
          <span className="text-white/50">&ldquo;Who slipped after midterms?&rdquo;</span>
        </span>
      </div>
    </div>
  );
}
