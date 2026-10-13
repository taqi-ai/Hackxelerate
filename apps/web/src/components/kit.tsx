import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { riskTone, scoreTone } from "@/lib/format";
import { CountUp } from "@/components/motion";

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-[2.1rem] sm:leading-[1.1]">{title}</h1>
        {description && <p className="max-w-[70ch] text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function RiskBadge({ level, prob, label }: { level: string; prob?: number | null; label?: string }) {
  const text = level === "N/A" ? "Not on placement track" : `${label ? `${label} ` : ""}${level}`;
  return (
    <span
      className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset", riskTone(level))}
      title={prob !== undefined && prob !== null ? `Estimated probability ${(prob * 100).toFixed(0)}%` : undefined}
    >
      {text}
      {prob !== undefined && prob !== null && level !== "N/A" && <span className="tabular opacity-75">{(prob * 100).toFixed(0)}%</span>}
    </span>
  );
}

export function ScoreValue({ score, className }: { score: number; className?: string }) {
  return <span className={cn("tabular font-semibold", scoreTone(score), className)}>{score.toFixed(0)}</span>;
}

export function Stat({
  label,
  value,
  decimals = 0,
  hint,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: React.ReactNode | number;
  decimals?: number;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "high" | "medium" | "low" | "brand";
  href?: string;
}) {
  const toneCls =
    tone === "high" ? "text-risk-high" : tone === "medium" ? "text-risk-medium" : tone === "low" ? "text-risk-low" : tone === "brand" ? "text-brand" : "";
  const glow =
    tone === "high" ? "var(--risk-high)" : tone === "medium" ? "var(--risk-medium)" : tone === "low" ? "var(--risk-low)" : "var(--brand)";
  const body = (
    <div className="edge group relative flex h-full flex-col gap-2 overflow-hidden rounded-2xl border bg-card/80 p-4 backdrop-blur-sm transition-[transform,box-shadow] duration-300 group-hover:-translate-y-0.5">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-60"
        style={{ background: `color-mix(in oklch, ${glow} 40%, transparent)` }}
      />
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        {Icon && <Icon className="size-4" strokeWidth={1.75} aria-hidden />}
      </div>
      <div className={cn("tabular font-display text-[2rem] font-semibold leading-none tracking-tight", toneCls)}>
        {typeof value === "number" ? <CountUp value={value} decimals={decimals} /> : value}
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </Link>
  ) : (
    <div className="group h-full">{body}</div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("edge gap-4 rounded-2xl bg-card/80 backdrop-blur-sm", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="font-display text-[1.05rem] font-semibold tracking-tight">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon?: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
      {Icon && <Icon className="size-6 text-muted-foreground" strokeWidth={1.5} />}
      <p className="font-medium">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

/** Small horizontal meter WITHOUT a filled background track (data, not decoration). */
export function Meter({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-block h-1.5 w-16 align-middle", className)} aria-hidden>
      <span className="block h-full rounded-full bg-brand/70" style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </span>
  );
}
