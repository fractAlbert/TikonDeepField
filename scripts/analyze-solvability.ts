// How often is a generated region actually solvable?
//
// "Solvable" here means: every signature can be identified - exactly one
// sector assignment is consistent with everything the player can observe.
// (Types are excluded on purpose: the Star Map only checks sectors, so a
// region where types stay ambiguous is still winnable.)
//
// This is NOT solveRegion(). That solver answers a narrower question - is
// the region pinned down by its *briefing clues* alone - and would report
// almost everything as ambiguous, because the briefing is only 4 clues and
// the player is expected to work the instruments. What's modelled here is
// the full information channel set described in puzzle-mechanics.md:
//
//   1. Briefing      - 2 exact-coordinate anchors + 2 quadrant clues.
//   2. Sweep Scope   - pick any signature as reference and read the
//                      *unsigned* orthogonal distance to every other one
//                      within VISIBILITY_RANGE. Blips carry designations,
//                      so cycling the reference across all signatures
//                      yields the full pairwise distance matrix. A pair
//                      further apart than the range is not nothing: "out
//                      of range" is itself an observation (d > 5).
//   3. Quadrant Survey - per-quadrant signature totals.
//
// Per-type breakdowns are still deliberately NOT used as a channel, but the
// reason changed on 2026-08-11 and the distinction matters.
//
// Generation now does emit `quasar-type` clues - as a chain, paired with a
// `type-quadrant` about the same type, and only for a type exactly one
// signature holds. So a player *can* now attach one or two names to a
// classification. What they still cannot do is learn any *other* signature's
// type, so a per-type census remains an anonymous partition over everything
// the chain did not name.
//
// The chain itself is folded into the quadrant constraints below, which is
// exact rather than optimistic: the pair says precisely what the direct
// clue would have said. Leaving the census out keeps this a lower bound.
//
// Usage: npx tsx scripts/analyze-solvability.ts [samples]

import { RING_COUNT, buildSectors, orthogonalDistanceSigned, quadrantOf } from "../src/lib/grid";
import { generateRegion } from "../src/lib/generate-region";
import { Quadrant, Region, Sector } from "../src/lib/puzzle-types";

const QUADRANTS: Quadrant[] = ["I", "II", "III", "IV"];

const SAMPLES = Number(process.argv[2] ?? 2000);
const VISIBILITY_RANGE = 5; // must match RelativeDistanceScope
const OUT_OF_RANGE = 99;

const sectors = buildSectors();
const sectorLookup = new Map(sectors.map((s) => [s.id, s]));

/** What the Sweep Scope actually shows for a pair: a distance, or "far". */
function observed(a: Sector, b: Sector): number {
  const d = Math.abs(orthogonalDistanceSigned(a, b));
  return d <= VISIBILITY_RANGE ? d : OUT_OF_RANGE;
}

/** What the scope WOULD show if it kept the sign it already computes. */
function observedSigned(a: Sector, b: Sector): number {
  const signed = orthogonalDistanceSigned(a, b);
  return Math.abs(signed) <= VISIBILITY_RANGE ? signed : OUT_OF_RANGE;
}

interface Channels {
  distances: boolean;
  quadrantTotals: boolean;
  /** Hypothetical: Sweep Scope reveals direction as well as magnitude. */
  signed?: boolean;
  /**
   * Ring Survey: pick a signature, watch a bar sweep outward, read off the
   * ring it lights on.
   *
   * `true` means every signature's ring is known, which is what an
   * unlimited panel gives you - cycling the selection costs nothing. A
   * number caps how many signatures may be surveyed, modelling a budget.
   * The budget is spent on signatures with no exact-sector clue, which is
   * what a player who understands the instrument would do.
   */
  rings?: boolean | number;
  /**
   * Ring Survey, type-based variant: select a *type* and see which rings
   * hold one, the way the Quadrant Survey names no individual signature.
   *
   * Modelled as anonymous per-ring totals, and that reduction is exact.
   * Nothing observable links a name to a type today (generation emits no
   * `quasar-type` clues), so a candidate assignment only has to admit
   * *some* type labelling reproducing the per-(type, ring) counts. Types
   * may be permuted freely between names, so the only surviving constraint
   * is that each ring holds the right number of signatures. Which makes
   * this the Quadrant Survey's exact counterpart for rings.
   */
  ringTotals?: boolean;
}

/**
 * Counts sector assignments consistent with the enabled channels, stopping
 * at `cap` (2 is enough to answer "is it unique?").
 */
function countConsistent(region: Region, ch: Channels, cap = 2): number {
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

  // A chain constrains the named signature to the set of quadrants its
  // classification occupies - weaker than a direct quadrant clue, and
  // deliberately so. Must mirror `src/lib/solvability.ts`: if the two
  // disagree, the shipped unsolvable flag and the measured rates stop
  // describing the same game.
  const allowedQuadrants = new Map<string, Set<Quadrant>>();
  for (const [quasar, type] of typeOfQuasar) {
    const set = quadrantSetOfType.get(type);
    if (set) allowedQuadrants.set(quasar, new Set(set));
    // Pre-2026-08-11 regions carry the single-quadrant form; saves outlive
    // schema changes, so both are read.
    const single = quadrantOfType.get(type);
    if (single !== undefined) quadClue.set(quasar, single);
  }

  // Which signatures have been surveyed for ring. A budget is spent on the
  // ones with no exact-sector clue - surveying an anchor would tell you
  // something the briefing already said.
  const ringKnown = new Set<string>();
  if (ch.rings === true) for (const n of names) ringKnown.add(n);
  else if (typeof ch.rings === "number")
    for (const n of names.filter((n) => !fixed.has(n)).slice(0, ch.rings)) ringKnown.add(n);

  // True observations to reproduce. Stored DIRECTED: the signed metric is
  // antisymmetric (orthogonalDistanceSigned(a,b) === -orthogonalDistanceSigned(b,a)
  // whenever the segment hop is non-zero), so a symmetric lookup silently
  // compares a reading against its own negation.
  const obs = ch.signed ? observedSigned : observed;
  const trueDist = new Map<string, number>();
  for (const a of names)
    for (const b of names)
      if (a !== b) trueDist.set(`${a}|${b}`, obs(truth.get(a)!, truth.get(b)!));
  const dist = (a: string, b: string) => trueDist.get(`${a}|${b}`)!;

  const trueQuadTotals = [0, 0, 0, 0];
  for (const n of names) trueQuadTotals[QUADRANTS.indexOf(quadrantOf(truth.get(n)!))]++;

  const trueRingTotals = new Array(RING_COUNT).fill(0) as number[];
  for (const n of names) trueRingTotals[truth.get(n)!.ring]++;

  // Anchored signatures first, then the rest - pruning bites earliest that way.
  const order = [...names].sort(
    (a, b) => (fixed.has(b) ? 1 : 0) - (fixed.has(a) ? 1 : 0)
  );

  const assigned = new Map<string, Sector>();
  const used = new Set<string>();
  let found = 0;

  function recurse(i: number) {
    if (found >= cap) return;
    if (i === order.length) {
      if (ch.quadrantTotals) {
        const totals = [0, 0, 0, 0];
        for (const s of assigned.values()) totals[QUADRANTS.indexOf(quadrantOf(s))]++;
        if (totals.some((t, k) => t !== trueQuadTotals[k])) return;
      }
      if (ch.ringTotals) {
        const totals = new Array(RING_COUNT).fill(0) as number[];
        for (const s of assigned.values()) totals[s.ring]++;
        if (totals.some((t, k) => t !== trueRingTotals[k])) return;
      }
      found++;
      return;
    }

    const name = order[i];
    const candidates = fixed.has(name)
      ? [sectorLookup.get(fixed.get(name)!)!]
      : sectors;

    for (const cand of candidates) {
      if (used.has(cand.id)) continue;
      if (quadClue.has(name) && quadrantOf(cand) !== quadClue.get(name)) continue;
      const allowed = allowedQuadrants.get(name);
      if (allowed && !allowed.has(quadrantOf(cand))) continue;
      if (ringKnown.has(name) && cand.ring !== truth.get(name)!.ring) continue;
      if (ch.distances) {
        let ok = true;
        for (const [other, otherSector] of assigned) {
          if (obs(cand, otherSector) !== dist(name, other)) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
      }
      assigned.set(name, cand);
      used.add(cand.id);
      recurse(i + 1);
      assigned.delete(name);
      used.delete(cand.id);
      if (found >= cap) return;
    }
  }

  recurse(0);
  return found;
}

/**
 * Re-picks the two exact-coordinate anchors under a different minimum
 * separation, so the same generator can be measured at each candidate
 * floor. Mirrors buildMandatoryClues: uniform choice among qualifying
 * pairs, falling back to the closest pair if none qualify.
 */
function repickAnchors(region: Region, minDist: number): Region {
  const names = Object.keys(region.solution);
  const pairs: { a: string; b: string; dist: number }[] = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = sectorLookup.get(region.solution[names[i]].sector)!;
      const b = sectorLookup.get(region.solution[names[j]].sector)!;
      pairs.push({ a: names[i], b: names[j], dist: Math.abs(orthogonalDistanceSigned(a, b)) });
    }
  }
  const eligible = pairs.filter((p) => p.dist >= minDist && p.dist <= VISIBILITY_RANGE);
  const chosen =
    eligible.length > 0
      ? eligible[Math.floor(Math.random() * eligible.length)]
      : pairs.reduce((c, p) => (p.dist < c.dist ? p : c));

  const others = names.filter((n) => n !== chosen.a && n !== chosen.b);
  // Keep the same number of quadrant clues the generator emits - counting
  // the indirect ones too, since a `type-quadrant` names a quadrant just as
  // a `quasar-quadrant` does. Counting only the direct kind would quietly
  // rebuild these regions with fewer clues than the generator gave them and
  // report the anchor-separation sweep as harder than it is.
  const quadCount = region.clues.filter(
    (c) => c.kind === "quasar-quadrant" || c.kind === "type-quadrant"
  ).length;
  const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, quadCount);

  return {
    ...region,
    clues: [
      { kind: "quasar-sector", quasar: chosen.a, sector: region.solution[chosen.a].sector },
      { kind: "quasar-sector", quasar: chosen.b, sector: region.solution[chosen.b].sector },
      ...shuffled.map((n) => ({
        kind: "quasar-quadrant" as const,
        quasar: n,
        quadrant: quadrantOf(sectorLookup.get(region.solution[n].sector)!),
      })),
    ],
  };
}


/**
 * Promotes `extra` additional signatures from quadrant-clue (or no clue) to
 * exact-coordinate anchors, so "would a third known point help?" can be
 * measured rather than argued.
 */
function withExtraAnchors(region: Region, extra: number): Region {
  const anchored = new Set(
    region.clues.filter((c) => c.kind === "quasar-sector").map((c) => c.quasar)
  );
  const candidates = Object.keys(region.solution).filter((n) => !anchored.has(n));
  const promoted = candidates.slice(0, extra);
  return {
    ...region,
    clues: [
      ...region.clues.filter(
        (c) => !("quasar" in c) || !promoted.includes(c.quasar as string)
      ),
      ...promoted.map((n) => ({
        kind: "quasar-sector" as const,
        quasar: n,
        sector: region.solution[n].sector,
      })),
    ],
  };
}

function anchorDistance(region: Region): number | null {
  const anchors = region.clues.filter((c) => c.kind === "quasar-sector" && !c.negate);
  if (anchors.length < 2) return null;
  const [a, b] = anchors.map((c) =>
    sectorLookup.get(region.solution[(c as { quasar: string }).quasar].sector)!
  );
  return Math.abs(orthogonalDistanceSigned(a, b));
}

// ---------------------------------------------------------------------

// `canonical` marks the row the breakdowns below report on. It is an
// explicit flag rather than a test on the channel bits because that test
// has now silently picked the wrong row twice - every scenario added since
// has also had `distances` and `quadrantTotals` set.
const scenarios: { label: string; ch: Channels; canonical?: boolean }[] = [
  { label: "Briefing clues only", ch: { distances: false, quadrantTotals: false } },
  { label: "+ Sweep Scope", ch: { distances: true, quadrantTotals: false } },
  {
    label: "+ Quadrant Survey (shipped set)",
    ch: { distances: true, quadrantTotals: true },
    canonical: true,
  },
  {
    label: "  [hypothetical] signed sweep",
    ch: { distances: true, quadrantTotals: true, signed: true },
  },
  {
    label: "  [prototype] Ring Survey by type",
    ch: { distances: true, quadrantTotals: true, ringTotals: true },
  },
  {
    label: "  [prototype] Ring Survey by signature",
    ch: { distances: true, quadrantTotals: true, rings: true },
  },
];

const results = scenarios.map((s) => ({ ...s, unique: 0 }));
const byCount = new Map<number, { n: number; unique: number }>();
const byAnchor = new Map<number, { n: number; unique: number }>();
let anchorViolations = 0;

console.log(`Sampling ${SAMPLES} generated regions...\n`);

for (let i = 0; i < SAMPLES; i++) {
  const region = generateRegion();
  const d = anchorDistance(region);
  if (d !== null && (d < 2 || d > 5)) anchorViolations++;

  let fullyUnique = false;
  for (const r of results) {
    const unique = countConsistent(region, r.ch) === 1;
    if (unique) r.unique++;
    if (r.canonical) fullyUnique = unique;
  }

  const qn = region.quasars.length;
  const bc = byCount.get(qn) ?? { n: 0, unique: 0 };
  bc.n++;
  if (fullyUnique) bc.unique++;
  byCount.set(qn, bc);

  if (d !== null) {
    const ba = byAnchor.get(d) ?? { n: 0, unique: 0 };
    ba.n++;
    if (fullyUnique) ba.unique++;
    byAnchor.set(d, ba);
  }
}

const pct = (n: number) => ((n / SAMPLES) * 100).toFixed(1);

console.log("Solvable (every signature uniquely identified), by information available:");
for (const r of results) {
  console.log(
    `  ${r.label.padEnd(34)} ${pct(r.unique).padStart(5)}% solvable   ` +
      `${(100 - Number(pct(r.unique))).toFixed(1)}% ambiguous`
  );
}

console.log("\nWith all channels, by signature count:");
for (const [qn, v] of [...byCount.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(
    `  ${qn} signatures  n=${String(v.n).padStart(5)}  ` +
      `${((v.unique / v.n) * 100).toFixed(1).padStart(5)}% solvable`
  );
}

console.log("\nWith all channels, by anchor separation:");
for (const [d, v] of [...byAnchor.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(
    `  distance ${d}    n=${String(v.n).padStart(5)}  ` +
      `${((v.unique / v.n) * 100).toFixed(1).padStart(5)}% solvable`
  );
}

console.log(
  `\nAnchor pairs outside the 2-5 window: ${anchorViolations} ` +
    `(${pct(anchorViolations)}%) - the documented fallback when no pair qualifies.`
);

// Sweep the minimum-separation floor on a fresh sample, so the choice of
// floor can be compared directly rather than inferred from the breakdown
// above (which conditions on a distance the generator already filtered).
// Does trilateration logic apply - would a third known point fix it?
console.log("\nEffect of more exact-coordinate anchors (all channels):");
const ANCH = Math.min(SAMPLES, 1200);
for (const extra of [0, 1, 2, 3]) {
  let unique = 0;
  for (let i = 0; i < ANCH; i++) {
    const region = withExtraAnchors(generateRegion(), extra);
    if (countConsistent(region, { distances: true, quadrantTotals: true }) === 1) unique++;
  }
  console.log(
    `  ${2 + extra} known points   ${(100 - (unique / ANCH) * 100).toFixed(1).padStart(5)}% unsolvable`
  );
}

// How much of the Ring Survey's effect survives a budget? Unlimited use
// solves everything, which is the question the prototype has to answer:
// how few surveys still rescue the regions that are otherwise impossible.
console.log("\n[prototype] Ring Survey budget (rings spent on un-anchored signatures):");
const RING = Math.min(SAMPLES, 1500);
for (const budget of [0, 1, 2, 3, 4]) {
  let unique = 0;
  for (let i = 0; i < RING; i++) {
    const region = generateRegion();
    if (countConsistent(region, { distances: true, quadrantTotals: true, rings: budget }) === 1)
      unique++;
  }
  console.log(
    `  ${budget} ring survey${budget === 1 ? " " : "s"}   ` +
      `${(100 - (unique / RING) * 100).toFixed(1).padStart(5)}% unsolvable`
  );
}

console.log("\nEffect of the anchor minimum (all channels, fresh sample per floor):");
const SWEEP = Math.min(SAMPLES, 1500);
for (const floor of [1, 2, 3, 4]) {
  let unique = 0;
  for (let i = 0; i < SWEEP; i++) {
    const region = repickAnchors(generateRegion(), floor);
    if (countConsistent(region, { distances: true, quadrantTotals: true }) === 1) unique++;
  }
  const p = (unique / SWEEP) * 100;
  console.log(
    `  min separation ${floor}   ${p.toFixed(1).padStart(5)}% solvable   ` +
      `${(100 - p).toFixed(1).padStart(5)}% unsolvable`
  );
}
