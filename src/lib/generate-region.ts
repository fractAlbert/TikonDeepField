import { Clue, Quasar, Region, Sector, Solution } from "./puzzle-types";
import { buildSectors, orthogonalDistanceSigned, quadrantOf } from "./grid";
import { generateQuasarNames } from "./name-generator";
import { generateBriefing } from "./flavor-text";
import { FieldCharacter, generateRegionName } from "./region-name";
import { DEFAULT_DIFFICULTY, RegionDifficulty } from "./ranks";

const TYPE_CATALOG = [
  "Pulsar-Class",
  "Binary-Class",
  "Redshift Anomaly",
  "Rogue Emission",
  "Ancient Relic",
  "Dormant Core",
];

const MIN_TYPES = 3;

// Every region ships with exactly 2 exact-coordinate clues - the anchors -
// chosen to sit inside a band of orthogonal distance from each other, plus
// some number of quadrant-only clues on other signatures. Nothing else. The
// remaining signatures have no briefing clue at all; they're meant to be
// found by triangulating from the two known anchors, not read off the page.
//
// **The band and the counts are per-rank now** (`RegionDifficulty`), which
// is backlog item 1. Two constraints that used to be constants here and are
// now floors the profiles must respect:
//
//  - **Never fewer than 2 anchors.** One is not a triangulation baseline at
//    all - every distance is measured from a single point, so it is a
//    different puzzle rather than a harder one.
//  - **Anchors never adjacent.** Two neighbouring points barely constrain
//    the rest of the field: every other signature ends up roughly the same
//    distance from both, so the second anchor says almost nothing the first
//    didn't. Every shipped profile starts its band at 2 or more.
//
// The far end matters too, and not in the direction it looks: past 5 the
// anchors fall outside each other's Sweep Scope range, so a wider baseline
// starts *degrading*. Difficulty bottoms out at exactly 5.
// See docs/region-difficulty.md.

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates a fresh region on the shared polar field: 6-8 quasars (at least
 * 3 distinct types, types can repeat), scattered across the 40-sector
 * field, with exactly 4 briefing clues (2 exact-coordinate anchors + 2
 * quadrant-only). See `buildMandatoryClues` for why that's the whole set.
 */
export function generateRegion(options?: {
  /**
   * Names already used in this save, so a region is never called something
   * you have surveyed before. Optional because this function is also run
   * by the analysis scripts, which have no save and want the raw
   * distribution.
   */
  nameTaken?: (name: string) => boolean;
  /**
   * How hard to draw it. Defaults to the profile the game shipped with,
   * which is also rank 2's - so an unconditioned call is exactly what this
   * function always did.
   */
  difficulty?: RegionDifficulty;
}): Region {
  const sectors = buildSectors();
  const sectorLookup = new Map(sectors.map((s) => [s.id, s]));
  const difficulty = options?.difficulty ?? DEFAULT_DIFFICULTY;

  const quasarCount =
    difficulty.signatures[randomInt(0, difficulty.signatures.length - 1)];
  const distinctTypeCount = randomInt(MIN_TYPES, Math.min(TYPE_CATALOG.length, quasarCount));
  const chosenTypes = shuffle(TYPE_CATALOG).slice(0, distinctTypeCount);

  // Every chosen type is guaranteed at least one quasar; remaining slots
  // are filled by repeating freely from the full chosen set.
  const typeAssignments = [...chosenTypes];
  while (typeAssignments.length < quasarCount) {
    typeAssignments.push(chosenTypes[randomInt(0, chosenTypes.length - 1)]);
  }
  const shuffledTypes = shuffle(typeAssignments);
  const chosenSectors = shuffle(sectors).slice(0, quasarCount);
  const names = generateQuasarNames(quasarCount);

  const quasars: Quasar[] = names.map((n) => ({ id: n, designation: n }));
  const solution: Solution = {};
  names.forEach((name, i) => {
    solution[name] = { type: shuffledTypes[i], sector: chosenSectors[i].id };
  });

  // What the field looks like, so it can be named after itself rather than
  // beside itself. Only its shape - how far out the signatures sit, how
  // spread they are, what is out there - never any one position, so the
  // name cannot leak a sector. See region-name.ts.
  const character: FieldCharacter = {
    meanRing: chosenSectors.reduce((n, s) => n + s.ring, 0) / chosenSectors.length,
    spread: meanPairwiseDistance(chosenSectors),
    types: chosenTypes,
  };

  const region: Region = {
    id: `region-generated-${Date.now()}-${randomInt(1000, 9999)}`,
    name: generateRegionName(character, options?.nameTaken),
    briefing: generateBriefing(quasarCount),
    quasarTypes: chosenTypes,
    quasars,
    solution,
    clues: [],
  };

  region.clues = buildMandatoryClues(region, sectorLookup, difficulty);
  return region;
}

/** How spread out a field is, in the same orthogonal steps the instruments read in. */
function meanPairwiseDistance(sectors: Sector[]): number {
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < sectors.length; i++) {
    for (let j = i + 1; j < sectors.length; j++) {
      total += Math.abs(orthogonalDistanceSigned(sectors[i], sectors[j]));
      pairs++;
    }
  }
  return pairs === 0 ? 0 : total / pairs;
}

function sectorOf(region: Region, sectorLookup: Map<string, Sector>, name: string): Sector {
  return sectorLookup.get(region.solution[name].sector)!;
}

/**
 * The 2 exact-coordinate anchors (within ANCHOR_MAX_DISTANCE of each
 * other) + 2 quadrant-only clues on different signatures - the whole
 * clue set, no more. With 6-8 signatures scattered across 40 sectors, some
 * pair is within range 5 the overwhelming majority of the time (empirically
 * ~85% for any given pair at range 5, so with up to 28 pairs to choose from
 * the odds of zero qualifying pairs are vanishingly small) - the rare miss
 * just falls back to the closest pair available instead of forcing a full
 * regeneration.
 */
function buildMandatoryClues(
  region: Region,
  sectorLookup: Map<string, Sector>,
  difficulty: RegionDifficulty
): Clue[] {
  const [minSep, maxSep] = difficulty.anchorSeparation;
  const names = Object.keys(region.solution);
  const allPairs: { a: string; b: string; dist: number }[] = [];

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = sectorOf(region, sectorLookup, names[i]);
      const b = sectorOf(region, sectorLookup, names[j]);
      allPairs.push({ a: names[i], b: names[j], dist: Math.abs(orthogonalDistanceSigned(a, b)) });
    }
  }

  const inRange = shuffle(allPairs.filter((p) => p.dist >= minSep && p.dist <= maxSep));
  // Fallback when no pair qualifies: prefer the closest pair that at least
  // clears the minimum, and only fall back to the outright closest (which
  // may be adjacent) if nothing does.
  const chosenPair =
    inRange[0] ??
    allPairs
      .filter((p) => p.dist >= minSep)
      .reduce<{ a: string; b: string; dist: number } | null>(
        (closest, p) => (!closest || p.dist < closest.dist ? p : closest),
        null
      ) ??
    allPairs.reduce((closest, p) => (p.dist < closest.dist ? p : closest));

  const clues: Clue[] = [
    { kind: "quasar-sector", quasar: chosenPair.a, sector: region.solution[chosenPair.a].sector },
    { kind: "quasar-sector", quasar: chosenPair.b, sector: region.solution[chosenPair.b].sector },
  ];

  // How many signatures hold each classification. A `type-*` clue names no
  // signature, so it only pins one down when exactly one signature carries
  // that type - with at least 3 types across 6-8 signatures, repeats are the
  // norm and most types do not qualify.
  const typeCount = new Map<string, number>();
  for (const n of names) {
    const t = region.solution[n].type;
    typeCount.set(t, (typeCount.get(t) ?? 0) + 1);
  }

  let indirectBudget = difficulty.indirectClues;
  const remaining = shuffle(names.filter((n) => n !== chosenPair.a && n !== chosenPair.b));
  for (const name of remaining.slice(0, difficulty.quadrantClues)) {
    const sector = sectorOf(region, sectorLookup, name);
    const quadrant = quadrantOf(sector);
    const type = region.solution[name].type;

    // Deliver it through the classification instead: same fact, one more
    // step to read. See `RegionDifficulty.indirectClues` for why that is a
    // difficulty axis rather than a cosmetic change - and note the pair is
    // only equivalent to the direct clue because of the uniqueness guard,
    // so the fallback below is load-bearing rather than defensive.
    if (indirectBudget > 0 && typeCount.get(type) === 1) {
      indirectBudget--;
      // The uniqueness guard above is not a nicety, and this assertion is
      // here because the whole guarantee rests on one condition.
      //
      // `clueText` renders this as "**The** Ancient Relic signature is in
      // Quadrant I" - a definite article, which tells the player there is
      // exactly one. That is true today by construction. If it ever stops
      // being true the briefing does not merely become vague, it becomes
      // **false**: `resolveType` in `clue-eval.ts` returns "multiple" for a
      // shared type and the evaluator scores the clue false against the real
      // solution. A region would ship with a lie in its briefing.
      //
      // Dev-only, because a lying briefing is worth stopping a developer for
      // and not worth crashing a player over - in production the `else`
      // branch below is a correct clue either way.
      if (process.env.NODE_ENV !== "production" && typeCount.get(type) !== 1) {
        throw new Error(
          `Chained a type held by ${typeCount.get(type)} signatures: "${type}". ` +
            `The briefing would claim there is exactly one.`
        );
      }
      clues.push({ kind: "quasar-type", quasar: name, type });
      clues.push({ kind: "type-quadrant", type, quadrant });
    } else {
      clues.push({ kind: "quasar-quadrant", quasar: name, quadrant });
    }
  }

  return clues;
}
