// What does narrowing the Sweep Scope cost?
//
// The range is the largest information channel in the game - the full
// pairwise distance matrix - so it is the obvious lever for giving back what
// the Constellation added. This measures it rather than guessing.
//
// Run once per range, in separate processes, because VISIBILITY_RANGE is read
// at module load:
//
//   SWEEP_RANGE=5 npx tsx scripts/measure-sweep-range.ts 400
//   SWEEP_RANGE=4 npx tsx scripts/measure-sweep-range.ts 400
//
// **Pooled across all five ranks on purpose.** A per-rank table at a few
// hundred samples each carries about four points of noise at two sigma, which
// is wider than the effect being looked for - the first attempt duly showed
// range 3 beating range 4 at Technician, which cannot happen. Pooling five
// ranks into one number cuts that to under a point.
//
// The comparison across ranges is unpaired, since the range cannot vary
// inside one process. That is the reason for the sample size rather than a
// shrug at it.

import { generateRegion } from "../src/lib/generate-region";
import { assessSolvability } from "../src/lib/solvability";
import { VISIBILITY_RANGE } from "../src/lib/experiments";
import { RANKS } from "../src/lib/ranks";

const PER_RANK = Number(process.argv[2] ?? 400);

let regions = 0;
let noScans = 0;
let withScans = 0;
const perRank: { label: string; noScans: number; n: number }[] = [];

for (const rank of RANKS) {
  let localNo = 0;
  for (let i = 0; i < PER_RANK; i++) {
    const region = generateRegion({ difficulty: rank.difficulty });
    const s = assessSolvability(region);
    regions++;
    if (s.withoutScans) {
      noScans++;
      localNo++;
    }
    if (s.withBestScans) withScans++;
  }
  perRank.push({ label: `${rank.index} ${rank.short}`, noScans: localNo, n: PER_RANK });
}

const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;
// Two standard errors on a proportion, as a rough width for the pooled figure.
const se2 = (n: number, d: number) => {
  const p = n / d;
  return `${(2 * 100 * Math.sqrt((p * (1 - p)) / d)).toFixed(1)}`;
};

// The range is per-rank now, so printing one number for the run would be a
// lie whenever the profiles disagree - which, since 2026-08-11, they do.
const ranges = [...new Set(RANKS.map((r) => r.difficulty.sweepRange))];
const override = process.env.SWEEP_RANGE ? ` (SWEEP_RANGE=${VISIBILITY_RANGE} overrides nothing - ranges come from the profiles)` : "";
console.log(
  `\nSweep ranges ${RANKS.map((r) => r.difficulty.sweepRange).join("/")}` +
    `${ranges.length === 1 ? "" : "  (per rank)"}${override}` +
    `   -   ${regions} regions (${PER_RANK} per rank)\n`
);
console.log(`  solvable, no scans     ${pct(noScans, regions)}  +/- ${se2(noScans, regions)}pp`);
console.log(`  solvable, 2 ring scans ${pct(withScans, regions)}  +/- ${se2(withScans, regions)}pp`);
console.log("\n  by rank, no scans (noisy at this sample size - the pooled figure is the answer):");
for (const r of perRank) {
  console.log(`    ${r.label.padEnd(8)} ${pct(r.noScans, r.n)}`);
}
