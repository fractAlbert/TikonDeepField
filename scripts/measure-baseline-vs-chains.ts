// What the odds were before classifications entered the briefing, and what
// they are now.
//
// "Solvable" is a property of the *region*, not of the player: it asks
// whether exactly one sector assignment fits everything observable. A region
// that is not solvable cannot be won by anyone, however careful - that is
// what the Survey Log's "nobody could have got this" flag reports. It is a
// ceiling on success, never a prediction of it.
//
// Two ceilings, and the gap between them is the Ring Scan's whole value:
//
//   withoutScans   - the briefing and the Sweep Scope alone.
//   withBestScans  - plus two ring scans aimed at the right signatures. A
//                    best case: it asks whether *some* choice of targets
//                    works, not whether a human would find it.
//
// The "before" column is produced by generating with indirectClues: 0, which
// is exactly what every profile did until 2026-08-11 - not an approximation
// of the old behaviour but the same code path.
//
// Run: npx tsx scripts/measure-baseline-vs-chains.ts [samples]

import { generateRegion } from "../src/lib/generate-region";
import { assessSolvability } from "../src/lib/solvability";
import { RegionDifficulty, RANKS } from "../src/lib/ranks";
import { Clue, Region } from "../src/lib/puzzle-types";
import { buildSectors, quadrantOf } from "../src/lib/grid";

const sectorLookup = new Map(buildSectors().map((s) => [s.id, s]));

const SAMPLES = Number(process.argv[2] ?? 600);

/**
 * Replaces each chain with the direct quadrant clue it displaced, so the
 * same region can be assessed both ways.
 *
 * **Paired on purpose.** The first version of this script generated one
 * sample with `indirectClues: 0` and a second with the real profile, and
 * compared the two rates - which is two independent samples, not a
 * comparison. At 500 regions that carries a couple of points of noise in
 * each direction, and it duly produced a rank where chains made regions
 * *more* solvable by 4.6 points. That is impossible: a chain is strictly
 * weaker than the clue it replaces, so it can only lower the rate or leave
 * it alone. The number was noise, and it was only visible as wrong because
 * the direction was forbidden rather than merely surprising.
 *
 * Assessing one region both ways removes the between-sample variance
 * entirely, so the difference is exact rather than estimated.
 */
function flatten(region: Region): Region {
  const chainedTypes = new Set(
    region.clues.filter((c) => c.kind === "type-quadrant-set").map((c) => c.type)
  );
  const out: Clue[] = [];
  for (const c of region.clues) {
    if (c.kind === "type-quadrant-set") continue;
    if (c.kind === "quasar-type" && chainedTypes.has(c.type)) {
      out.push({
        kind: "quasar-quadrant",
        quasar: c.quasar,
        quadrant: quadrantOf(sectorLookup.get(region.solution[c.quasar].sector)!),
      });
      continue;
    }
    out.push(c);
  }
  return { ...region, clues: out };
}

function measure(profile: RegionDifficulty) {
  let beforeNoScans = 0;
  let afterNoScans = 0;
  let beforeScans = 0;
  let afterScans = 0;
  let chained = 0;
  let impossible = 0;

  for (let i = 0; i < SAMPLES; i++) {
    const region = generateRegion({ difficulty: profile });
    if (region.clues.some((c) => c.kind === "type-quadrant-set")) chained++;

    const after = assessSolvability(region);
    const before = assessSolvability(flatten(region));

    if (before.withoutScans) beforeNoScans++;
    if (after.withoutScans) afterNoScans++;
    if (before.withBestScans) beforeScans++;
    if (after.withBestScans) afterScans++;

    // A chain can never make a region solvable that the direct clue did not.
    if ((after.withoutScans && !before.withoutScans) || (after.withBestScans && !before.withBestScans)) {
      impossible++;
    }
  }

  return { beforeNoScans, afterNoScans, beforeScans, afterScans, chained, impossible };
}

const pct = (n: number) => `${((100 * n) / SAMPLES).toFixed(1)}%`;

console.log(`${SAMPLES} regions per cell.\n`);
console.log(
  "rank                        no scans          with 2 scans        chained"
);
console.log(
  "                          before   after     before   after"
);

let anyImpossible = 0;
for (const rank of RANKS) {
  const m = measure(rank.difficulty);
  anyImpossible += m.impossible;
  const label = `${rank.index} ${rank.short} q=${rank.difficulty.quadrantClues} i=${rank.difficulty.indirectClues}`;
  console.log(
    label.padEnd(26) +
      `${pct(m.beforeNoScans).padStart(6)}  ${pct(m.afterNoScans).padStart(6)}   ` +
      `${pct(m.beforeScans).padStart(7)}  ${pct(m.afterScans).padStart(6)}   ` +
      `${pct(m.chained).padStart(6)}`
  );
}

console.log(
  anyImpossible === 0
    ? "\nMonotonicity holds: no region was made solvable by a chain."
    : `\nFAILED: ${anyImpossible} regions became solvable WITH a chain, which cannot happen.`
);

console.log(
  "\nThe 'no scans' column is the honest measure of what a briefing buys, and\n" +
    "the one a chain can move. 'With 2 scans' sits near the ceiling for every\n" +
    "profile, which is the Ring Scan doing its job - it exists precisely to\n" +
    "rescue the regions the briefing alone cannot settle."
);
