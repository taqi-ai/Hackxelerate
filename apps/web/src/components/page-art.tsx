/**
 * Small decorative illustrations for page headers. Every colour is a theme token (brand, chart, card),
 * so the art re-tints itself in day and night mode with no extra code.
 */
type Kind = "bars" | "orbit" | "nodes" | "grid" | "shield" | "chat" | "calendar" | "stack";

const KIND: Record<string, Kind> = {
  "Who to meet this week": "calendar",
  Students: "orbit",
  Segments: "nodes",
  Interventions: "bars",
  "Ask Ascora": "chat",
  "Data integration": "stack",
  "Score and models": "grid",
  "Score & models": "grid",
  "Fairness & privacy": "shield",
  Settings: "grid",
  "Student Overview": "orbit",
  "My Academics": "bars",
  "Plan & Improve": "grid",
  "Schedule & Tasks": "calendar",
  "Data & Portal": "stack",
};

export function artFor(title: string): Kind {
  return KIND[title] ?? "orbit";
}

const b = (o: number) => `color-mix(in oklch, var(--brand) ${o}%, transparent)`;
const c = (n: number, o: number) => `color-mix(in oklch, var(--chart-${n}) ${o}%, transparent)`;

export function PageArt({ kind }: { kind: Kind }) {
  return (
    <svg viewBox="0 0 220 120" className="h-full w-full" fill="none" aria-hidden>
      <circle cx="170" cy="40" r="70" fill={b(10)} />
      <circle cx="170" cy="40" r="44" fill={b(10)} />
      {kind === "bars" &&
        [30, 52, 38, 74, 60, 92].map((h, i) => (
          <rect key={i} x={70 + i * 24} y={110 - h} width="14" height={h} rx="7" fill={i % 2 ? c(2, 55) : b(60)} />
        ))}
      {kind === "orbit" && (
        <>
          <ellipse cx="150" cy="62" rx="70" ry="26" stroke={b(40)} strokeWidth="1.5" transform="rotate(-18 150 62)" />
          <ellipse cx="150" cy="62" rx="46" ry="16" stroke={c(2, 45)} strokeWidth="1.5" transform="rotate(-18 150 62)" />
          <circle cx="150" cy="62" r="13" fill={b(70)} />
          <circle cx="205" cy="44" r="5" fill={c(3, 80)} />
          <circle cx="98" cy="78" r="4" fill={c(4, 80)} />
        </>
      )}
      {kind === "nodes" && (
        <>
          <path d="M100 80 L150 38 L196 70 L150 98 Z" stroke={b(35)} strokeWidth="1.5" />
          {[[100, 80, 9, 60], [150, 38, 13, 75], [196, 70, 8, 55], [150, 98, 10, 65]].map(([x, y, r, o]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={b(o)} />
          ))}
          <circle cx="150" cy="38" r="22" stroke={c(2, 40)} strokeWidth="1.5" />
        </>
      )}
      {kind === "grid" &&
        Array.from({ length: 4 }, (_, r) =>
          Array.from({ length: 7 }, (_, k) => (
            <rect key={`${r}-${k}`} x={72 + k * 20} y={22 + r * 22} width="15" height="15" rx="5" fill={(r * 3 + k * 5) % 7 < 2 ? b(75) : (r + k) % 3 === 0 ? c(2, 40) : b(18)} />
          )),
        )}
      {kind === "shield" && (
        <>
          <path d="M150 16 L192 32 V62 C192 86 174 102 150 110 C126 102 108 86 108 62 V32 Z" fill={b(18)} stroke={b(55)} strokeWidth="1.5" />
          <path d="M132 62 l13 13 l25 -28" stroke={c(4, 90)} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {kind === "chat" && (
        <>
          <rect x="84" y="22" width="92" height="40" rx="16" fill={b(28)} />
          <rect x="102" y="38" width="46" height="6" rx="3" fill={b(75)} />
          <rect x="120" y="68" width="88" height="34" rx="14" fill={c(2, 40)} />
          <rect x="136" y="82" width="40" height="6" rx="3" fill={c(2, 90)} />
          <path d="M192 14 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" fill={b(85)} />
        </>
      )}
      {kind === "calendar" && (
        <>
          <rect x="96" y="22" width="100" height="84" rx="16" fill={b(14)} stroke={b(45)} strokeWidth="1.5" />
          <path d="M96 46 H196" stroke={b(45)} strokeWidth="1.5" />
          {Array.from({ length: 10 }, (_, i) => (
            <circle key={i} cx={114 + (i % 5) * 18} cy={64 + Math.floor(i / 5) * 18} r={i === 6 ? 7 : 4} fill={i === 6 ? b(85) : b(40)} />
          ))}
        </>
      )}
      {kind === "stack" && (
        <>
          {[0, 1, 2].map((i) => (
            <rect key={i} x={86 + i * 10} y={78 - i * 22} width="96" height="22" rx="9" fill={i === 2 ? b(70) : i === 1 ? c(2, 45) : b(28)} stroke={b(30)} strokeWidth="1" />
          ))}
          <path d="M184 34 V62" stroke={c(4, 80)} strokeWidth="3" strokeLinecap="round" strokeDasharray="1 7" />
        </>
      )}
    </svg>
  );
}
