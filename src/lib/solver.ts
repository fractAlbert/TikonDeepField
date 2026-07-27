import { Region, Solution } from "./puzzle-types";
import { buildSectors } from "./grid";
import { partialAssignmentIsConsistent } from "./clue-eval";

/**
 * Order-independent equality for two full solutions. Plain JSON.stringify
 * comparison is key-order sensitive, and solveRegion's search order (most-
 * constrained quasar first) doesn't match a region's natural quasar order,
 * so two solutions with identical quasar->{type,sector} mappings can still
 * stringify differently.
 */
export function solutionsEqual(a: Solution, b: Solution): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (k) => b[k] && a[k].type === b[k].type && a[k].sector === b[k].sector
  );
}

/**
 * Backtracking search for assignments (Quasar -> {type, sector}) that
 * satisfy every clue in a region. The sector field is chosen from all 40
 * positions in the fixed polar field, so a brute-force permutation search
 * (as used when sectors == quasars 1:1) is infeasible - this prunes via
 * `partialAssignmentIsConsistent` after every single (type, sector) pick,
 * so branches get cut long before the nominal search space is explored.
 *
 * Sectors are still a bijection (each sector holds at most one quasar) but
 * types are NOT - a type can be reused across multiple quasars (see
 * generate-region.ts), so unlike sectors there is no "used types" set here.
 *
 * Two search-order optimizations keep this fast even with 6-8 quasars and
 * a 40-sector field: a direct `quasar-type`/`quasar-sector` clue collapses
 * that quasar's candidate list to a single value instead of iterating
 * everything, and quasars with such direct clues are placed first so the
 * search prunes as early as possible.
 *
 * Stops as soon as `maxSolutions` are found (default 2, enough to detect
 * ambiguity without exhaustively enumerating every solution).
 */
export function solveRegion(region: Region, maxSolutions = 2): Solution[] {
  const sectors = buildSectors();
  const sectorLookup = new Map(sectors.map((s) => [s.id, s]));
  const sectorIds = sectors.map((s) => s.id);
  const types = region.quasarTypes;

  const forcedType = new Map<string, string>();
  const forcedSector = new Map<string, string>();
  for (const clue of region.clues) {
    if (clue.negate) continue;
    if (clue.kind === "quasar-type") forcedType.set(clue.quasar, clue.type);
    if (clue.kind === "quasar-sector") forcedSector.set(clue.quasar, clue.sector);
  }

  const quasarIds = region.quasars
    .map((q) => q.id)
    .sort((a, b) => {
      const score = (id: string) => (forcedType.has(id) ? 1 : 0) + (forcedSector.has(id) ? 1 : 0);
      return score(b) - score(a);
    });

  const results: Solution[] = [];
  const assignment: Solution = {};
  const usedSectors = new Set<string>();

  function backtrack(i: number) {
    if (results.length >= maxSolutions) return;
    if (i === quasarIds.length) {
      results.push(JSON.parse(JSON.stringify(assignment)));
      return;
    }
    const qid = quasarIds[i];
    const typeCandidates = forcedType.has(qid) ? [forcedType.get(qid)!] : types;
    const sectorCandidates = forcedSector.has(qid) ? [forcedSector.get(qid)!] : sectorIds;

    for (const type of typeCandidates) {
      for (const sectorId of sectorCandidates) {
        if (usedSectors.has(sectorId)) continue;

        assignment[qid] = { type, sector: sectorId };
        usedSectors.add(sectorId);

        if (partialAssignmentIsConsistent(region, assignment, sectorLookup)) {
          backtrack(i + 1);
        }

        delete assignment[qid];
        usedSectors.delete(sectorId);

        if (results.length >= maxSolutions) return;
      }
    }
  }

  backtrack(0);
  return results;
}
