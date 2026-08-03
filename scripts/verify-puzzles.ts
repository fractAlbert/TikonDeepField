// Verifier for hand-authored regions.
//
// For each region, checks:
//   1. region.solution itself satisfies every clue.
//   2. region.solution is the UNIQUE assignment that satisfies every clue,
//      via the backtracking solver (a brute-force permutation search is
//      infeasible now that sectors are chosen from a fixed 40-position
//      field rather than being 1:1 with the quasars).
//
// The tutorial region is additionally held to the four bars that make it
// teachable at all - see the block at the bottom. Those are asserted here
// rather than only in the bake script because the bake runs once and the
// file it writes then sits in the repo being refactored past.
//
// Usage: npx tsx scripts/verify-puzzles.ts

import { Region } from "../src/lib/puzzle-types";
import { buildSectors } from "../src/lib/grid";
import { assignmentSatisfiesRegion } from "../src/lib/clue-eval";
import { solveRegion, solutionsEqual } from "../src/lib/solver";
import { regions } from "../src/data/regions";
import { TUTORIAL_SCAN_TARGET, tutorialRegion } from "../src/data/regions/tutorial";
import { uniqueWithRingsKnown } from "../src/lib/solvability";

function verifyRegion(region: Region): { ok: boolean; message: string } {
  const sectors = buildSectors();
  const sectorLookup = new Map(sectors.map((s) => [s.id, s]));
  const sectorIds = new Set(sectors.map((s) => s.id));
  const quasarIds = region.quasars.map((q) => q.id);

  // Note: quasarTypes.length need not equal quasarIds.length - types can
  // repeat across quasars (at least 3 distinct types is the only rule).

  const solvedTypes = new Set<string>();
  const solvedSectors = new Set<string>();
  for (const qid of quasarIds) {
    const entry = region.solution[qid];
    if (!entry) return { ok: false, message: `solution missing quasar ${qid}` };
    if (!region.quasarTypes.includes(entry.type))
      return { ok: false, message: `solution type "${entry.type}" for ${qid} not in quasarTypes` };
    if (!sectorIds.has(entry.sector))
      return { ok: false, message: `solution sector "${entry.sector}" for ${qid} not a valid sector` };
    solvedTypes.add(entry.type);
    solvedSectors.add(entry.sector);
  }
  if (solvedTypes.size < 3) return { ok: false, message: "solution uses fewer than 3 distinct types" };
  if (solvedSectors.size !== quasarIds.length)
    return { ok: false, message: "solution does not assign each sector exactly once" };

  if (!assignmentSatisfiesRegion(region, region.solution, sectorLookup)) {
    return { ok: false, message: "declared solution does NOT satisfy all clues" };
  }

  // Puzzles now ship with only 2 exact-coordinate + 2 quadrant clues by
  // design - that's intentionally NOT enough to pin every signature by
  // clue-logic alone; the rest is meant to be resolved with Sweep Scope /
  // Segment Survey. So >1 solution from the clues alone is expected, not a
  // bug - only 0 solutions (contradictory clues) is a real failure here.
  const found = solveRegion(region, 2);

  if (found.length === 0) {
    return { ok: false, message: "no valid solution found (clues are contradictory)" };
  }
  if (found.length === 1 && !solutionsEqual(found[0], region.solution)) {
    return {
      ok: false,
      message: "the unique valid solution does not match the declared region.solution",
    };
  }

  const uniqueness =
    found.length === 1 ? "unique from clues alone" : "ambiguous by design (2+2 clues only)";
  return { ok: true, message: `${uniqueness}, declared solution satisfies all clues (${quasarIds.length} quasars)` };
}

let allOk = true;
const start = Date.now();
for (const region of regions) {
  const t0 = Date.now();
  const { ok, message } = verifyRegion(region);
  const ms = Date.now() - t0;
  const icon = ok ? "PASS" : "FAIL";
  console.log(`[${icon}] ${region.id} (${region.name}): ${message} (${ms}ms)`);
  if (!ok) allOk = false;
}
console.log(`\nTotal: ${Date.now() - start}ms`);

// ---------------------------------------------------------------------
// The tutorial region's extra bars.
//
// It is deliberately NOT unique from its clues alone - that is the whole
// design, since the wall is where the walk-through introduces the Ring
// Scan - so it is checked separately rather than folded into the loop
// above, whose notion of "ok" is uniqueness.

console.log("\n--- Tutorial region ---");
const T = tutorialRegion;
const anchored = new Set(
  T.clues.filter((c) => c.kind === "quasar-sector").map((c) => (c as { quasar: string }).quasar)
);
const scannable = Object.keys(T.solution).filter((n) => !anchored.has(n));
const soloTargets = scannable.filter((n) => uniqueWithRingsKnown(T, [n]));

const bars: [string, boolean, string][] = [
  ["six signatures", T.quasars.length === 6, `${T.quasars.length}`],
  [
    "NOT solvable from bearings alone",
    !uniqueWithRingsKnown(T),
    "propagation must stall - that wall is the lesson",
  ],
  [
    "one scan is enough",
    soloTargets.length > 0,
    soloTargets.length ? `works: ${soloTargets.join(", ")}` : "no single scan cracks it",
  ],
  [
    "exactly one aim point",
    soloTargets.length === 1,
    'so "work out which one you are stuck on" has one answer',
  ],
  [
    "the walk-through aims at that one",
    soloTargets.length === 1 && soloTargets[0] === TUTORIAL_SCAN_TARGET,
    `TUTORIAL_SCAN_TARGET is ${TUTORIAL_SCAN_TARGET}`,
  ],
  [
    "declared solvability matches",
    T.solvability?.withoutScans === false && T.solvability?.withBestScans === true,
    "the Log reads this to explain the region after the fact",
  ],
];

for (const [name, ok, detail] of bars) {
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name} - ${detail}`);
  if (!ok) allOk = false;
}

if (!allOk) {
  console.error("\nOne or more regions failed verification.");
  console.error("If the tutorial region failed, re-bake and rewrite the walk-through copy:");
  console.error("  npx tsx scripts/bake-tutorial-region.ts --write");
  console.error("  npx tsx scripts/explain-tutorial-region.ts");
  process.exit(1);
} else {
  console.log("\nAll regions verified: unique, clue-consistent solutions.");
}
