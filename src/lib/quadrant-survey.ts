import { Quadrant, Region } from "./puzzle-types";
import { buildSectors, quadrantOf } from "./grid";

export interface QuadrantSurveyResult {
  quadrant: Quadrant;
  totalSignatures: number;
  byType: { type: string; count: number }[];
}

/**
 * Ground-truth report for one quadrant: how many quasars (across every ring
 * and both segments the quadrant spans) sit in it, broken down by type.
 * This is a real information source (like the clue log or Sweep Scope),
 * not a display of the player's own guesses - it reveals counts/types but
 * not which specific signature, which ring, or which of the quadrant's two
 * segments.
 */
export function surveyQuadrant(region: Region, quadrant: Quadrant): QuadrantSurveyResult {
  const sectorLookup = new Map(buildSectors().map((s) => [s.id, s]));
  const counts = new Map<string, number>();
  let total = 0;

  for (const qid in region.solution) {
    const entry = region.solution[qid];
    const sector = sectorLookup.get(entry.sector);
    if (sector && quadrantOf(sector) === quadrant) {
      total++;
      counts.set(entry.type, (counts.get(entry.type) ?? 0) + 1);
    }
  }

  return {
    quadrant,
    totalSignatures: total,
    byType: [...counts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type)),
  };
}
