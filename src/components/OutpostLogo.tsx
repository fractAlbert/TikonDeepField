// A self-drawn emblem for the science outpost - flat vector shapes only (no
// gradients/photographic assets, consistent with the rest of the LCARS
// styling), built from the same polar-field and quasar-glow motifs used
// throughout the game rather than an unrelated stock icon.

// Rounded so server and client renders always produce identical path
// strings - Math.cos/Math.sin can differ by a trailing ULP between Node's
// and the browser's engine builds, which otherwise shows up as a hydration
// mismatch once the raw float is embedded in an SVG path string (same fix
// as polarPoint in polar-geometry.ts).
function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function OutpostLogo({
  size = 160,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const segments = 8;
  const segSpan = 360 / segments;
  const gapDeg = 6;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label="Science Outpost emblem"
    >
      <defs>
        <filter id="outpost-glow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* outer segmented ring - echoes the 8-bearing field */}
      {Array.from({ length: segments }).map((_, i) => {
        const a0 = i * segSpan + gapDeg / 2 - 90;
        const a1 = (i + 1) * segSpan - gapDeg / 2 - 90;
        const r = 92;
        const x0 = round(100 + r * Math.cos((a0 * Math.PI) / 180));
        const y0 = round(100 + r * Math.sin((a0 * Math.PI) / 180));
        const x1 = round(100 + r * Math.cos((a1 * Math.PI) / 180));
        const y1 = round(100 + r * Math.sin((a1 * Math.PI) / 180));
        return (
          <path
            key={i}
            d={`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`}
            fill="none"
            stroke={i % 2 === 0 ? "var(--lcars-orange)" : "var(--lcars-ice)"}
            strokeWidth={5}
            strokeLinecap="round"
          />
        );
      })}

      {/* middle ring */}
      <circle cx={100} cy={100} r={70} fill="none" stroke="var(--lcars-amber)" strokeWidth={2.5} />

      {/* inner rings - matches the puzzle field's concentric bands */}
      <circle cx={100} cy={100} r={54} fill="none" stroke="rgba(207,227,242,0.35)" strokeWidth={1.5} />
      <circle cx={100} cy={100} r={38} fill="none" stroke="rgba(207,227,242,0.25)" strokeWidth={1.5} />

      {/* radiating bearing lines */}
      {Array.from({ length: 4 }).map((_, i) => {
        const a = i * 45;
        const x1 = round(100 + 22 * Math.cos((a * Math.PI) / 180));
        const y1 = round(100 + 22 * Math.sin((a * Math.PI) / 180));
        const x2 = round(100 + 70 * Math.cos((a * Math.PI) / 180));
        const y2 = round(100 + 70 * Math.sin((a * Math.PI) / 180));
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--lcars-violet)"
            strokeWidth={1.5}
            opacity={0.55}
          />
        );
      })}

      {/* quasar core */}
      <circle cx={100} cy={100} r={16} fill="var(--lcars-amber)" filter="url(#outpost-glow)" opacity={0.8} />
      <circle cx={100} cy={100} r={9} fill="#fff8ec" />

      {/* base bracket - grounds the emblem as a structure, not just a field diagram */}
      <path
        d="M 62 178 L 74 178 Q 82 178 82 170 L 82 164 L 118 164 L 118 170 Q 118 178 126 178 L 138 178"
        fill="none"
        stroke="var(--lcars-orange)"
        strokeWidth={5}
        strokeLinecap="round"
      />
    </svg>
  );
}
