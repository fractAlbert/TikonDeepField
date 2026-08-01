// How much *work* is left in a region, not just whether it can be solved.
//
// analyze-solvability.ts answers "is the answer unique?". That is the wrong
// question for a difficulty argument: Sudoku is fully deterministic and
// unique too, and is enjoyed precisely for the grind of getting there. What
// distinguishes a good Sudoku from a Sudoku that arrives 90% filled in is
// the number and depth of inference steps, so that is what this measures.
//
// The model is ordinary constraint propagation, which maps onto Sudoku
// solving technique directly:
//
//   - Start from what the briefing gives you (the two exact anchors).
//   - Each round, narrow every unresolved signature's candidate sectors
//     against everything currently known, and promote any that drop to a
//     single candidate.
//   - A signature resolved in round 1 is a "naked single" off the anchors.
//     One that needs round 3 required two other signatures to be pinned
//     first - a chain, and the interesting kind of step.
//   - If a round resolves nothing, propagation is stuck: what remains needs
//     a global argument (quadrant totals, mutual exclusion) rather than
//     pairwise elimination. That is the hardest tier.
//
// Usage: npx tsx scripts/measure-deduction-depth.ts [samples]

import { RING_COUNT, buildSectors, orthogonalDistanceSigned, quadrantOf } from "../src/lib/grid";
import { generateRegion } from "../src/lib/generate-region";
import { Quadrant, Region, Sector } from "../src/lib/puzzle-types";

const SAMPLES = Number(process.argv[2] ?? 1500);
const VISIBILITY_RANGE = 5;
const OUT_OF_RANGE = 99;

const sectors = buildSectors();
const sectorLookup = new Map(sectors.map((s) => [s.id, s]));

function observed(a: Sector, b: Sector): number {
  const d = Math.abs(orthogonalDistanceSigned(a, b));
  return d <= VISIBILITY_RANGE ? d : OUT_OF_RANGE;
}

interface Config {
  label: string;
  /** How many un-anchored signatures have had their ring surveyed. */
  ringBudget: number | "all";
  /**
   * Type-based variant: per-ring signature totals, naming nobody. Applied
   * as the one rule a human would actually use - once a ring holds its
   * full quota of resolved signatures, nothing else can be in it. That is
   * the "this box is full" move from Sudoku, and it is conservative: a
   * sharper solver would also spot rings whose remaining quota exactly
   * matches the candidates left for them.
   */
  ringTotals?: boolean;
}

interface Outcome {
  /** Rounds of propagation needed; 0 if nothing was ever resolvable. */
  rounds: number;
  /** Signatures resolved per round, index 0 = first round. */
  perRound: number[];
  /** Left unresolved when propagation stalled. */
  stuck: number;
  /** Candidate sectors eliminated across the whole solve - raw work done. */
  eliminations: number;
  /** Unknowns at the start (everything but the two anchors). */
  unknowns: number;
}

function solveByPropagation(region: Region, cfg: Config): Outcome {
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
  const ringKnown = new Set<string>(
    cfg.ringBudget === "all" ? unanchored : unanchored.slice(0, cfg.ringBudget)
  );

  const known = new Map<string, Sector>();
  for (const [n, sid] of fixed) known.set(n, sectorLookup.get(sid)!);

  // Initial candidate sets, before any distance reasoning: everything the
  // briefing and the Ring Survey allow.
  const candidates = new Map<string, Sector[]>();
  for (const n of unanchored) {
    candidates.set(
      n,
      sectors.filter(
        (s) =>
          (!quadClue.has(n) || quadrantOf(s) === quadClue.get(n)) &&
          (!ringKnown.has(n) || s.ring === truth.get(n)!.ring)
      )
    );
  }

  const perRound: number[] = [];
  let eliminations = 0;

  const trueRingTotals = new Array(RING_COUNT).fill(0) as number[];
  for (const n of names) trueRingTotals[truth.get(n)!.ring]++;

  for (;;) {
    const usedSectors = new Set([...known.values()].map((s) => s.id));
    let resolvedThisRound = 0;

    const fullRings = new Set<number>();
    if (cfg.ringTotals) {
      const perRing = new Array(RING_COUNT).fill(0) as number[];
      for (const s of known.values()) perRing[s.ring]++;
      for (let r = 0; r < RING_COUNT; r++) if (perRing[r] >= trueRingTotals[r]) fullRings.add(r);
    }

    for (const n of unanchored) {
      if (known.has(n)) continue;
      const before = candidates.get(n)!;
      const after = before.filter((cand) => {
        if (usedSectors.has(cand.id)) return false;
        if (fullRings.has(cand.ring)) return false;
        for (const [k, ks] of known) {
          if (observed(cand, ks) !== observed(truth.get(n)!, truth.get(k)!)) return false;
        }
        return true;
      });
      eliminations += before.length - after.length;
      candidates.set(n, after);
    }

    // Promote in a second pass, so everything in a round narrows against
    // the same known set - otherwise the answer depends on iteration order.
    for (const n of unanchored) {
      if (known.has(n)) continue;
      if (candidates.get(n)!.length === 1) {
        known.set(n, candidates.get(n)![0]);
        resolvedThisRound++;
      }
    }

    if (resolvedThisRound === 0) break;
    perRound.push(resolvedThisRound);
  }

  const stuck = unanchored.filter((n) => !known.has(n)).length;
  return { rounds: perRound.length, perRound, stuck, eliminations, unknowns: unanchored.length };
}

// ---------------------------------------------------------------------

const configs: Config[] = [
  { label: "Today (no ring survey)", ringBudget: 0 },
  { label: "By type (per-ring totals, names nobody)", ringBudget: 0, ringTotals: true },
  { label: "By signature, budget of 2", ringBudget: 2 },
  { label: "By signature, budget of 3", ringBudget: 3 },
  { label: "By signature, unlimited", ringBudget: "all" },
];

console.log(`Propagation depth over ${SAMPLES} regions per configuration.\n`);

for (const cfg of configs) {
  let fullySolved = 0;
  let totalRounds = 0;
  let totalElim = 0;
  let totalUnknowns = 0;
  let stuckTotal = 0;
  const roundHistogram = new Map<number, number>();
  // How many signatures fell out at each depth, pooled across regions.
  const depthCounts = new Map<number, number>();

  for (let i = 0; i < SAMPLES; i++) {
    const region = generateRegion();
    const r = solveByPropagation(region, cfg);
    totalUnknowns += r.unknowns;
    totalElim += r.eliminations;
    stuckTotal += r.stuck;
    if (r.stuck === 0) {
      fullySolved++;
      totalRounds += r.rounds;
      roundHistogram.set(r.rounds, (roundHistogram.get(r.rounds) ?? 0) + 1);
    }
    r.perRound.forEach((count, depth) => {
      depthCounts.set(depth + 1, (depthCounts.get(depth + 1) ?? 0) + count);
    });
  }

  const solvedPct = (fullySolved / SAMPLES) * 100;
  console.log(`${cfg.label}`);
  console.log(
    `  Fully resolved by propagation alone: ${solvedPct.toFixed(1)}%  ` +
      `(the rest need a global argument or are ambiguous)`
  );
  console.log(
    `  Mean rounds when it does resolve:    ${(totalRounds / Math.max(1, fullySolved)).toFixed(2)}`
  );
  console.log(
    `  Rounds distribution:                 ${[...roundHistogram.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([k, v]) => `${k}:${((v / fullySolved) * 100).toFixed(0)}%`)
      .join("  ")}`
  );
  console.log(
    `  Signatures resolved at each depth:   ${[...depthCounts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([k, v]) => `r${k}:${((v / totalUnknowns) * 100).toFixed(0)}%`)
      .join("  ")}`
  );
  console.log(
    `  Mean candidate eliminations/region:  ${(totalElim / SAMPLES).toFixed(0)}`
  );
  console.log(
    `  Mean signatures left stuck:          ${(stuckTotal / SAMPLES).toFixed(2)} ` +
      `of ${(totalUnknowns / SAMPLES).toFixed(1)} unknown\n`
  );
}
