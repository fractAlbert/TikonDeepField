// Could this region have been solved at all?
//
// Not the same question as "did the player solve it". A region is
// unsolvable when two different assignments produce identical readings on
// every instrument, so no amount of correct reasoning separates them - see
// docs/instrument-analysis.md for why that happens (the field's distance
// metric is Manhattan, so a signature can slide one ring out and one
// segment over with every reading unchanged).
//
// Recorded at generation so the Survey Log can tell "you missed this one"
// from "nobody could have got this", which is the difference between a
// player being bad at the game and the game being unfair to them.

import { buildSectors, orthogonalDistanceSigned, quadrantOf } from "./grid";
import { Quadrant, Region, Sector } from "./puzzle-types";
import { RING_SCAN_LIMIT } from "./survey-log";
import { constellationKey, sectorPoint } from "./constellation";

// Single source of truth since 2026-08-11 - it was a bare 5 in twelve files.
import { VISIBILITY_RANGE } from "./experiments";
const OUT_OF_RANGE = 99;
const QUADRANTS: Quadrant[] = ["I", "II", "III", "IV"];

const sectors = buildSectors();
const sectorLookup = new Map(sectors.map((s) => [s.id, s]));

/** What the Sweep Scope actually shows for a pair: a distance, or "far". */
function observed(a: Sector, b: Sector): number {
  const d = Math.abs(orthogonalDistanceSigned(a, b));
  return d <= VISIBILITY_RANGE ? d : OUT_OF_RANGE;
}

/**
 * Counts assignments consistent with everything observable, stopping at 2 -
 * which is all that is needed to answer "is it unique?".
 *
 * `ringKnown` is the set of signatures whose ring the player has learned
 * from a Ring Scan. Everything else is always available: the briefing's
 * anchors and quadrant clues, and the full pairwise distance matrix a
 * player gets by cycling the Sweep Scope through every reference.
 */
function countConsistent(region: Region, ringKnown: Set<string>): number {
  const names = Object.keys(region.solution);
  const truth = new Map(names.map((n) => [n, sectorLookup.get(region.solution[n].sector)!]));

  const fixed = new Map<string, string>();
  const quadClue = new Map<string, Quadrant>();
  const typeOfQuasar = new Map<string, string>();
  const quadrantOfType = new Map<string, Quadrant>();
  const quadrantSetOfType = new Map<string, Quadrant[]>();
  for (const clue of region.clues) {
    if (clue.negate) continue;
    if (clue.kind === "quasar-sector") fixed.set(clue.quasar, clue.sector);
    if (clue.kind === "quasar-quadrant") quadClue.set(clue.quasar, clue.quadrant);
    if (clue.kind === "quasar-type") typeOfQuasar.set(clue.quasar, clue.type);
    if (clue.kind === "type-quadrant") quadrantOfType.set(clue.type, clue.quadrant);
    if (clue.kind === "type-quadrant-set") quadrantSetOfType.set(clue.type, clue.quadrants);
  }

  // What a chain actually constrains: the named signature lies in one of the
  // quadrants its classification is confined to.
  //
  // This is **weaker** than a direct quadrant clue whenever the type is held
  // by signatures in more than one quadrant, which is the design - the user
  // wanted a clue that helps and misleads at once. So unlike the first
  // version of this fold, it is not an equivalence and regions carrying
  // chains really are harder. That is measured rather than assumed; see
  // `docs/region-difficulty.md`.
  const allowedQuadrants = new Map<string, Set<Quadrant>>();
  for (const [quasar, type] of typeOfQuasar) {
    const set = quadrantSetOfType.get(type);
    if (set) allowedQuadrants.set(quasar, new Set(set));
    // Regions generated before 2026-08-11 carry the single-quadrant form.
    // Saves outlive schema changes, so both are read.
    const single = quadrantOfType.get(type);
    if (single !== undefined) quadClue.set(quasar, single);
  }

  // Directed: the signed metric is antisymmetric, so a symmetric lookup
  // would compare a reading against its own negation.
  const trueDist = new Map<string, number>();
  for (const a of names)
    for (const b of names)
      if (a !== b) trueDist.set(`${a}|${b}`, observed(truth.get(a)!, truth.get(b)!));

  const trueQuadTotals = [0, 0, 0, 0];
  for (const n of names) trueQuadTotals[QUADRANTS.indexOf(quadrantOf(truth.get(n)!))]++;

  // What the Constellation shows, reduced to one comparable string. The
  // shape and the classifications on it, with rotation and scale divided
  // out - see `constellation.ts`, which the view uses too so the solver
  // cannot end up modelling an instrument the player does not have.
  const constellationOf = (place: Map<string, Sector>) =>
    constellationKey(region, (n) => {
      const s = place.get(n);
      return s ? sectorPoint(s) : undefined;
    });

  const trueConstellation = constellationOf(new Map(names.map((n) => [n, truth.get(n)!])));

  // Anchored first, so pruning bites earliest.
  const order = [...names].sort((a, b) => (fixed.has(b) ? 1 : 0) - (fixed.has(a) ? 1 : 0));
  const assigned = new Map<string, Sector>();
  const used = new Set<string>();
  let found = 0;

  function recurse(i: number) {
    if (found >= 2) return;
    if (i === order.length) {
      const totals = [0, 0, 0, 0];
      for (const s of assigned.values()) totals[QUADRANTS.indexOf(quadrantOf(s))]++;
      if (totals.some((t, k) => t !== trueQuadTotals[k])) return;
      // The Constellation, checked at the leaf because it is a property of
      // the whole arrangement rather than of one placement.
      //
      // A shipped instrument is part of what a player can know, so leaving it
      // out would make this report regions as unsolvable that the
      // Constellation settles - and that verdict is the one thing the Survey
      // Log promises is not the player's fault. Under-counting information
      // here is not a safe lower bound; it is a false accusation.
      if (trueConstellation && constellationOf(assigned) !== trueConstellation) return;
      found++;
      return;
    }
    const name = order[i];
    const candidates = fixed.has(name) ? [sectorLookup.get(fixed.get(name)!)!] : sectors;
    for (const cand of candidates) {
      if (used.has(cand.id)) continue;
      if (quadClue.has(name) && quadrantOf(cand) !== quadClue.get(name)) continue;
      const allowed = allowedQuadrants.get(name);
      if (allowed && !allowed.has(quadrantOf(cand))) continue;
      if (ringKnown.has(name) && cand.ring !== truth.get(name)!.ring) continue;
      let ok = true;
      for (const [other, os] of assigned) {
        if (observed(cand, os) !== trueDist.get(`${name}|${other}`)!) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      assigned.set(name, cand);
      used.add(cand.id);
      recurse(i + 1);
      assigned.delete(name);
      used.delete(cand.id);
      if (found >= 2) return;
    }
  }

  recurse(0);
  return found;
}

/**
 * Is the region uniquely determined when exactly these signatures' rings
 * are known? Pass nothing for "with no scans spent".
 *
 * Exported for `scripts/find-tutorial-region.ts`, which has to ask a
 * sharper question than `assessSolvability` answers: not *can* this be
 * solved with the scan budget, but does it **require** a scan, and does
 * exactly one suffice. A tutorial region has to force the instrument it
 * is teaching. Sharing this rather than re-deriving it in the script is
 * the point - a finder that measured solvability its own way could bless
 * a region the app then judges differently.
 */
export function uniqueWithRingsKnown(region: Region, ringKnown: Iterable<string> = []): boolean {
  return countConsistent(region, new Set(ringKnown)) === 1;
}

/** Every k-sized subset of `items`. */
function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [head, ...rest] = items;
  return [...combinations(rest, k - 1).map((c) => [head, ...c]), ...combinations(rest, k)];
}

export interface Solvability {
  /** Unique from the briefing and instruments alone, spending no scans. */
  withoutScans: boolean;
  /**
   * Unique for a player who aimed their ring scans at the right signatures.
   * A best case, not a prediction - it asks whether *some* choice works,
   * not whether a human would find it.
   */
  withBestScans: boolean;
}

/**
 * Assesses a region. Cheap in practice - about 0.4ms average, measured by
 * `scripts/check-solvability-flag.ts` - because most regions resolve
 * without scans and take the early return, and only the rest pay for the
 * subset search.
 *
 * Kept out of `generateRegion` for separation rather than cost: the
 * analysis scripts generate regions in order to measure solvability
 * themselves, and having the generator hand them a verdict they would
 * ignore is both wasted and circular. The one caller that wants the answer
 * asks for it.
 */
export function assessSolvability(region: Region): Solvability {
  const anchored = new Set(
    region.clues.filter((c) => c.kind === "quasar-sector").map((c) => c.quasar)
  );
  const scannable = Object.keys(region.solution).filter((n) => !anchored.has(n));

  const withoutScans = countConsistent(region, new Set()) === 1;
  if (withoutScans) return { withoutScans: true, withBestScans: true };

  const budget = Math.min(RING_SCAN_LIMIT, scannable.length);
  const withBestScans = combinations(scannable, budget).some(
    (pick) => countConsistent(region, new Set(pick)) === 1
  );
  return { withoutScans, withBestScans };
}
