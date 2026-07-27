import { Quadrant, Sector } from "./puzzle-types";

export const RING_COUNT = 5;
export const SEGMENT_COUNT = 8;

export function sectorId(ring: number, seg: number): string {
  return `R${ring + 1}S${seg + 1}`;
}

export function buildSectors(): Sector[] {
  const sectors: Sector[] = [];
  for (let ring = 0; ring < RING_COUNT; ring++) {
    for (let seg = 0; seg < SEGMENT_COUNT; seg++) {
      sectors.push({ id: sectorId(ring, seg), ring, seg });
    }
  }
  return sectors;
}

function segDiff(a: number, b: number): number {
  return ((a - b) % SEGMENT_COUNT + SEGMENT_COUNT) % SEGMENT_COUNT;
}

/** Same ring with adjacent (wrap-aware) segments, or same segment with adjacent rings. */
export function sectorsAreAdjacent(a: Sector, b: Sector): boolean {
  if (a.ring === b.ring) {
    const d = segDiff(a.seg, b.seg);
    return d === 1 || d === SEGMENT_COUNT - 1;
  }
  if (a.seg === b.seg) {
    return Math.abs(a.ring - b.ring) === 1;
  }
  return false;
}

/** Is `a` inward/outward of `b`? Only meaningful along the same segment (bearing). */
export function isRadialDirection(
  a: Sector,
  direction: "inward" | "outward",
  b: Sector
): boolean {
  if (a.seg !== b.seg) return false;
  return direction === "inward" ? a.ring < b.ring : a.ring > b.ring;
}

/**
 * Is `a` clockwise/counterclockwise of `b`? Only meaningful along the same
 * ring. Segment index increases clockwise. Directly opposite (halfway
 * around) counts as neither.
 */
export function isAngularDirection(
  a: Sector,
  direction: "clockwise" | "counterclockwise",
  b: Sector
): boolean {
  if (a.ring !== b.ring) return false;
  const half = SEGMENT_COUNT / 2;
  const diff = segDiff(a.seg, b.seg); // 0..SEGMENT_COUNT-1
  if (diff === 0 || diff === half) return false;
  return direction === "clockwise" ? diff < half : diff > half;
}

/** Max possible orthogonal distance between any two sectors (see below). */
export const MAX_ORTHOGONAL_DISTANCE = RING_COUNT - 1 + SEGMENT_COUNT / 2;

/**
 * Orthogonal (Manhattan) distance from `ref` to `target`: ring-steps plus
 * segment-hops, moving along one axis at a time rather than diagonally.
 * E.g. R5S3 -> R1S1 is ring diff 4 + segment hop 2 = 6.
 *
 * Signed by segment-hop direction (positive = clockwise, negative =
 * counterclockwise) so a caller can place `target` on either side of
 * `ref`. A pair on the same segment (hop 0, pure ring difference) has no
 * natural direction, so it's arbitrarily signed positive.
 */
export function orthogonalDistanceSigned(ref: Sector, target: Sector): number {
  const ringDiff = Math.abs(target.ring - ref.ring);
  let segHop = segDiff(target.seg, ref.seg);
  if (segHop > SEGMENT_COUNT / 2) segHop -= SEGMENT_COUNT;
  const magnitude = ringDiff + Math.abs(segHop);
  const sign = segHop < 0 ? -1 : 1;
  return sign * magnitude;
}

export const QUADRANTS: Quadrant[] = ["I", "II", "III", "IV"];

/**
 * A quadrant is a quarter-slice of the field spanning every ring: segments
 * 0-1 -> I, 2-3 -> II, 4-5 -> III, 6-7 -> IV (8 segments / 4 quadrants = 2
 * segments each, which is the whole reason SEGMENT_COUNT is 8).
 */
export function quadrantOf(sector: Sector): Quadrant {
  const segmentsPerQuadrant = SEGMENT_COUNT / QUADRANTS.length;
  return QUADRANTS[Math.floor(sector.seg / segmentsPerQuadrant)];
}
