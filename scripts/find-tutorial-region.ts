// How often is a region good enough to teach on, and can one be found by
// rejection sampling?
//
// "Easy to solve" for a first region means something specific and
// measurable, not a feeling:
//
//   - resolves by plain pairwise propagation, so the player never hits a
//     wall needing a technique nobody has taught them yet
//   - shallow chains (<= 2 rounds), so every signature falls out of the
//     anchors or one step past them
//   - nothing left stuck
//   - six signatures, so there are fewer pairwise readings to hold in your
//     head while still learning what a reading means
//
// The last two pull against each other - 6-signature regions are the
// hardest to resolve - so this reports whether the combination is rare
// enough to matter.
//
// Usage: npx tsx scripts/find-tutorial-region.ts [samples]

import { RING_COUNT, buildSectors, orthogonalDistanceSigned, quadrantOf } from "../src/lib/grid";
import { generateRegion } from "../src/lib/generate-region";
import { Quadrant, Region, Sector } from "../src/lib/puzzle-types";

const SAMPLES = Number(process.argv[2] ?? 3000);
const VISIBILITY_RANGE = 5;
const OUT_OF_RANGE = 99;
const MAX_ROUNDS = 2;
const TUTORIAL_SIGNATURES = 6;

const sectors = buildSectors();
const sectorLookup = new Map(sectors.map((s) => [s.id, s]));

function observed(a: Sector, b: Sector): number {
  const d = Math.abs(orthogonalDistanceSigned(a, b));
  return d <= VISIBILITY_RANGE ? d : OUT_OF_RANGE;
}

/** Rounds needed by plain propagation, and how many it never resolved. */
function propagate(region: Region): { rounds: number; stuck: number } {
  const names = Object.keys(region.solution);
  const truth = new Map(names.map((n) => [n, sectorLookup.get(region.solution[n].sector)!]));

  const fixed = new Map<string, string>();
  const quadClue = new Map<string, Quadrant>();
  for (const clue of region.clues) {
    if (clue.negate) continue;
    if (clue.kind === "quasar-sector") fixed.set(clue.quasar, clue.sector);
    if (clue.kind === "quasar-quadrant") quadClue.set(clue.quasar, clue.quadrant);
  }

  const unanchored = names.filter((n) => !fixed.has(n));
  const known = new Map<string, Sector>();
  for (const [n, sid] of fixed) known.set(n, sectorLookup.get(sid)!);

  const candidates = new Map<string, Sector[]>();
  for (const n of unanchored) {
    candidates.set(
      n,
      sectors.filter((s) => !quadClue.has(n) || quadrantOf(s) === quadClue.get(n))
    );
  }

  let rounds = 0;
  for (;;) {
    const used = new Set([...known.values()].map((s) => s.id));
    for (const n of unanchored) {
      if (known.has(n)) continue;
      candidates.set(
        n,
        candidates.get(n)!.filter((cand) => {
          if (used.has(cand.id)) return false;
          for (const [k, ks] of known) {
            if (observed(cand, ks) !== observed(truth.get(n)!, truth.get(k)!)) return false;
          }
          return true;
        })
      );
    }
    let resolved = 0;
    for (const n of unanchored) {
      if (known.has(n)) continue;
      if (candidates.get(n)!.length === 1) {
        known.set(n, candidates.get(n)![0]);
        resolved++;
      }
    }
    if (resolved === 0) break;
    rounds++;
  }

  return { rounds, stuck: unanchored.filter((n) => !known.has(n)).length };
}

// ---------------------------------------------------------------------

let sixSig = 0;
let tutorialGrade = 0;
let firstFound: { region: Region; rounds: number } | null = null;
const roundHistogram = new Map<number, number>();

for (let i = 0; i < SAMPLES; i++) {
  const region = generateRegion();
  if (region.quasars.length !== TUTORIAL_SIGNATURES) continue;
  sixSig++;
  const { rounds, stuck } = propagate(region);
  if (stuck > 0) continue;
  roundHistogram.set(rounds, (roundHistogram.get(rounds) ?? 0) + 1);
  if (rounds > MAX_ROUNDS) continue;
  tutorialGrade++;
  if (!firstFound) firstFound = { region, rounds };
}

const pct = (n: number, of: number) => ((n / of) * 100).toFixed(1);

console.log(`Sampled ${SAMPLES} regions; ${sixSig} had ${TUTORIAL_SIGNATURES} signatures.\n`);
console.log(
  `Tutorial grade (fully propagates, <= ${MAX_ROUNDS} rounds, none stuck): ` +
    `${tutorialGrade} of ${sixSig}  (${pct(tutorialGrade, sixSig)}%)`
);
console.log(
  `Rounds needed, among the ${TUTORIAL_SIGNATURES}-signature regions that fully resolve:  ` +
    [...roundHistogram.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([r, n]) => `${r}:${n}`)
      .join("  ")
);

const expectedTries = sixSig > 0 && tutorialGrade > 0 ? (SAMPLES / tutorialGrade).toFixed(0) : "n/a";
console.log(`\nExpected generateRegion() calls to find one: ~${expectedTries}`);

if (firstFound) {
  const r = firstFound.region;
  const anchors = r.clues.filter((c) => c.kind === "quasar-sector");
  console.log(`\nExample - ${r.name}, resolved in ${firstFound.rounds} round(s):`);
  console.log(
    `  anchors: ${anchors
      .map((c) => `${(c as { quasar: string }).quasar} at ${(c as { sector: string }).sector}`)
      .join(", ")}`
  );
  for (const q of r.quasars) {
    console.log(`  ${q.designation.padEnd(12)} ${r.solution[q.id].sector}`);
  }
}

// A ring count is only interesting if the field is the size we think it is.
console.log(`\n(field is ${RING_COUNT} rings x 8 segments)`);
