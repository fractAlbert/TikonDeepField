// Find the region the tutorial ships with.
//
// The bar changed on 2026-08-03. The original version of this script looked
// for a region that resolves by plain propagation with no scans spent - the
// gentlest possible field. That is the wrong region to teach on, because
// the Ring Scan is the one instrument a player will never discover on their
// own: it costs something, it is metered, and a region that never needs it
// teaches you that you can ignore it.
//
// So the tutorial region must **force** a ring scan, and force exactly one:
//
//   - six signatures, so there are fewer pairwise readings to hold in your
//     head while still learning what a reading means
//   - NOT unique with no scans spent - propagation alone hits a wall, which
//     is the moment the walk-through introduces the Ring Scan
//   - unique after ONE scan aimed at the right signature. Not two: the
//     budget is two, and a tutorial that spends the whole allocation
//     teaches nothing about spending it carefully, plus a learner who aims
//     their first scan wrong still has a way out
//   - once that ring is known, plain propagation finishes the job in <= 2
//     rounds with nothing stuck, so the second half of the region is
//     ordinary reasoning rather than a second wall
//
// Uniqueness comes from `uniqueWithRingsKnown` in src/lib/solvability.ts -
// the same code the app uses - so a region this script blesses cannot be
// one the app judges differently. Propagation is measured here, because
// "a perfect solver could" and "a human doing straightforward elimination
// can" are different claims and the tutorial needs the second.
//
// Usage: npx tsx scripts/find-tutorial-region.ts [samples]

import { RING_COUNT, buildSectors, orthogonalDistanceSigned, quadrantOf } from "../src/lib/grid";
import { generateRegion } from "../src/lib/generate-region";
import { uniqueWithRingsKnown } from "../src/lib/solvability";
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

/**
 * Rounds needed by plain propagation, and how many it never resolved.
 *
 * `ringKnown` models a spent Ring Scan: that signature's ring is pinned,
 * exactly as `countConsistent` treats it, so the two agree about what a
 * scan buys you.
 */
function propagate(region: Region, ringKnown: Set<string> = new Set()) {
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
      sectors.filter((s) => {
        if (quadClue.has(n) && quadrantOf(s) !== quadClue.get(n)) return false;
        if (ringKnown.has(n) && s.ring !== truth.get(n)!.ring) return false;
        return true;
      })
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

/** The signatures a scan can be aimed at - anchored ones are already known. */
function scannable(region: Region): string[] {
  const anchored = new Set(
    region.clues.filter((c) => c.kind === "quasar-sector").map((c) => c.quasar)
  );
  return Object.keys(region.solution).filter((n) => !anchored.has(n));
}

// ---------------------------------------------------------------------

let sixSig = 0;
let needsAScan = 0;
let oneScanEnough = 0;
let tutorialGrade = 0;
let best: { region: Region; targets: string[]; rounds: number } | null = null;
const roundHistogram = new Map<number, number>();

for (let i = 0; i < SAMPLES; i++) {
  const region = generateRegion();
  if (region.quasars.length !== TUTORIAL_SIGNATURES) continue;
  sixSig++;

  // Must hit a wall without a scan - that wall is the teaching moment.
  if (uniqueWithRingsKnown(region)) continue;
  needsAScan++;

  // ...and one scan, aimed right, must be enough.
  const targets = scannable(region).filter((n) => uniqueWithRingsKnown(region, [n]));
  if (targets.length === 0) continue;
  oneScanEnough++;

  // ...and the rest must fall out by ordinary elimination.
  const viable = targets
    .map((t) => ({ t, ...propagate(region, new Set([t])) }))
    .filter((r) => r.stuck === 0);
  if (viable.length === 0) continue;
  const shallowest = viable.reduce((a, b) => (b.rounds < a.rounds ? b : a));
  roundHistogram.set(shallowest.rounds, (roundHistogram.get(shallowest.rounds) ?? 0) + 1);
  if (shallowest.rounds > MAX_ROUNDS) continue;

  tutorialGrade++;
  // Keep the one with the fewest viable aim points: a region where only a
  // single signature is worth scanning makes the walk-through's advice
  // ("work out which one you are actually stuck on") unambiguous.
  if (!best || viable.length < best.targets.length) {
    best = { region, targets: viable.map((v) => v.t), rounds: shallowest.rounds };
  }
}

const pct = (n: number, of: number) => (of === 0 ? "n/a" : ((n / of) * 100).toFixed(1) + "%");

console.log(`Sampled ${SAMPLES} regions; ${sixSig} had ${TUTORIAL_SIGNATURES} signatures.\n`);
console.log(`  needs at least one scan          ${needsAScan} of ${sixSig}  (${pct(needsAScan, sixSig)})`);
console.log(`  ...and one scan is enough        ${oneScanEnough}  (${pct(oneScanEnough, needsAScan)} of those)`);
console.log(`  ...and the rest propagates <=${MAX_ROUNDS}   ${tutorialGrade}  (${pct(tutorialGrade, oneScanEnough)} of those)`);
console.log(`\nTutorial grade: ${tutorialGrade} of ${sixSig} six-signature regions (${pct(tutorialGrade, sixSig)})`);
console.log(
  `Rounds after the scan:  ` +
    [...roundHistogram.entries()].sort((a, b) => a[0] - b[0]).map(([r, n]) => `${r}:${n}`).join("  ")
);
console.log(
  `\nExpected generateRegion() calls to find one: ~${
    tutorialGrade > 0 ? (SAMPLES / tutorialGrade).toFixed(0) : "n/a"
  }`
);

if (best) {
  const r = best.region;
  const anchors = r.clues.filter((c) => c.kind === "quasar-sector");
  console.log(`\n--- Candidate: ${r.name} ---`);
  console.log(`  resolves in ${best.rounds} round(s) after one scan`);
  console.log(`  scan targets that work: ${best.targets.join(", ")}`);
  console.log(
    `  anchors: ${anchors
      .map((c) => `${(c as { quasar: string }).quasar} at ${(c as { sector: string }).sector}`)
      .join(", ")}`
  );
  for (const q of r.quasars) {
    console.log(`  ${q.designation.padEnd(12)} ${r.solution[q.id].sector}  ${r.solution[q.id].type}`);
  }
}

console.log(`\n(field is ${RING_COUNT} rings x 8 segments)`);
