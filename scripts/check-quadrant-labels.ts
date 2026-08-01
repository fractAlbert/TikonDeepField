// Checks the Star Map's quadrant labels: that they land inside the viewBox
// with clearance, and that the claim they make about which segments belong
// to which quadrant is the one grid.ts actually implements.
//
// Numeric rather than visual on purpose - eyeballing this dial's geometry
// has produced wrong "fixes" before.
//
// Usage: npx tsx scripts/check-quadrant-labels.ts

import { polarPoint } from "../src/lib/polar-geometry";
import { QUADRANTS, buildSectors, quadrantOf } from "../src/lib/grid";

// Must match StarMap.tsx.
const CX = 220;
const CY = 220;
const QUADRANT_LABEL_R = 236;
const VIEWBOX = 440;
// Half-width of "QUAD III", the longest label. Measured in the browser at
// fontSize 15 (83 user units) and scaled to the shipped 17, rather than
// guessed from character counts - monospace advance plus 0.12em tracking is
// not something to estimate when the margin is this thin.
const HALF_W = (83 * (17 / 15)) / 2;
const HALF_H = 11;

let failures = 0;

console.log("Label positions (viewBox is 0..440 on both axes):\n");
QUADRANTS.forEach((quadrant, q) => {
  const p = polarPoint(CX, CY, QUADRANT_LABEL_R, q * 90 + 45);
  const inBox =
    p.x - HALF_W > 0 && p.x + HALF_W < VIEWBOX && p.y - HALF_H > 0 && p.y + HALF_H < VIEWBOX;
  if (!inBox) failures++;
  console.log(
    `  QUAD ${quadrant.padEnd(4)} centre (${String(p.x).padStart(6)}, ${String(p.y).padStart(6)})` +
      `  x ${(p.x - HALF_W).toFixed(0).padStart(4)}..${(p.x + HALF_W).toFixed(0).padStart(4)}` +
      `  y ${(p.y - HALF_H).toFixed(0).padStart(4)}..${(p.y + HALF_H).toFixed(0).padStart(4)}` +
      `  ${inBox ? "ok" : "OUT OF BOX"}`
  );
});

// The labels sit at radius 236; the dial's outermost ring ends at 200 and
// its segment labels at 214. Confirm the corners really are clear.
const clearance = QUADRANT_LABEL_R - 214;
console.log(`\nRadial clearance past the segment labels: ${clearance} units`);
if (clearance < 10) failures++;

console.log("\nSegment membership, from grid.ts:\n");
const bySeg = new Map<number, string>();
for (const s of buildSectors()) if (s.ring === 0) bySeg.set(s.seg, quadrantOf(s));
for (const quadrant of QUADRANTS) {
  const segs = [...bySeg.entries()]
    .filter(([, v]) => v === quadrant)
    .map(([seg]) => `S${seg + 1}`);
  console.log(`  QUAD ${quadrant.padEnd(4)} = ${segs.join(" + ")}`);
  if (segs.length !== 2) failures++;
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
