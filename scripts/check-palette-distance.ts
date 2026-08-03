/**
 * Perceptual separation of the quasar palette.
 *
 * The picker exists because two blips that look alike make the instrument
 * harder to read than the puzzle warrants, so "distinct" has to be measured
 * rather than eyeballed - hex values that look far apart as text routinely
 * land close in perception, and the reverse.
 *
 * CIE76 dE on sRGB -> linear -> XYZ (D65) -> Lab. CIE76 rather than dE2000
 * because the question here is only "can these be told apart at blip size",
 * where the rule of thumb is dE >= 20 for a glanceable difference and
 * dE < 10 for a pair that will be confused. Chasing the extra accuracy of
 * dE2000 would not move any entry across those thresholds.
 *
 *   npx tsx scripts/check-palette-distance.ts
 */
import { QUASAR_PALETTE } from "../src/lib/quasar-colors";

const CONFUSABLE = 10;
const GLANCEABLE = 20;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function hexToLab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  // sRGB D65 -> XYZ
  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  // Normalise to D65 white
  const [xn, yn, zn] = [x / 0.95047, y / 1.0, z / 1.08883];
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const [fx, fy, fz] = [f(xn), f(yn), f(zn)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = hexToLab(a);
  const [l2, a2, b2] = hexToLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

const palette = [...QUASAR_PALETTE];
const pairs: { a: string; b: string; d: number }[] = [];
for (let i = 0; i < palette.length; i++) {
  for (let j = i + 1; j < palette.length; j++) {
    pairs.push({ a: palette[i], b: palette[j], d: deltaE(palette[i], palette[j]) });
  }
}
pairs.sort((p, q) => p.d - q.d);

console.log(`${palette.length} colours, ${pairs.length} pairs\n`);
console.log("Closest 12 pairs:");
for (const p of pairs.slice(0, 12)) {
  const flag = p.d < CONFUSABLE ? "  <-- CONFUSABLE" : p.d < GLANCEABLE ? "  <-- close" : "";
  console.log(`  ${p.a}  ${p.b}   dE ${p.d.toFixed(1)}${flag}`);
}

const confusable = pairs.filter((p) => p.d < CONFUSABLE);
const close = pairs.filter((p) => p.d >= CONFUSABLE && p.d < GLANCEABLE);

// Worst neighbour per colour: the real question for the picker is whether
// every entry has *somewhere* clear to stand, not the global average.
console.log("\nNearest neighbour per colour:");
for (const c of palette) {
  const nearest = pairs
    .filter((p) => p.a === c || p.b === c)
    .reduce((m, p) => (p.d < m.d ? p : m));
  const other = nearest.a === c ? nearest.b : nearest.a;
  console.log(`  ${c} -> ${other}  dE ${nearest.d.toFixed(1)}`);
}

console.log(`\nconfusable (dE < ${CONFUSABLE}): ${confusable.length}`);
console.log(`close (dE < ${GLANCEABLE}):      ${close.length}`);
process.exit(confusable.length === 0 ? 0 : 1);
