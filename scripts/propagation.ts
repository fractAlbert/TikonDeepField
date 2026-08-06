// The propagation solver, shared by the scripts that measure how much
// *work* a region takes rather than whether its answer is unique.
//
// Extracted from `measure-deduction-depth.ts` on 2026-08-04, when a second
// script needed it. Duplicating a solver is how two measurements quietly
// stop describing the same game.
//
// The model is ordinary constraint propagation, which maps onto Sudoku
// technique directly: start from the briefing's anchors, narrow every
// unresolved signature's candidates against everything currently known,
// promote any that drop to a single candidate, and repeat. A signature
// resolved in round 1 is a naked single off the anchors; one that needs
// round 3 required two others to be pinned first. If a round resolves
// nothing, propagation is stuck - what remains needs a global argument.

import { RING_COUNT, buildSectors, orthogonalDistanceSigned, quadrantOf } from "../src/lib/grid";
import { Quadrant, Region, Sector } from "../src/lib/puzzle-types";

const VISIBILITY_RANGE = 5;
const OUT_OF_RANGE = 99;

const sectors = buildSectors();
const sectorLookup = new Map(sectors.map((s) => [s.id, s]));

function observed(a: Sector, b: Sector): number {
  const d = Math.abs(orthogonalDistanceSigned(a, b));
  return d <= VISIBILITY_RANGE ? d : OUT_OF_RANGE;
}

export interface Config {
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
  /**
   * High-energy scan: exact sector for this many signatures, handed over
   * before the player starts. Unlike a ring scan, which leaves the
   * signature to be placed, a pinpoint removes it from the puzzle
   * entirely - which is precisely the cost being measured here.
   */
  pinpointBudget?: number;
}

export interface Outcome {
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

export function solveByPropagation(region: Region, cfg: Config): Outcome {
  const names = Object.keys(region.solution);
  const truth = new Map(names.map((n) => [n, sectorLookup.get(region.solution[n].sector)!]));

  const fixed = new Map<string, string>();
  const quadClue = new Map<string, Quadrant>();
  for (const clue of region.clues) {
    if (clue.negate) continue;
    if (clue.kind === "quasar-sector") fixed.set(clue.quasar, clue.sector);
    if (clue.kind === "quasar-quadrant") quadClue.set(clue.quasar, clue.quadrant);
  }

  const allUnanchored = names.filter((n) => !fixed.has(n));
  // Pinpointed signatures join the anchors: fully known, and no longer
  // part of the puzzle at all.
  const pinpointed = allUnanchored.slice(0, cfg.pinpointBudget ?? 0);
  const unanchored = allUnanchored.slice(cfg.pinpointBudget ?? 0);
  const ringKnown = new Set<string>(
    cfg.ringBudget === "all" ? unanchored : unanchored.slice(0, cfg.ringBudget)
  );

  const known = new Map<string, Sector>();
  for (const [n, sid] of fixed) known.set(n, sectorLookup.get(sid)!);
  for (const n of pinpointed) known.set(n, truth.get(n)!);

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
