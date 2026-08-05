// What a stretch of deep space gets called.
//
// Split out of `flavor-text.ts` on 2026-08-04, when this stopped being one
// line. The old rule was `<Adjective> <Noun>` picked uniformly from 18 x 16
// lists, and `docs/naming.md` measured what that actually produced: 288
// names, a repeat after 21.9 regions on average and sometimes on the
// second, and - the bigger problem - **one grammar forever**. Twelve
// consecutive draws read as a single name with the nouns swapped, so
// lengthening the lists would have moved the collision point and changed
// nothing about how they read.
//
// Four things changed together, because three of them are weak alone:
//
//  1. **Four grammars**, weighted so the familiar two-word form stays the
//     common case and roughly one region in three arrives differently.
//  2. **The field names itself.** The noun leans on where the signatures
//     actually sit and the adjective on what is out there, so a name
//     describes its region instead of being drawn beside it.
//  3. **Longer lists**, which now multiply against the grammars rather than
//     carrying the variety on their own.
//  4. **No repeats within a save**, handled by the caller through
//     `isTaken` - the highest-impact of the four, because what actually
//     reads as cheap is seeing the same name twice.
//
// The one candidate grammar deliberately left out is a station-survey
// designation ("Tikon Deep 41"). These are regions of space and should be
// named like places, not like catalog rows - the signatures already carry
// the catalog register.

/**
 * Enough about a field to name it after itself. Everything here is cheap to
 * compute at generation time, and none of it is secret: it describes the
 * *shape* of the region, never where any one signature sits.
 */
export interface FieldCharacter {
  /** Mean ring index, 0 (innermost) to 4. */
  meanRing: number;
  /** Mean pairwise orthogonal distance - how spread out the field is. */
  spread: number;
  /** The classifications present, which lean the adjective. */
  types: string[];
}

// Whoever first charted the place. Kemble is Lucian Kemble, who has a real
// asterism named after him - Kemble's Cascade - which is exactly the
// register this list is for: somewhere in the sky that carries the name of
// the person who noticed it.
//
// **Deliberately shares nothing with `officer-name.ts`.** There are more
// than enough names to go around, and an overlap would quietly imply the
// officer at the console had charted the field they were being handed. Not
// all of them are human, for the same reason the crew roster isn't - Tikon
// is not the only station that ever looked at this sky.
const CHARTERS = [
  "Kemble",
  "Halloran",
  "Vashti",
  "Brandt",
  "Achebe",
  "Petrossian",
  "Oyelaran",
  "Duvall",
  "Ky'rel",
  "Sethik",
  "Oduun",
  "Talvex",
  "Zhereth",
  "Nazra",
  "Vaskir",
  "Ilaan",
];

// The general pool, drawn for every region. The shape pools below are added
// to it rather than replacing it, so a field leans its name without any
// name becoming impossible.
// The register that works here is nautical and geological - Shoal, Trench,
// Reach, Marches, Bight, Sound, Scarp all read as somewhere a chart-maker
// actually went, which is what the charter grammar is leaning on.
//
// **Words the grid already owns are off-limits**: Ring, Sector, Segment,
// Quadrant, Sweep, Range, Scan, Survey, Bearing, Signature. A region called
// "Kemble's Ring" reads as a place *and* as a ring index, and the tutorial
// copy says things like "ring 4 counting out from the centre". `Field` is
// the one survivor of that rule and is borderline - the app calls the
// 40-cell board "the field" - kept for now, but it is the first thing to
// retire if a name ever reads ambiguously.
const NOUNS_GENERAL = [
  "Drift",
  "Field",
  "Nebula",
  "Rift",
  "Corridor",
  "Trench",
  "Sprawl",
  "Deep",
  "Passage",
  "Wash",
  "Hollow",
  "Reach",
  "Sound",
];

/** Signatures sitting mostly in the outer rings. */
const NOUNS_OUTER = ["Fringe", "Verge", "Rim", "Marches", "Threshold", "Palisade"];
/** Signatures huddled near the centre. */
const NOUNS_INNER = ["Basin", "Well", "Throat", "Hollow", "Bight", "Cauldron", "Chasm"];
/**
 * Tightly clustered, whatever ring they are in.
 *
 * `Trap` and `Swarm` both say *why* the signatures are bunched rather than
 * only that they are, which is the most a name of this kind can do.
 */
const NOUNS_TIGHT = ["Shoal", "Knot", "Cluster", "Cascade", "Chain", "Braid", "Swarm", "Trap"];
/** Scattered right across the field. */
const NOUNS_WIDE = ["Expanse", "Gulf", "Void", "Span", "Spread", "Barrens"];

// "Hollow" used to be in both lists, which made `Hollow Hollow` a name the
// generator could produce at 1 in 288. It is a noun here and nowhere else.
const ADJECTIVES_GENERAL = [
  "Thanix",
  "Veridian",
  "Kessik",
  "Ashen",
  "Umbral",
  "Pallid",
  "Coral",
  "Ferrous",
  "Glacial",
  "Ember",
  "Silt",
  "Wraith",
  "Bruma",
  "Nocturne",
  "Cinder",
  "Fallow",
  "Brindle",
  "Hoary",
  "Vermeil",
  "Argent",
  "Verdigris",
  "Basalt",
  "Riven",
  "Sunken",
  "Sallow",
  "Auric",
  "Tarnished",
  "Cobalt",
  "Drowned",
];

/**
 * Adjectives a classification leans toward. Added to the general pool, not
 * substituted for it - the point is that a field of Dormant Cores is a
 * little more likely to be called *Ashen*, not that it must be.
 *
 * Keys must match `TYPE_CATALOG` in `generate-region.ts`. An unknown type
 * simply contributes nothing, which is the right failure: adding a
 * classification should not be able to break naming.
 */
const TYPE_ADJECTIVES: Record<string, string[]> = {
  "Dormant Core": ["Ashen", "Fallow", "Cinder", "Pallid", "Tarnished"],
  "Rogue Emission": ["Ember", "Wraith", "Nocturne", "Auric"],
  "Ancient Relic": ["Hoary", "Bruma", "Umbral", "Basalt", "Sunken"],
  "Redshift Anomaly": ["Vermeil", "Coral", "Brindle", "Sallow"],
  "Pulsar-Class": ["Argent", "Glacial", "Thanix", "Cobalt"],
  "Binary-Class": ["Veridian", "Ferrous", "Verdigris", "Riven"],
};

const ROMAN = ["II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

/**
 * The four grammars and how often each is drawn.
 *
 * Weighted rather than uniform on purpose. The two-word form is the house
 * style and has to stay the thing a region is normally called; the other
 * three exist to break the rhythm, and a rhythm broken every time is just a
 * different rhythm.
 */
const GRAMMAR_WEIGHTS = {
  plain: 55, // Ashen Drift
  charter: 15, // Kemble's Cascade
  numbered: 15, // Ember Verge II
  compound: 15, // Coral-Ashen Drift
} as const;

type Grammar = keyof typeof GRAMMAR_WEIGHTS;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickGrammar(): Grammar {
  const entries = Object.entries(GRAMMAR_WEIGHTS) as [Grammar, number][];
  const total = entries.reduce((n, [, w]) => n + w, 0);
  let roll = Math.random() * total;
  for (const [grammar, weight] of entries) {
    roll -= weight;
    if (roll < 0) return grammar;
  }
  return "plain";
}

/**
 * Weighting is done by repetition rather than by a weighted-pick helper:
 * the shape pools are small, this runs once per region, and a pool you can
 * print is easier to reason about than a table of probabilities.
 */
const LEAN = 3;

function nounPool(field: FieldCharacter | undefined): string[] {
  const pool = [...NOUNS_GENERAL];
  if (!field) return pool;
  const add = (words: string[]) => {
    for (let i = 0; i < LEAN; i++) pool.push(...words);
  };
  // Thresholds are read off the field's own scale: rings run 0-4, and the
  // mean pairwise orthogonal distance across a random 40-cell field sits
  // around 4. Deliberately loose - this leans a name, it does not classify.
  if (field.meanRing >= 2.8) add(NOUNS_OUTER);
  else if (field.meanRing <= 1.6) add(NOUNS_INNER);
  if (field.spread <= 3.4) add(NOUNS_TIGHT);
  else if (field.spread >= 4.6) add(NOUNS_WIDE);
  return pool;
}

function adjectivePool(field: FieldCharacter | undefined): string[] {
  const pool = [...ADJECTIVES_GENERAL];
  if (!field) return pool;
  for (const type of field.types) {
    const leaning = TYPE_ADJECTIVES[type];
    if (leaning) pool.push(...leaning, ...leaning);
  }
  return pool;
}

function compose(field: FieldCharacter | undefined): string {
  const nouns = nounPool(field);
  const adjectives = adjectivePool(field);

  switch (pickGrammar()) {
    case "charter":
      return `${pick(CHARTERS)}'s ${pick(nouns)}`;
    case "numbered":
      return `${pick(adjectives)} ${pick(nouns)} ${pick(ROMAN)}`;
    case "compound": {
      const first = pick(adjectives);
      // A compound of one word twice reads as a typo, and the pool is large
      // enough that one retry settles it.
      let second = pick(adjectives);
      if (second === first) second = pick(adjectives);
      if (second === first) return `${first} ${pick(nouns)}`;
      return `${first}-${second} ${pick(nouns)}`;
    }
    default:
      return `${pick(adjectives)} ${pick(nouns)}`;
  }
}

/** How many fresh names to try before accepting a repeat. */
const UNIQUE_TRIES = 40;

/**
 * A name for one region.
 *
 * @param field   what the region looks like, so it can be named after
 *                itself. Optional - callers that have no field yet (or a
 *                script measuring the raw distribution) get the unleaned
 *                pools, which is the same generator minus the flavour.
 * @param isTaken names already used in this save. Retried rather than
 *                excluded up front: the space is far too large to
 *                enumerate, and the odds of forty collisions in a row are
 *                not worth a data structure.
 */
export function generateRegionName(
  field?: FieldCharacter,
  isTaken?: (name: string) => boolean
): string {
  let name = compose(field);
  if (!isTaken) return name;
  for (let i = 0; i < UNIQUE_TRIES && isTaken(name); i++) {
    name = compose(field);
  }
  return name;
}
