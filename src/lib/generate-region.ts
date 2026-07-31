import { Clue, Quasar, Region, Sector, Solution } from "./puzzle-types";
import { buildSectors, orthogonalDistanceSigned, quadrantOf } from "./grid";
import { generateQuasarNames } from "./name-generator";
import { generateBriefing, generateRegionName } from "./flavor-text";

const TYPE_CATALOG = [
  "Pulsar-Class",
  "Binary-Class",
  "Redshift Anomaly",
  "Rogue Emission",
  "Ancient Relic",
  "Dormant Core",
];

const MIN_QUASARS = 6;
const MAX_QUASARS = 8;
const MIN_TYPES = 3;

// Every region ships with exactly 2 exact-coordinate clues, chosen to be
// within this orthogonal distance of each other - matching Sweep Scope's
// default visibility range, so they're always usable as a real
// triangulation pair - plus exactly 2 quadrant-only clues on two other
// signatures. Nothing else. The remaining signatures have no briefing clue
// at all; they're meant to be found via Sweep Scope/Quadrant Survey
// triangulation from the two known anchors, not read off the page.
const ANCHOR_MAX_DISTANCE = 5;
// Anchors that land adjacent waste the pair. The two exact-coordinate clues
// exist to be a triangulation baseline, and two neighbouring points barely
// constrain the rest of the field - every other signature ends up roughly
// the same distance from both, so the second anchor tells you almost
// nothing the first didn't. A floor of 2 (at least one sector between them)
// keeps the pair useful while staying inside Sweep Scope's visibility range.
const ANCHOR_MIN_DISTANCE = 2;
const QUADRANT_CLUE_COUNT = 2;

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
export function generateRegion(): Region {
  const sectors = buildSectors();
  const sectorLookup = new Map(sectors.map((s) => [s.id, s]));

  const quasarCount = randomInt(MIN_QUASARS, MAX_QUASARS);
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

  const region: Region = {
    id: `region-generated-${Date.now()}-${randomInt(1000, 9999)}`,
    name: generateRegionName(),
    briefing: generateBriefing(quasarCount),
    quasarTypes: chosenTypes,
    quasars,
    solution,
    clues: [],
  };

  region.clues = buildMandatoryClues(region, sectorLookup);
  return region;
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
function buildMandatoryClues(region: Region, sectorLookup: Map<string, Sector>): Clue[] {
  const names = Object.keys(region.solution);
  const allPairs: { a: string; b: string; dist: number }[] = [];

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = sectorOf(region, sectorLookup, names[i]);
      const b = sectorOf(region, sectorLookup, names[j]);
      allPairs.push({ a: names[i], b: names[j], dist: Math.abs(orthogonalDistanceSigned(a, b)) });
    }
  }

  const inRange = shuffle(
    allPairs.filter((p) => p.dist >= ANCHOR_MIN_DISTANCE && p.dist <= ANCHOR_MAX_DISTANCE)
  );
  // Fallback when no pair qualifies: prefer the closest pair that at least
  // clears the minimum, and only fall back to the outright closest (which
  // may be adjacent) if nothing does.
  const chosenPair =
    inRange[0] ??
    allPairs
      .filter((p) => p.dist >= ANCHOR_MIN_DISTANCE)
      .reduce<{ a: string; b: string; dist: number } | null>(
        (closest, p) => (!closest || p.dist < closest.dist ? p : closest),
        null
      ) ??
    allPairs.reduce((closest, p) => (p.dist < closest.dist ? p : closest));

  const clues: Clue[] = [
    { kind: "quasar-sector", quasar: chosenPair.a, sector: region.solution[chosenPair.a].sector },
    { kind: "quasar-sector", quasar: chosenPair.b, sector: region.solution[chosenPair.b].sector },
  ];

  const remaining = shuffle(names.filter((n) => n !== chosenPair.a && n !== chosenPair.b));
  for (const name of remaining.slice(0, QUADRANT_CLUE_COUNT)) {
    const sector = sectorOf(region, sectorLookup, name);
    clues.push({ kind: "quasar-quadrant", quasar: name, quadrant: quadrantOf(sector) });
  }

  return clues;
}
