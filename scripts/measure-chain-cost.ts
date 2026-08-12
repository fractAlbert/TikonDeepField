// How much does a clue chain actually cost the player?
//
// This replaces `check-chain-equivalence.ts`, which proved the *first*
// version of the chain was informationally identical to a direct quadrant
// clue. That was true and it was the problem: identical information delivered
// in two lines instead of one is an extra step, not a puzzle. The user's
// verdict was blunt - "the pair chain doesn't add complexity. it just adds
// what feels like an extra step. Especially if it's always there."
//
// A chain now names the whole set of quadrants a classification occupies, and
// is only generated when that set has two or more. So it is strictly weaker
// than the direct clue it replaces, and there is nothing left to assert -
// only something to measure. Asserting equivalence would now be asserting a
// bug.
//
// Method: generate a region, assess it as generated, then rewrite each chain
// as the direct `quasar-quadrant` clue it displaced and assess again. The
// difference is what the ambiguity buys.
//
// Run: npx tsx scripts/measure-chain-cost.ts [samples]

import { generateRegion } from "../src/lib/generate-region";
import { assessSolvability } from "../src/lib/solvability";
import { buildSectors, quadrantOf } from "../src/lib/grid";
import { Clue, Region } from "../src/lib/puzzle-types";
import { RANKS, DEFAULT_DIFFICULTY } from "../src/lib/ranks";

const sectorLookup = new Map(buildSectors().map((s) => [s.id, s]));
const SAMPLES = Number(process.argv[2] ?? 400);

/** Replaces each chain with the direct quadrant clue it stands in for. */
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

console.log(
  "profile".padEnd(26) +
    "chained   solvable(chained)  solvable(direct)   cost".padStart(20)
);

for (const profile of [DEFAULT_DIFFICULTY, ...RANKS.map((r) => r.difficulty)]) {
  let chained = 0;
  let solvableChained = 0;
  let solvableDirect = 0;
  // Only regions that actually carry a chain can show a difference, so the
  // headline rate over every region would dilute the effect with regions the
  // change cannot touch. Both are reported.
  let pairedChained = 0;
  let pairedDirect = 0;

  for (let i = 0; i < SAMPLES; i++) {
    const region = generateRegion({ difficulty: profile });
    const hasChain = region.clues.some((c) => c.kind === "type-quadrant-set");

    const asIs = assessSolvability(region).withBestScans;
    const asDirect = assessSolvability(flatten(region)).withBestScans;
    if (asIs) solvableChained++;
    if (asDirect) solvableDirect++;

    if (hasChain) {
      chained++;
      if (asIs) pairedChained++;
      if (asDirect) pairedDirect++;
    }
  }

  const label = `quad=${profile.quadrantClues} indirect=${profile.indirectClues}`;
  const pc = (n: number, d: number) => (d === 0 ? "   -  " : `${((100 * n) / d).toFixed(1)}%`);
  const cost =
    chained === 0
      ? "   -"
      : `${(((pairedDirect - pairedChained) / chained) * 100).toFixed(1)}pp`;
  console.log(
    label.padEnd(26) +
      `${String(chained).padStart(5)}/${SAMPLES}` +
      `      ${pc(solvableChained, SAMPLES).padStart(6)}` +
      `            ${pc(solvableDirect, SAMPLES).padStart(6)}` +
      `      ${cost.padStart(7)}`
  );
  if (chained > 0) {
    console.log(
      "".padEnd(26) +
        `  among chained regions only: ${pc(pairedChained, chained)} vs ${pc(pairedDirect, chained)}`
    );
  }
}

console.log(
  "\nCost is the drop in solvable rate across regions that carry a chain,\n" +
    "in percentage points."
);

// Solvability is the wrong instrument for this lever and the near-zero
// numbers above are the evidence, not a null result. `ranks.ts` already says
// it: quadrantClues "barely touches solvability and dominates search effort.
// A quadrant collapses a signature from 40 candidate cells to 10 before any
// reasoning happens, which is invisible to a uniqueness check and enormous
// from the console." A chain modifies that same lever, so it inherits the
// same invisibility - and the same real effect.
//
// So measure the effect where it lives: how many cells the clue leaves open.
console.log("\nWhere the chain actually bites - candidate cells left open per clue:\n");
console.log("profile".padEnd(26) + "direct   chained   given back");

const CELLS = 40;
const QUADRANT_CELLS = CELLS / 4;

for (const profile of [DEFAULT_DIFFICULTY, ...RANKS.map((r) => r.difficulty)]) {
  let spread = 0;
  let count = 0;
  for (let i = 0; i < SAMPLES; i++) {
    for (const c of generateRegion({ difficulty: profile }).clues) {
      if (c.kind === "type-quadrant-set") {
        spread += c.quadrants.length;
        count++;
      }
    }
  }
  const label = `quad=${profile.quadrantClues} indirect=${profile.indirectClues}`;
  if (count === 0) {
    console.log(label.padEnd(26) + `${QUADRANT_CELLS}       -         -`);
    continue;
  }
  const mean = spread / count;
  const cells = mean * QUADRANT_CELLS;
  console.log(
    label.padEnd(26) +
      `${QUADRANT_CELLS}      ${cells.toFixed(1)}      +${(cells - QUADRANT_CELLS).toFixed(1)}`
  );
}

console.log(
  "\nA direct quadrant clue leaves 10 of the 40 cells open. A chain listing\n" +
    "two quadrants leaves 20 - so it hands back roughly half the collapse the\n" +
    "clue would have bought. That, not the solvable rate, is the difficulty\n" +
    "this lever adds."
);
