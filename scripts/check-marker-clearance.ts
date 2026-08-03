// Checks that every signature glyph fits inside one cell of the Star Map's
// dial, and that the two rings drawn *around* a marker - the confirmation
// ring and the catalog reveal - clear the widest glyph they can sit on.
//
// Numeric rather than visual on purpose: eyeballing this dial's geometry
// has produced wrong "fixes" before. The specific thing this exists to stop
// is the collision that shipped alongside the glyphs - the Ringed variant
// draws its detached ring at core*2.3 = 9.2, which was exactly the catalog
// ring's old radius of 9 and only 1.8 inside the confirmation ring's 11, so
// a Ringed signature read as already confirmed.
//
// Usage: npx tsx scripts/check-marker-clearance.ts

import { RING_COUNT, SEGMENT_COUNT } from "../src/lib/grid";

// Must match components/starmap/field.tsx.
const INNER_HOLE = 30;
const MAX_R = 200;
const RING_GAP = 3;
const RING_THICKNESS = (MAX_R - INNER_HOLE) / RING_COUNT;
const SEG_SPAN = 360 / SEGMENT_COUNT;
const MARKER_CORE = 4;
const CATALOG_RING_R = 12;
const CONFIRM_RING_R = 14;

// Must match components/QuasarMarker.tsx.
const HALO = 1.75;
const HALO_BLOOM = 2.6;
const SPIKE = 3.2;
const RING = 2.3;

// The widths the dial actually renders at: docked sidebar, survey result,
// phone. A glyph that only separates on one of these has not shipped.
const WIDTHS = [260, 392, 420];
const VIEWBOX = 440;

let failures = 0;

/** Distance from a cell's centre to its nearest edge, over all 40 cells. */
function tightestClearance(): { clearance: number; where: string } {
  let best = Infinity;
  let where = "";
  for (let ring = 0; ring < RING_COUNT; ring++) {
    const r0 = INNER_HOLE + ring * RING_THICKNESS + RING_GAP / 2;
    const r1 = INNER_HOLE + (ring + 1) * RING_THICKNESS - RING_GAP / 2;
    const radial = (r1 - r0) / 2;
    // Half the arc a cell spans at its own mid-radius. Widest ring is the
    // outermost, so ring 1 is always the binding case.
    const angular = ((r0 + r1) / 2) * (((SEG_SPAN / 2) * Math.PI) / 180);
    const clear = Math.min(radial, angular);
    if (clear < best) {
      best = clear;
      where = `ring ${ring + 1} (radial ${radial.toFixed(1)}, angular ${angular.toFixed(1)})`;
    }
  }
  return { clearance: best, where };
}

const { clearance, where } = tightestClearance();
console.log(`Tightest cell clearance: ${clearance.toFixed(2)} units — ${where}\n`);

const features: [string, number][] = [
  ["pinpoint halo", MARKER_CORE * HALO],
  ["bloom halo", MARKER_CORE * HALO_BLOOM],
  ["four-spike reach", MARKER_CORE * SPIKE],
  ["ringed ring", MARKER_CORE * RING],
  ["catalog ring", CATALOG_RING_R],
  ["confirm ring", CONFIRM_RING_R],
];

console.log("Fits inside a cell:");
for (const [name, r] of features) {
  const ok = r <= clearance;
  if (!ok) failures++;
  console.log(
    `  ${ok ? "ok  " : "FAIL"} ${name.padEnd(18)} r=${r.toFixed(2).padStart(6)}` +
      `  spare ${(clearance - r).toFixed(2)}`
  );
}

// The rings have to be readable *as separate* from the glyph underneath.
// The ringed variant is the only glyph that draws a ring of its own, so it
// is the one that can be confused with them.
const RINGED = MARKER_CORE * RING;
const MIN_SEPARATION = 2; // units; ~1.2px at the docked 260px width
console.log("\nSeparation from the Ringed glyph's own ring:");
for (const [name, r] of [
  ["catalog ring", CATALOG_RING_R],
  ["confirm ring", CONFIRM_RING_R],
] as [string, number][]) {
  const gap = r - RINGED;
  const ok = gap >= MIN_SEPARATION;
  if (!ok) failures++;
  console.log(
    `  ${ok ? "ok  " : "FAIL"} ${name.padEnd(18)} gap ${gap.toFixed(2)} units` +
      `  (${WIDTHS.map((w) => `${((gap * w) / VIEWBOX).toFixed(1)}px @${w}`).join(", ")})`
  );
}

console.log("\nRendered size, px across:");
for (const w of WIDTHS) {
  const s = w / VIEWBOX;
  console.log(
    `  ${String(w).padStart(3)}px map: ` +
      [
        `pinpoint ${(2 * MARKER_CORE * HALO * s).toFixed(1)}`,
        `bloom ${(2 * MARKER_CORE * HALO_BLOOM * s).toFixed(1)}`,
        `four-spike ${(2 * MARKER_CORE * SPIKE * s).toFixed(1)}`,
        `ringed ${(2 * RINGED * s).toFixed(1)}`,
      ].join("  ")
  );
}

console.log(
  failures === 0
    ? "\nAll clear."
    : `\n${failures} problem(s) — a glyph would overflow its cell or merge with a ring.`
);
process.exit(failures === 0 ? 0 : 1);
