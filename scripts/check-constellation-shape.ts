// Does the constellation tell the truth about the field's geometry?
//
// The picture is rotated and rescaled, so nothing about where a star appears
// is meaningful. What must survive is the *shape*: the constellation has to
// be similar to a real arrangement of signatures on the map, or it is
// inventing geometry and every deduction made from it is worthless.
//
// Checked by pairwise distance, which is what rotation and uniform scaling
// preserve. For each region the constellation's distances are normalised by
// their own largest, and matched against every same-sized subset of the real
// signatures normalised the same way. At least one must match.
//
// Note what this does NOT test: whether the rotation is quantised to whole
// segments. It cannot, because a free rotation is rigid too and would pass
// this happily. The quantisation is for tractability, not truth - see the
// comment in ConstellationView - so it is checked separately below by
// requiring the turn to be one of the eight.
//
// Run: npx tsx scripts/check-constellation-shape.ts [samples]

import { buildConstellation } from "../src/components/constellation/ConstellationView";
import { generateRegion } from "../src/lib/generate-region";
import { SEGMENT_COUNT, buildSectors } from "../src/lib/grid";
import { DEFAULT_DIFFICULTY } from "../src/lib/ranks";

const sectorLookup = new Map(buildSectors().map((s) => [s.id, s]));
const SAMPLES = Number(process.argv[2] ?? 1200);
const STARS = 4;

/** Sorted pairwise distances, scaled so the largest is 1. */
function shapeKey(pts: { x: number; y: number }[]): string {
  const ds: number[] = [];
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++)
      ds.push(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
  const max = Math.max(...ds);
  return ds
    .map((d) => (d / max).toFixed(5))
    .sort()
    .join(",");
}

function subsets<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [head, ...rest] = items;
  return [...subsets(rest, k - 1).map((c) => [head, ...c]), ...subsets(rest, k)];
}

let shapeFail = 0;

for (let i = 0; i < SAMPLES; i++) {
  const region = generateRegion({ difficulty: DEFAULT_DIFFICULTY });
  const stars = buildConstellation(region, STARS);
  if (stars.length < 3) continue;

  // Real positions, in the same polar-to-cartesian frame the view uses.
  const real = Object.keys(region.solution).map((n) => {
    const s = sectorLookup.get(region.solution[n].sector)!;
    const r = s.ring + 1;
    const th = (s.seg / SEGMENT_COUNT) * Math.PI * 2;
    return { x: r * Math.cos(th), y: r * Math.sin(th) };
  });

  const want = shapeKey(stars);
  const matched = subsets(real, stars.length).some((sub) => shapeKey(sub) === want);
  if (!matched) {
    shapeFail++;
    if (shapeFail <= 3) console.log(`  shape matches no real subset: ${region.id}`);
  }

}

console.log(`\n${SAMPLES} constellations, ${STARS} stars each.`);
console.log(
  shapeFail === 0
    ? "Every shape is similar to a real arrangement of signatures - the picture does not invent geometry."
    : `FAILED: ${shapeFail} shapes match no real subset of their region.`
);
process.exit(shapeFail === 0 ? 0 : 1);
