"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const axis = { stroke: "var(--muted-foreground)", fontSize: 12, tickLine: false, axisLine: false } as const;
const grid = { stroke: "var(--border)", strokeDasharray: "3 3", vertical: false } as const;

function TipBox({ active, payload, label, unit = "" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2 tabular">
          <span className="inline-block size-2 rounded-sm" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-medium">
            {typeof p.value === "number" ? p.value.toLocaleString("en-IN", { maximumFractionDigits: 1 }) : p.value}
            {unit}
          </span>
        </p>
      ))}
    </div>
  );
}

export function ScoreHistogram({ data }: { data: { bin: string; count: number; from: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid {...grid} />
        <XAxis dataKey="bin" {...axis} interval={1} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip content={<TipBox />} cursor={{ fill: "var(--accent)" }} />
        <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.bin} fill={d.from < 40 ? "var(--risk-high)" : d.from < 65 ? "var(--chart-1)" : "var(--risk-low)"} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RiskByGroup({ data, height = 240 }: { data: { group: string; Low: number; Medium: number; High: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }} barSize={16}>
        <CartesianGrid {...grid} horizontal={false} vertical />
        <XAxis type="number" {...axis} />
        <YAxis type="category" dataKey="group" {...axis} width={112} />
        <Tooltip content={<TipBox />} cursor={{ fill: "var(--accent)" }} />
        <Bar dataKey="High" stackId="r" fill="var(--risk-high)" name="High" />
        <Bar dataKey="Medium" stackId="r" fill="var(--risk-medium)" name="Medium" />
        <Bar dataKey="Low" stackId="r" fill="var(--risk-low)" fillOpacity={0.55} name="Low" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function WeeklyTrend({ data }: { data: { week: number; logins: number; completion: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid {...grid} />
        <XAxis dataKey="week" {...axis} tickFormatter={(w) => `W${w}`} />
        <YAxis yAxisId="l" {...axis} />
        <YAxis yAxisId="r" orientation="right" {...axis} domain={[40, 100]} hide />
        <Tooltip content={<TipBox />} labelFormatter={(w) => `Week ${w}`} />
        <ReferenceLine yAxisId="l" x={8} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: "Mid-sem", fontSize: 11, fill: "var(--muted-foreground)", position: "insideTopRight" }} />
        <Line yAxisId="l" dataKey="logins" name="Avg LMS logins / wk" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
        <Line yAxisId="r" dataKey="completion" name="Assignment completion %" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data, tone = "brand", height = 32 }: { data: { week: number; value: number }[]; tone?: "brand" | "high"; height?: number }) {
  const color = tone === "high" ? "var(--risk-high)" : "var(--chart-1)";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={`sp-${tone}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#sp-${tone})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TimelineChart({
  data,
  lines,
  height = 220,
  yDomain,
}: {
  data: Record<string, number | string | null>[];
  lines: { key: string; name: string; color: string; yAxis?: "l" | "r" }[];
  height?: number;
  yDomain?: [number, number];
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid {...grid} />
        <XAxis dataKey="x" {...axis} />
        <YAxis yAxisId="l" {...axis} domain={yDomain ?? ["auto", "auto"]} />
        <YAxis yAxisId="r" orientation="right" {...axis} hide />
        <Tooltip content={<TipBox />} />
        {lines.map((l) => (
          <Line key={l.key} yAxisId={l.yAxis ?? "l"} dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2} dot={{ r: 2 }} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ComponentRadar({ data, compare }: { data: { k: string; v: number; c?: number }[]; compare?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="k" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
        {compare && <Radar dataKey="c" name="Cohort median" stroke="var(--muted-foreground)" fill="var(--muted-foreground)" fillOpacity={0.08} strokeDasharray="4 4" />}
        <Radar dataKey="v" name="This student" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.22} strokeWidth={2} />
        <Tooltip content={<TipBox />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function HBar({ data, valueKey = "value", nameKey = "name", unit = "", height }: { data: any[]; valueKey?: string; nameKey?: string; unit?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(140, data.length * 30)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }} barSize={14}>
        <XAxis type="number" {...axis} hide />
        <YAxis type="category" dataKey={nameKey} {...axis} width={210} />
        <Tooltip content={<TipBox unit={unit} />} cursor={{ fill: "var(--accent)" }} />
        <Bar dataKey={valueKey} name="Value" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SimpleLine({ data, xKey, lines, height = 220, yDomain }: { data: any[]; xKey: string; lines: { key: string; name: string; color: string }[]; height?: number; yDomain?: [number, number] }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid {...grid} />
        <XAxis dataKey={xKey} {...axis} />
        <YAxis {...axis} domain={yDomain ?? ["auto", "auto"]} />
        <Tooltip content={<TipBox />} />
        {lines.map((l) => (
          <Line key={l.key} dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2} dot={{ r: 3 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
