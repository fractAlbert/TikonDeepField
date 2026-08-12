// The Constellation's geometry, in one place.
//
// Split out of the view on 2026-08-11 the moment `solvability.ts` had to know
// what the instrument reveals. Two copies of "which signatures does it show"
// would be exactly the duplication that put `VISIBILITY_RANGE = 5` into
// twelve files with a comment in each saying it must match the others - and
// here the cost of drift is worse than a wrong pixel: the solver would be
// modelling an instrument the player does not have.

import { Region, Sector } from "./puzzle-types";
import { SEGMENT_COUNT, buildSectors } from "./grid";

const sectorLookup = new Map(buildSectors().map((s) => [s.id, s]));

/** Deterministic per region, so nothing re-rolls between renders or runs. */
export function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Which signatures the Constellation shows.
 *
 * Seeded off the region id and **not** off the solution, which matters for
 * the solver: every candidate assignment is scored on the same set of names,
 * so the comparison is like with like. Seeding off positions would make the
 * subset itself depend on the answer.
 */
export function constellationSubset(region: Region, count: number): string[] {
  const rand = seededRandom(region.id);
  const order = Object.keys(region.solution);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.slice(0, Math.min(count, order.length));
}

/** The whole-segment turn this region's Constellation is drawn at. */
export function constellationTurn(region: Region): number {
  const rand = seededRandom(region.id);
  // Burn the same draws the subset shuffle takes, so the turn is independent
  // of it rather than correlated with it.
  const n = Object.keys(region.solution).length;
  for (let i = n - 1; i > 0; i--) rand();
  return Math.floor(rand() * SEGMENT_COUNT);
}

/** Polar cell to a point. `ring + 1` so the inner ring is not all one spot. */
export function sectorPoint(sector: Sector): { x: number; y: number } {
  const r = sector.ring + 1;
  const theta = (sector.seg / SEGMENT_COUNT) * Math.PI * 2;
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
}

export function pointOfSectorId(id: string): { x: number; y: number } {
  return sectorPoint(sectorLookup.get(id)!);
}

/**
 * What the Constellation actually tells you, as one comparable string.
 *
 * The picture is rotated and rescaled, so no position in it means anything.
 * What survives is the labelled shape: the pairwise distances between the
 * shown signatures, tagged with the pair's classifications, normalised by the
 * largest. Rotation drops out because distances ignore it; scale drops out
 * because of the normalisation; and the classifications are in because the
 * instrument prints them.
 *
 * Returns null when the region has no Constellation - built-ins and anything
 * generated before it existed.
 */
export function constellationKey(
  region: Region,
  placement: (name: string) => { x: number; y: number } | undefined,
  count = region.constellationStars
): string | null {
  if (!count) return null;
  const names = constellationSubset(region, count);
  if (names.length < 2) return null;

  const parts: { label: string; d: number }[] = [];
  for (let a = 0; a < names.length; a++) {
    for (let b = a + 1; b < names.length; b++) {
      const pa = placement(names[a]);
      const pb = placement(names[b]);
      if (!pa || !pb) return null;
      const label = [region.solution[names[a]].type, region.solution[names[b]].type]
        .sort()
        .join(">");
      parts.push({ label, d: Math.hypot(pa.x - pb.x, pa.y - pb.y) });
    }
  }
  const max = Math.max(...parts.map((p) => p.d));
  if (max === 0) return null;
  return parts
    .map((p) => `${p.label}:${(p.d / max).toFixed(4)}`)
    .sort()
    .join("|");
}
