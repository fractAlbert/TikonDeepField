import { Clue, Region, Sector, Solution } from "./puzzle-types";
import { isAngularDirection, isRadialDirection, quadrantOf, sectorsAreAdjacent } from "./grid";

type SectorLookup = Map<string, Sector>;
type PartialSolution = Partial<Solution>;

/**
 * A type-based clue ("the Pulsar-Class signature is at...") presupposes
 * exactly one quasar has that type. Types can repeat now, so that
 * presupposition has to be checked, not assumed:
 *  - "none" yet assigned  -> indeterminate (null), wait for more info.
 *  - exactly "one"        -> resolve normally.
 *  - "multiple"           -> the clue's premise is violated - definitely
 *    false, which is what lets the solver prune a branch where a type a
 *    clue talks about has been (wrongly) given to two quasars, since
 *    nothing else about the search space itself forbids that.
 */
type TypeResolution = { kind: "none" } | { kind: "one"; sector: string } | { kind: "multiple" };

function resolveType(assignment: PartialSolution, type: string): TypeResolution {
  const sectors: string[] = [];
  for (const key in assignment) {
    if (assignment[key]?.type === type) sectors.push(assignment[key]!.sector);
  }
  if (sectors.length === 0) return { kind: "none" };
  if (sectors.length === 1) return { kind: "one", sector: sectors[0] };
  return { kind: "multiple" };
}

/** Combine two type resolutions into either a pair of sectors, "not yet", or "false". */
function resolvePair(
  assignment: PartialSolution,
  typeA: string,
  typeB: string
): { sa: string; sb: string } | "indeterminate" | false {
  const ra = resolveType(assignment, typeA);
  const rb = resolveType(assignment, typeB);
  if (ra.kind === "multiple" || rb.kind === "multiple") return false;
  if (ra.kind === "none" || rb.kind === "none") return "indeterminate";
  return { sa: ra.sector, sb: rb.sector };
}

function sectorOfQuasar(assignment: PartialSolution, quasarId: string): string | undefined {
  return assignment[quasarId]?.sector;
}

/** Combine two quasars' sectors into a pair, or "not yet" if either isn't assigned. */
function pairOfQuasars(
  assignment: PartialSolution,
  quasarA: string,
  quasarB: string
): { sa: string; sb: string } | "indeterminate" {
  const sa = sectorOfQuasar(assignment, quasarA);
  const sb = sectorOfQuasar(assignment, quasarB);
  if (!sa || !sb) return "indeterminate";
  return { sa, sb };
}

/**
 * Evaluate a single clue against a (possibly partial) assignment.
 * Returns null when the clue can't be determined yet - i.e. it references
 * a quasar or type that hasn't been assigned a sector yet - rather than
 * throwing, so a backtracking solver can prune only on definite `false`.
 */
export function evalClue(
  clue: Clue,
  assignment: PartialSolution,
  sectors: SectorLookup
): boolean | null {
  const result = evaluateRaw(clue, assignment, sectors);
  if (result === null) return null;
  return clue.negate ? !result : result;
}

function evaluateRaw(
  clue: Clue,
  assignment: PartialSolution,
  sectors: SectorLookup
): boolean | null {
  switch (clue.kind) {
    case "quasar-type": {
      const entry = assignment[clue.quasar];
      if (!entry) return null;
      return entry.type === clue.type;
    }

    case "quasar-sector": {
      const entry = assignment[clue.quasar];
      if (!entry) return null;
      return entry.sector === clue.sector;
    }

    case "type-sector": {
      const r = resolveType(assignment, clue.type);
      if (r.kind === "none") return null;
      if (r.kind === "multiple") return false;
      return r.sector === clue.sector;
    }

    case "type-ring": {
      const r = resolveType(assignment, clue.type);
      if (r.kind === "none") return null;
      if (r.kind === "multiple") return false;
      return sectors.get(r.sector)!.ring === clue.ring;
    }

    case "type-segment": {
      const r = resolveType(assignment, clue.type);
      if (r.kind === "none") return null;
      if (r.kind === "multiple") return false;
      return sectors.get(r.sector)!.seg === clue.segment;
    }

    case "quasar-quadrant": {
      const entry = assignment[clue.quasar];
      if (!entry) return null;
      return quadrantOf(sectors.get(entry.sector)!) === clue.quadrant;
    }

    case "type-quadrant-set": {
      // "Every signature of this type is in one of these quadrants."
      //
      // Checked as the *monotone* half only: every already-placed signature
      // of the type must lie inside the listed set. The other half - that
      // each listed quadrant holds at least one - cannot be judged from a
      // partial assignment, because a signature not yet placed could still
      // fill an empty one. Testing only the half that can never be undone by
      // a later placement is what makes this safe to evaluate mid-search: it
      // can reject, but it can never reject something that would have come
      // good.
      const holders = Object.keys(assignment).filter((k) => assignment[k]?.type === clue.type);
      if (holders.length === 0) return null;
      const listed = new Set(clue.quadrants);
      for (const k of holders) {
        const sector = sectors.get(assignment[k]!.sector);
        if (!sector) return null;
        if (!listed.has(quadrantOf(sector))) return false;
      }
      return true;
    }

    case "type-quadrant": {
      const r = resolveType(assignment, clue.type);
      if (r.kind === "none") return null;
      if (r.kind === "multiple") return false;
      return quadrantOf(sectors.get(r.sector)!) === clue.quadrant;
    }

    case "type-adjacent-type": {
      const pair = resolvePair(assignment, clue.typeA, clue.typeB);
      if (pair === false) return false;
      if (pair === "indeterminate") return null;
      return sectorsAreAdjacent(sectors.get(pair.sa)!, sectors.get(pair.sb)!);
    }

    case "quasar-adjacent-quasar": {
      const sa = sectorOfQuasar(assignment, clue.quasarA);
      const sb = sectorOfQuasar(assignment, clue.quasarB);
      if (!sa || !sb) return null;
      return sectorsAreAdjacent(sectors.get(sa)!, sectors.get(sb)!);
    }

    case "type-same-ring-type": {
      const pair = resolvePair(assignment, clue.typeA, clue.typeB);
      if (pair === false) return false;
      if (pair === "indeterminate") return null;
      return sectors.get(pair.sa)!.ring === sectors.get(pair.sb)!.ring;
    }

    case "type-same-segment-type": {
      const pair = resolvePair(assignment, clue.typeA, clue.typeB);
      if (pair === false) return false;
      if (pair === "indeterminate") return null;
      return sectors.get(pair.sa)!.seg === sectors.get(pair.sb)!.seg;
    }

    case "type-radial": {
      const pair = resolvePair(assignment, clue.typeA, clue.typeB);
      if (pair === false) return false;
      if (pair === "indeterminate") return null;
      return isRadialDirection(sectors.get(pair.sa)!, clue.direction, sectors.get(pair.sb)!);
    }

    case "type-angular": {
      const pair = resolvePair(assignment, clue.typeA, clue.typeB);
      if (pair === false) return false;
      if (pair === "indeterminate") return null;
      return isAngularDirection(sectors.get(pair.sa)!, clue.direction, sectors.get(pair.sb)!);
    }

    case "quasar-same-ring": {
      const pair = pairOfQuasars(assignment, clue.quasarA, clue.quasarB);
      if (pair === "indeterminate") return null;
      return sectors.get(pair.sa)!.ring === sectors.get(pair.sb)!.ring;
    }

    case "quasar-same-segment": {
      const pair = pairOfQuasars(assignment, clue.quasarA, clue.quasarB);
      if (pair === "indeterminate") return null;
      return sectors.get(pair.sa)!.seg === sectors.get(pair.sb)!.seg;
    }

    case "quasar-radial": {
      const pair = pairOfQuasars(assignment, clue.quasarA, clue.quasarB);
      if (pair === "indeterminate") return null;
      return isRadialDirection(sectors.get(pair.sa)!, clue.direction, sectors.get(pair.sb)!);
    }

    case "quasar-angular": {
      const pair = pairOfQuasars(assignment, clue.quasarA, clue.quasarB);
      if (pair === "indeterminate") return null;
      return isAngularDirection(sectors.get(pair.sa)!, clue.direction, sectors.get(pair.sb)!);
    }
  }
}

/** A complete assignment satisfies a region if every clue evaluates true. */
export function assignmentSatisfiesRegion(
  region: Region,
  assignment: Solution,
  sectors: SectorLookup
): boolean {
  return region.clues.every((clue) => evalClue(clue, assignment, sectors) === true);
}

/**
 * For pruning a partial assignment: true unless some clue is *definitely*
 * violated by what's assigned so far. Clues that can't be evaluated yet
 * (null) don't block.
 */
export function partialAssignmentIsConsistent(
  region: Region,
  assignment: PartialSolution,
  sectors: SectorLookup
): boolean {
  return region.clues.every((clue) => evalClue(clue, assignment, sectors) !== false);
}
