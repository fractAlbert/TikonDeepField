// A flat vector elevation schematic of the station - same self-drawn, no
// external assets approach as OutpostLogo. Values are rounded so the SVG
// path strings are identical between server and client renders (see the
// same fix applied to polarPoint in polar-geometry.ts).

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: round(cx + r * Math.cos(rad)), y: round(cy + r * Math.sin(rad)) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

const DECKS = 6;
const HULL_X = 180;
const HULL_Y = 20;
const HULL_W = 60;
const HULL_H = 200;
const DECK_H = HULL_H / DECKS;
const ARRAY_CX = 300;
const ARRAY_CY = 120;

export function StationSchematic({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 460 260" className={className} role="img" aria-label="Station schematic">
      <defs>
        <filter id="schematic-glow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      {/* struts connecting hull to the sensor array */}
      <line x1={HULL_X + HULL_W} y1={90} x2={ARRAY_CX - 40} y2={70} stroke="rgba(207,227,242,0.35)" strokeWidth={1.5} />
      <line x1={HULL_X + HULL_W} y1={150} x2={ARRAY_CX - 40} y2={170} stroke="rgba(207,227,242,0.35)" strokeWidth={1.5} />

      {/* sensor array - concentric partial dish, deliberately larger than the hull */}
      {[100, 75, 50].map((r) => (
        <path
          key={r}
          d={arcPath(ARRAY_CX, ARRAY_CY, r, -58, 58)}
          fill="none"
          stroke="var(--lcars-violet)"
          strokeWidth={2}
          opacity={0.7}
        />
      ))}
      <text
        x={ARRAY_CX + 30}
        y={30}
        textAnchor="middle"
        fontSize={10}
        letterSpacing="0.06em"
        fill="rgba(207,227,242,0.6)"
        fontFamily="ui-monospace, monospace"
      >
        SENSOR ARRAY
      </text>

      {/* hull */}
      <rect
        x={HULL_X}
        y={HULL_Y}
        width={HULL_W}
        height={HULL_H}
        rx={14}
        fill="rgba(207,227,242,0.05)"
        stroke="var(--lcars-ice)"
        strokeWidth={2}
      />
      {Array.from({ length: DECKS - 1 }).map((_, i) => {
        const y = HULL_Y + (i + 1) * DECK_H;
        return (
          <line
            key={i}
            x1={HULL_X}
            y1={y}
            x2={HULL_X + HULL_W}
            y2={y}
            stroke="rgba(207,227,242,0.25)"
            strokeWidth={1}
          />
        );
      })}
      {Array.from({ length: DECKS }).map((_, i) => {
        const y = HULL_Y + (i + 0.5) * DECK_H;
        return (
          <text
            key={i}
            x={HULL_X - 8}
            y={y + 3}
            textAnchor="end"
            fontSize={9}
            fill="rgba(207,227,242,0.5)"
            fontFamily="ui-monospace, monospace"
          >
            D{i + 1}
          </text>
        );
      })}

      {/* isolinear core - glowing spine down the center of the hull */}
      <line
        x1={HULL_X + HULL_W / 2}
        y1={HULL_Y + 6}
        x2={HULL_X + HULL_W / 2}
        y2={HULL_Y + HULL_H - 6}
        stroke="var(--lcars-amber)"
        strokeWidth={3}
        opacity={0.85}
        filter="url(#schematic-glow)"
      />
      {Array.from({ length: DECKS }).map((_, i) => {
        const y = HULL_Y + (i + 0.5) * DECK_H;
        return (
          <circle key={i} cx={HULL_X + HULL_W / 2} cy={y} r={3} fill="#fff8ec" />
        );
      })}
      <text
        x={HULL_X + HULL_W / 2}
        y={HULL_Y - 8}
        textAnchor="middle"
        fontSize={9}
        letterSpacing="0.06em"
        fill="rgba(207,227,242,0.6)"
        fontFamily="ui-monospace, monospace"
      >
        ISOLINEAR CORE
      </text>

      {/* docking port */}
      <rect
        x={HULL_X + HULL_W / 2 - 10}
        y={HULL_Y + HULL_H}
        width={20}
        height={14}
        rx={3}
        fill="none"
        stroke="var(--lcars-orange)"
        strokeWidth={2}
      />

      <text
        x={230}
        y={250}
        textAnchor="middle"
        fontSize={10}
        letterSpacing="0.08em"
        fill="rgba(207,227,242,0.4)"
        fontFamily="ui-monospace, monospace"
      >
        SCHEMATIC (NOT TO SCALE)
      </text>
    </svg>
  );
}
