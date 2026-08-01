// Every instrument option on one axis, measured the same way.
//
// Produces the numbers in docs/instrument-analysis.md. Kept as one script
// so the whole comparison comes from a single run against a single sample
// of regions - figures gathered from separate runs at separate times are
// how the earlier tables ended up quietly disagreeing with each other.
//
// Two questions are being answered:
//
//   1. How finely should a census slice the field? The Quadrant Survey
//      asks "how many signatures are in this part of the field?" and
//      answers it in quarters. Rings, segments and single sectors are the
//      same question at different resolutions.
//   2. What is the best way to hand the player a lifeline - a ring scan,
//      or a small number of expensive pinpoint scans they aim themselves?
//
// Usage: npx tsx scripts/compare-instruments.ts [samples]

import { RING_COUNT, SEGMENT_COUNT, buildSectors, orthogonalDistanceSigned, quadrantOf } from "../src/lib/grid";
import { generateRegion } from "../src/lib/generate-region";
import { Quadrant, Region, Sector } from "../src/lib/puzzle-types";

const QUADRANTS: Quadrant[] = ["I", "II", "III", "IV"];
const SAMPLES = Number(process.argv[2] ?? 1200);
const VISIBILITY_RANGE = 5;
const OUT_OF_RANGE = 99;

const sectors = buildSectors();
const sectorLookup = new Map(sectors.map((s) => [s.id, s]));

function observed(a: Sector, b: Sector): number {
  const d = Math.abs(orthogonalDistanceSigned(a, b));
  return d <= VISIBILITY_RANGE ? d : OUT_OF_RANGE;
}

interface Channels {
  distances?: boolean;
  /** Anonymous headcounts, at four different resolutions. */
  quadrantTotals?: boolean;
  ringTotals?: boolean;
  segmentTotals?: boolean;
  sectorOccupancy?: boolean;
  /** Ring Survey aimed at named signatures. */
  ringKnown?: Set<string>;
  /** High-energy scan: exact sector, for signatures the player picks. */
  pinpoint?: Set<string>;
}

function countConsistent(region: Region, ch: Channels, cap = 2): number {
  const names = Object.keys(region.solution);
  const truth = new Map(names.map((n) => [n, sectorLookup.get(region.solution[n].sector)!]));

  const fixed = new Map<string, string>();
  const quadClue = new Map<string, Quadrant>();
  for (const clue of region.clues) {
    if (clue.negate) continue;
    if (clue.kind === "quasar-sector") fixed.set(clue.quasar, clue.sector);
    if (clue.kind === "quasar-quadrant") quadClue.set(clue.quasar, clue.quadrant);
  }
  for (const n of ch.pinpoint ?? []) fixed.set(n, region.solution[n].sector);

  const trueDist = new Map<string, number>();
  for (const a of names)
    for (const b of names)
      if (a !== b) trueDist.set(`${a}|${b}`, observed(truth.get(a)!, truth.get(b)!));

  const quadTotals = [0, 0, 0, 0];
  const ringTotals = new Array(RING_COUNT).fill(0) as number[];
  const segTotals = new Array(SEGMENT_COUNT).fill(0) as number[];
  const occupied = new Set<string>();
  for (const n of names) {
    const s = truth.get(n)!;
    quadTotals[QUADRANTS.indexOf(quadrantOf(s))]++;
    ringTotals[s.ring]++;
    segTotals[s.seg]++;
    occupied.add(s.id);
  }

  const order = [...names].sort((a, b) => (fixed.has(b) ? 1 : 0) - (fixed.has(a) ? 1 : 0));
  const assigned = new Map<string, Sector>();
  const used = new Set<string>();
  let found = 0;

  function recurse(i: number) {
    if (found >= cap) return;
    if (i === order.length) {
      if (ch.quadrantTotals) {
        const t = [0, 0, 0, 0];
        for (const s of assigned.values()) t[QUADRANTS.indexOf(quadrantOf(s))]++;
        if (t.some((v, k) => v !== quadTotals[k])) return;
      }
      if (ch.ringTotals) {
        const t = new Array(RING_COUNT).fill(0) as number[];
        for (const s of assigned.values()) t[s.ring]++;
        if (t.some((v, k) => v !== ringTotals[k])) return;
      }
      if (ch.segmentTotals) {
        const t = new Array(SEGMENT_COUNT).fill(0) as number[];
        for (const s of assigned.values()) t[s.seg]++;
        if (t.some((v, k) => v !== segTotals[k])) return;
      }
      found++;
      return;
    }

    const name = order[i];
    const candidates = fixed.has(name) ? [sectorLookup.get(fixed.get(name)!)!] : sectors;

    for (const cand of candidates) {
      if (used.has(cand.id)) continue;
      if (quadClue.has(name) && quadrantOf(cand) !== quadClue.get(name)) continue;
      if (ch.ringKnown?.has(name) && cand.ring !== truth.get(name)!.ring) continue;
      // Knowing exactly which cells are occupied prunes at the candidate
      // level, which is equivalent to checking the set at the leaf and far
      // cheaper.
      if (ch.sectorOccupancy && !occupied.has(cand.id)) continue;
      if (ch.distances) {
        let ok = true;
        for (const [other, os] of assigned) {
          if (observed(cand, os) !== trueDist.get(`${name}|${other}`)!) {
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

function unanchored(region: Region): string[] {
  const anchored = new Set(
    region.clues.filter((c) => c.kind === "quasar-sector").map((c) => c.quasar)
  );
  return Object.keys(region.solution).filter((n) => !anchored.has(n));
}

/** Every k-sized subset of `items`. */
function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [head, ...rest] = items;
  return [...combinations(rest, k - 1).map((c) => [head, ...c]), ...combinations(rest, k)];
}

const bar = (pct: number) => "#".repeat(Math.round(pct / 2)).padEnd(50);
const row = (label: string, pct: number) =>
  `  ${label.padEnd(38)} ${pct.toFixed(1).padStart(5)}%  ${bar(pct)}`;

// ---------------------------------------------------------------------

console.log(`Sampling ${SAMPLES} generated regions.\n`);
const regions = Array.from({ length: SAMPLES }, () => generateRegion());

function unsolvable(ch: Channels): number {
  let bad = 0;
  for (const r of regions) if (countConsistent(r, ch) !== 1) bad++;
  return (bad / SAMPLES) * 100;
}

const SWEEP: Channels = { distances: true };

console.log("QUESTION 1 - how finely should the census slice the field?");
console.log("(Sweep Scope always on. Percentages are regions that cannot be solved at all.)\n");
const census: [string, Channels][] = [
  ["No census at all", {}],
  ["Quadrants - 4 buckets (today)", { quadrantTotals: true }],
  ["Rings - 5 buckets", { ringTotals: true }],
  ["Segments - 8 buckets", { segmentTotals: true }],
  ["Quadrants + rings", { quadrantTotals: true, ringTotals: true }],
  ["Segments + rings", { segmentTotals: true, ringTotals: true }],
  ["Single sectors - 40 buckets", { sectorOccupancy: true }],
];
for (const [label, ch] of census) console.log(row(label, unsolvable({ ...SWEEP, ...ch })));

console.log("\n\nQUESTION 2 - the lifeline: ring scan vs high-energy pinpoint scan");
console.log("(Sweep Scope + today's quadrant census always on.)\n");
const BASE: Channels = { distances: true, quadrantTotals: true };
console.log(row("Today - no lifeline", unsolvable(BASE)));

// Ring scan aimed at named signatures. Measured both blind and well-aimed,
// so it is compared with the pinpoint scan on equal terms - aiming one well
// and the other blind was making the pinpoint look better than it is.
for (const budget of [1, 2, 3]) {
  let blind = 0;
  let aimed = 0;
  for (const r of regions) {
    const pool = unanchored(r);
    if (countConsistent(r, { ...BASE, ringKnown: new Set(pool.slice(0, budget)) }) === 1) blind++;
    if (
      combinations(pool, Math.min(budget, pool.length)).some(
        (pick) => countConsistent(r, { ...BASE, ringKnown: new Set(pick) }) === 1
      )
    )
      aimed++;
  }
  console.log(
    row(`Ring scan by signature x${budget} - aimed well`, 100 - (aimed / SAMPLES) * 100) +
      `   (aimed blind: ${(100 - (blind / SAMPLES) * 100).toFixed(1)}%)`
  );
}
{
  let bad = 0;
  for (const r of regions) {
    const known = new Set(unanchored(r));
    if (countConsistent(r, { ...BASE, ringKnown: known }) !== 1) bad++;
  }
  console.log(row("Ring scan by signature, unlimited", (bad / SAMPLES) * 100));
}
console.log(row("Ring scan by type (per-ring totals)", unsolvable({ ...BASE, ringTotals: true })));

// High-energy pinpoint. Measured two ways, because "used carefully" is the
// entire premise: `best` searches every choice of target and asks whether
// ANY choice resolves the region, `random` takes the first available.
console.log("");
for (const budget of [1, 2, 3]) {
  let best = 0;
  let random = 0;
  for (const r of regions) {
    const pool = unanchored(r);
    const options = combinations(pool, Math.min(budget, pool.length));
    if (options.some((pick) => countConsistent(r, { ...BASE, pinpoint: new Set(pick) }) === 1))
      best++;
    if (countConsistent(r, { ...BASE, pinpoint: new Set(pool.slice(0, budget)) }) === 1) random++;
  }
  console.log(
    row(`Pinpoint scan x${budget} - aimed well`, 100 - (best / SAMPLES) * 100) +
      `   (aimed blind: ${(100 - (random / SAMPLES) * 100).toFixed(1)}%)`
  );
}

console.log("\n\nQUESTION 3 - stacking them: a ring census first, then a lifeline\n");
{
  const ringCensus: Channels = { ...BASE, ringTotals: true };
  console.log(row("Ring census (replaces nothing, adds)", unsolvable(ringCensus)));
  for (const budget of [1, 2]) {
    let aimed = 0;
    for (const r of regions) {
      const pool = unanchored(r);
      if (
        combinations(pool, Math.min(budget, pool.length)).some(
          (pick) => countConsistent(r, { ...ringCensus, pinpoint: new Set(pick) }) === 1
        )
      )
        aimed++;
    }
    console.log(row(`  + pinpoint x${budget}, aimed well`, 100 - (aimed / SAMPLES) * 100));
  }
}

console.log("\n\nQUESTION 4 - do they overlap? (does one make the other pointless?)\n");
{
  const ringByType: Channels = { ...BASE, ringTotals: true };
  let bothNeeded = 0;
  let ringEnough = 0;
  let pinpointEnough = 0;
  let neither = 0;
  for (const r of regions) {
    const pool = unanchored(r);
    const ringOk = countConsistent(r, ringByType) === 1;
    const pinOk = combinations(pool, Math.min(2, pool.length)).some(
      (pick) => countConsistent(r, { ...BASE, pinpoint: new Set(pick) }) === 1
    );
    if (ringOk) ringEnough++;
    if (pinOk) pinpointEnough++;
    if (ringOk && pinOk) bothNeeded++;
    if (!ringOk && !pinOk) neither++;
  }
  const pct = (n: number) => ((n / SAMPLES) * 100).toFixed(1);
  console.log(`  Solvable with ring scan by type alone:      ${pct(ringEnough)}%`);
  console.log(`  Solvable with 2 well-aimed pinpoints alone: ${pct(pinpointEnough)}%`);
  console.log(`  Solvable with either:                       ${pct(bothNeeded)}% overlap`);
  console.log(`  Beyond help from both:                      ${pct(neither)}%`);
}

// Does knowing the ring actually hand you the segment, or does it only
// narrow it? Counts the candidate cells left for a single un-anchored
// signature, with and without its ring, at three levels of reference.
console.log("\n\nQUESTION 5 - what does knowing the ring actually buy?");
console.log("(Mean candidate cells left for one un-anchored signature.)\n");
{
  const anchorsOf = (r: Region) =>
    r.clues.filter((c) => c.kind === "quasar-sector").map((c) => (c as { quasar: string }).quasar);

  const levels: [string, (r: Region, n: string) => string[]][] = [
    ["one anchor", (r) => anchorsOf(r).slice(0, 1)],
    ["both anchors", (r) => anchorsOf(r)],
    ["every other signature", (r, n) => Object.keys(r.solution).filter((x) => x !== n)],
  ];

  for (const [label, refsOf] of levels) {
    let sumBlind = 0;
    let sumRing = 0;
    let sumRingSegments = 0;
    let n = 0;
    let forcedByRing = 0;
    for (const region of regions) {
      const truth = new Map(
        Object.keys(region.solution).map((k) => [k, sectorLookup.get(region.solution[k].sector)!])
      );
      for (const name of unanchored(region)) {
        const refs = refsOf(region, name);
        const fits = (cand: Sector) =>
          refs.every((ref) => observed(cand, truth.get(ref)!) === observed(truth.get(name)!, truth.get(ref)!));
        const blind = sectors.filter(fits);
        const withRing = blind.filter((s) => s.ring === truth.get(name)!.ring);
        sumBlind += blind.length;
        sumRing += withRing.length;
        sumRingSegments += new Set(withRing.map((s) => s.seg)).size;
        if (withRing.length === 1) forcedByRing++;
        n++;
      }
    }
    console.log(
      `  Against ${label.padEnd(22)} ring unknown: ${(sumBlind / n).toFixed(1).padStart(5)} cells   ` +
        `ring known: ${(sumRing / n).toFixed(2).padStart(4)} cells ` +
        `(${(sumRingSegments / n).toFixed(2)} segments)   ` +
        `segment forced: ${((forcedByRing / n) * 100).toFixed(0)}%`
    );
  }
}

console.log("\n\nQUESTION 6 - what the pinpoint scan costs you");
console.log("(A pinpoint hands over one of the answers. How much of the region is that?)\n");
{
  const sigCounts = new Map<number, number>();
  for (const r of regions)
    sigCounts.set(r.quasars.length, (sigCounts.get(r.quasars.length) ?? 0) + 1);
  for (const [n, count] of [...sigCounts.entries()].sort((a, b) => a[0] - b[0])) {
    const share = (1 / n) * 100;
    console.log(
      `  ${n} signatures (${((count / SAMPLES) * 100).toFixed(0)}% of regions): ` +
        `each pinpoint gives away ${share.toFixed(0)}% of the answer, ` +
        `two give ${(share * 2).toFixed(0)}%`
    );
  }
}
