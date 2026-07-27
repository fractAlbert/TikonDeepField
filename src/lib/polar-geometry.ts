export interface Point {
  x: number;
  y: number;
}

// Rounded to a fixed precision so server and client renders always produce
// identical strings - Math.cos/Math.sin can differ by a trailing ULP between
// Node's and the browser's engine builds, which otherwise shows up as a
// hydration mismatch once the raw float is embedded in an SVG path string.
function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function polarPoint(cx: number, cy: number, r: number, deg: number): Point {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: round(cx + r * Math.cos(rad)), y: round(cy + r * Math.sin(rad)) };
}

/** SVG path for one annular (ring x wedge) cell. */
export function annularSegmentPath(
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number
): string {
  const p0o = polarPoint(cx, cy, r1, a0);
  const p1o = polarPoint(cx, cy, r1, a1);
  const p0i = polarPoint(cx, cy, r0, a0);
  const p1i = polarPoint(cx, cy, r0, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return [
    `M ${p0o.x} ${p0o.y}`,
    `A ${r1} ${r1} 0 ${large} 1 ${p1o.x} ${p1o.y}`,
    `L ${p1i.x} ${p1i.y}`,
    `A ${r0} ${r0} 0 ${large} 0 ${p0i.x} ${p0i.y}`,
    "Z",
  ].join(" ");
}
