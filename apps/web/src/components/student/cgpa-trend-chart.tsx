"use client";

import { useState, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { play } from "@/lib/sound";

export function CGPATrendChart({
  sgpaHistory,
  onSelectSemester,
  selectedSemester,
}: {
  sgpaHistory: Record<string, number>;
  currentCGPA?: number;
  onSelectSemester?: (sem: number | null) => void;
  selectedSemester?: number | null;
}) {
  const semesters = useMemo(() => {
    const keys = Object.keys(sgpaHistory).sort((a, b) => Number(a) - Number(b));
    let runningSum = 0;

    return keys.map((k, idx) => {
      const semNum = Number(k);
      const sgpa = Number(sgpaHistory[k]);
      runningSum += sgpa;
      const cgpa = Number((runningSum / (idx + 1)).toFixed(2));
      return {
        sem: semNum,
        sgpa,
        cgpa,
      };
    });
  }, [sgpaHistory]);

  const [activeHover, setActiveHover] = useState<number | null>(null);

  if (semesters.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground bg-card/40">
        No completed semester records available to plot CGPA trajectory.
      </div>
    );
  }

  // Chart coordinate mapping
  const width = 600;
  const height = 180;
  const paddingX = 45;
  const paddingY = 25;
  const minVal = 4.0;
  const maxVal = 10.0;

  const getX = (index: number) => {
    if (semesters.length === 1) return width / 2;
    return paddingX + (index / (semesters.length - 1)) * (width - 2 * paddingX);
  };

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return height - paddingY - ((clamped - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);
  };

  // Build SVG path points
  const cgpaPoints = semesters.map((s, i) => `${getX(i)},${getY(s.cgpa)}`).join(" ");
  const sgpaPoints = semesters.map((s, i) => `${getX(i)},${getY(s.sgpa)}`).join(" ");

  const areaPoints = semesters.length > 1
    ? `${getX(0)},${height - paddingY} ${cgpaPoints} ${getX(semesters.length - 1)},${height - paddingY}`
    : "";

  return (
    <div className="rounded-xl border bg-card/70 p-4 shadow-xs backdrop-blur-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div>
          <span className="text-[10px] font-semibold text-brand tracking-wider uppercase block">
            Multi-Semester Trajectory
          </span>
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-brand" />
            <span>SGPA vs Cumulative CGPA Trend</span>
          </h4>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="h-2 w-2 rounded-full bg-brand" />
            <span className="text-foreground font-semibold">Cumulative CGPA</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="h-2 w-2 rounded-full bg-chart-2 border border-chart-2" />
            <span className="text-muted-foreground">Semester SGPA</span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 select-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="cgpaGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Reference grid lines */}
          {[6.0, 7.5, 9.0].map((level) => (
            <g key={level}>
              <line
                x1={paddingX}
                y1={getY(level)}
                x2={width - paddingX}
                y2={getY(level)}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeDasharray="4 4"
              />
              <text
                x={paddingX - 8}
                y={getY(level) + 3}
                fill="currentColor"
                opacity="0.4"
                fontSize="9"
                textAnchor="end"
                fontFamily="monospace"
              >
                {level.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Area fill for cumulative CGPA */}
          {areaPoints && (
            <polygon points={areaPoints} fill="url(#cgpaGlow)" />
          )}

          {/* SGPA Dashed line */}
          {semesters.length > 1 && (
            <polyline
              points={sgpaPoints}
              fill="none"
              stroke="var(--chart-2)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.75"
            />
          )}

          {/* Cumulative CGPA Solid line */}
          {semesters.length > 1 && (
            <polyline
              points={cgpaPoints}
              fill="none"
              stroke="var(--brand)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data point dots */}
          {semesters.map((s, idx) => {
            const x = getX(idx);
            const yCGPA = getY(s.cgpa);
            const ySGPA = getY(s.sgpa);
            const isHovered = activeHover === s.sem;
            const isSelected = selectedSemester === s.sem;

            return (
              <g key={s.sem}>
                {/* SGPA node */}
                <circle
                  cx={x}
                  cy={ySGPA}
                  r="3.5"
                  fill="var(--background)"
                  stroke="var(--chart-2)"
                  strokeWidth="1.5"
                  opacity="0.8"
                />

                {/* CGPA node */}
                <circle
                  cx={x}
                  cy={yCGPA}
                  r={isHovered || isSelected ? "6" : "4.5"}
                  fill="var(--brand)"
                  stroke="var(--background)"
                  strokeWidth="2"
                  className="transition-all cursor-pointer"
                  onMouseEnter={() => setActiveHover(s.sem)}
                  onMouseLeave={() => setActiveHover(null)}
                  onClick={() => {
                    play("tap");
                    onSelectSemester?.(selectedSemester === s.sem ? null : s.sem);
                  }}
                />

                {/* X-axis label */}
                <text
                  x={x}
                  y={height - 6}
                  fill="currentColor"
                  opacity={isSelected ? "1" : "0.6"}
                  fontSize="10"
                  fontWeight={isSelected ? "bold" : "normal"}
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  Sem {s.sem}
                </text>

                {/* Hover value tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x={x - 45}
                      y={Math.min(yCGPA, ySGPA) - 34}
                      width="90"
                      height="26"
                      rx="6"
                      fill="var(--background)"
                      stroke="var(--border)"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={Math.min(yCGPA, ySGPA) - 17}
                      fill="currentColor"
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      SGPA: {s.sgpa} · CGPA: {s.cgpa}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Semester Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50 text-xs">
        <span className="text-muted-foreground text-[11px]">
          Filter course transcript by semester:
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              play("tap");
              onSelectSemester?.(null);
            }}
            className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors ${
              selectedSemester === null || selectedSemester === undefined
                ? "bg-brand text-brand-foreground font-semibold"
                : "border bg-muted/30 text-muted-foreground hover:bg-muted"
            }`}
          >
            All Semesters
          </button>
          {semesters.map((s) => (
            <button
              key={s.sem}
              type="button"
              onClick={() => {
                play("tap");
                onSelectSemester?.(selectedSemester === s.sem ? null : s.sem);
              }}
              className={`px-2 py-1 rounded-md font-mono text-[11px] transition-colors ${
                selectedSemester === s.sem
                  ? "bg-brand text-brand-foreground font-semibold"
                  : "border bg-muted/30 text-muted-foreground hover:bg-muted"
              }`}
            >
              Sem {s.sem} ({s.sgpa.toFixed(1)})
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
