// What generation can actually turn to make a region harder or easier.
//
// Backlog item 1 says regions should get harder as rank rises, and the
// `duty` line on every rung already promises it. Before picking numbers,
// this measures what each available lever is *worth* - because two of the
// three do not move difficulty the way you would guess, and one of them
// moves it the wrong way.
//
// Difficulty is read through `assessSolvability`, which is the app's own
// verdict and the same function the Log reads back:
//
//   solvable without scans - the briefing plus bearings pin every signature.
//   needs a scan           - propagation stalls; a well-aimed ring scan closes it.
//   unsolvable             - two positions stay consistent with everything.
//
// "Needs a scan" is the interesting band. It is where the Ring Scan earns
// its place, and where a player's judgement about *which* signature to aim
// at decides the region - so it is the band difficulty should grow into,
// not the unsolvable one, which is just a tax.
//
// Usage: npx tsx scripts/measure-difficulty-levers.ts [samples]

import { Clue, Region } from "../src/lib/puzzle-types";
import { buildSectors, orthogonalDistanceSigned, quadrantOf } from "../src/lib/grid";
import { generateRegion } from "../src/lib/generate-region";
import { assessSolvability } from "../src/lib/solvability";
import { solveByPropagation } from "./propagation";

const SAMPLES = Number(process.argv[2] ?? 1500);
const sectorLookup = new Map(buildSectors().map((s) => [s.id, s]));

interface Tally {
  n: number;
  clean: number; // solvable from bearings alone
  needsScan: number;
  unsolvable: number;
}

const empty = (): Tally => ({ n: 0, clean: 0, needsScan: 0, unsolvable: 0 });

function record(t: Tally, region: Region) {
  const s = assessSolvability(region);
  t.n++;
  if (!s.withBestScans) t.unsolvable++;
  else if (s.withoutScans) t.clean++;
  else t.needsScan++;
}

function row(label: string, t: Tally): string {
  const pct = (n: number) => `${((n / t.n) * 100).toFixed(1)}%`.padStart(7);
  return `  ${label.padEnd(26)} ${String(t.n).padStart(5)}  ${pct(t.clean)}${pct(t.needsScan)}${pct(
    t.unsolvable
  )}`;
}

const HEAD = `  ${"".padEnd(26)} ${"n".padStart(5)}   clean  scan   unsolvable`;

/** Rebuild a region with a different set of quadrant clues. */
function withQuadrantClues(region: Region, count: number): Region {
  const anchors = region.clues.filter((c) => c.kind === "quasar-sector");
  const anchored = new Set(
    anchors.map((c) => (c.kind === "quasar-sector" ? c.quasar : "")).filter(Boolean)
  );
  const candidates = Object.keys(region.solution).filter((n) => !anchored.has(n));
  const quads: Clue[] = candidates.slice(0, count).map((quasar) => ({
    kind: "quasar-quadrant",
    quasar,
    quadrant: quadrantOf(sectorLookup.get(region.solution[quasar].sector)!),
  }));
  return { ...region, clues: [...anchors, ...quads] };
}

/** Rebuild a region with a different number of exact-position anchors. */
function withAnchors(region: Region, count: number): Region {
  const quads = region.clues.filter((c) => c.kind === "quasar-quadrant");
  const named = new Set(
    quads.map((c) => (c.kind === "quasar-quadrant" ? c.quasar : "")).filter(Boolean)
  );
  const existing = region.clues.filter((c) => c.kind === "quasar-sector");
  const extras = Object.keys(region.solution).filter(
    (n) => !named.has(n) && !existing.some((c) => c.kind === "quasar-sector" && c.quasar === n)
  );
  const anchors: Clue[] = [...existing]
    .concat(
      extras.map((quasar) => ({
        kind: "quasar-sector" as const,
        quasar,
        sector: region.solution[quasar].sector,
      }))
    )
    .slice(0, count);
  return { ...region, clues: [...anchors, ...quads] };
}

const pool: Region[] = [];
for (let i = 0; i < SAMPLES; i++) pool.push(generateRegion());

// ---------------------------------------------------------------------
console.log("\n1. SIGNATURE COUNT - the lever that already varies (6-8)\n");
console.log(HEAD);
const bySize = new Map<number, Tally>();
for (const r of pool) {
  const size = r.quasars.length;
  if (!bySize.has(size)) bySize.set(size, empty());
  record(bySize.get(size)!, r);
}
for (const size of [...bySize.keys()].sort()) {
  console.log(row(`${size} signatures`, bySize.get(size)!));
}
console.log(
  "\n  More signatures means more unknowns AND more readings. Watch which wins."
);

// ---------------------------------------------------------------------
console.log("\n\n2. QUADRANT CLUES - the briefing's soft half (2 today)\n");
console.log(HEAD);
for (const count of [0, 1, 2, 3, 4]) {
  const t = empty();
  for (const r of pool) record(t, withQuadrantClues(r, count));
  console.log(row(`${count} quadrant clue${count === 1 ? "" : "s"}`, t));
}

// ---------------------------------------------------------------------
// Solvability is only one axis, and on its own it is the wrong one.
// Knowing a signature's quadrant collapses its candidates from 40 cells to
// 10 *before any reasoning happens* - you look at a quarter of the dial
// instead of the whole thing. That is a large change in how much work the
// region is, and `assessSolvability` cannot see it at all, because it
// answers "is the answer unique" rather than "how much searching".
//
// Measured by propagation instead: how much falls out immediately, how
// many rounds of chaining are needed, and how many candidate eliminations
// the player has to grind through.
console.log("\n\n2b. QUADRANT CLUES AS SEARCH EFFORT - the axis solvability misses\n");
console.log(
  `  ${"".padEnd(26)}  start   round-1   rounds   elims   stuck`
);
for (const count of [0, 1, 2, 3, 4, 5]) {
  let startCandidates = 0;
  let unknowns = 0;
  let round1 = 0;
  let rounds = 0;
  let solved = 0;
  let elims = 0;
  let stuck = 0;
  for (const r of pool) {
    const shaped = withQuadrantClues(r, count);
    const clued = shaped.clues.filter((c) => c.kind === "quasar-quadrant").length;
    const o = solveByPropagation(shaped, { label: "", ringBudget: 0 });
    // 10 cells inside a named quadrant, 40 without one.
    startCandidates += clued * 10 + (o.unknowns - clued) * 40;
    unknowns += o.unknowns;
    round1 += o.perRound[0] ?? 0;
    elims += o.eliminations;
    stuck += o.stuck;
    if (o.stuck === 0) {
      solved++;
      rounds += o.rounds;
    }
  }
  const n = pool.length;
  console.log(
    `  ${`${count} quadrant clue${count === 1 ? "" : "s"}`.padEnd(26)}` +
      `${(startCandidates / unknowns).toFixed(1).padStart(6)}` +
      `${((round1 / unknowns) * 100).toFixed(0).padStart(8)}%` +
      `${(rounds / Math.max(1, solved)).toFixed(2).padStart(9)}` +
      `${(elims / n).toFixed(0).padStart(8)}` +
      `${(stuck / n).toFixed(2).padStart(8)}`
  );
}
console.log(
  "\n  start   = mean candidate cells per unknown signature, before any work\n" +
    "  round-1 = share of unknowns that fall out immediately, no chaining\n" +
    "  rounds  = chaining depth when propagation does finish\n" +
    "  elims   = candidate eliminations the player grinds through\n" +
    "  stuck   = signatures propagation cannot reach at all"
);

// ---------------------------------------------------------------------
console.log("\n\n3. EXACT ANCHORS - the briefing's hard half (2 today)\n");
console.log(HEAD);
for (const count of [1, 2, 3]) {
  const t = empty();
  for (const r of pool) record(t, withAnchors(r, count));
  console.log(row(`${count} anchor${count === 1 ? "" : "s"}`, t));
}
console.log(
  "\n  One anchor is not a triangulation baseline at all - every distance\n" +
    "  is measured from a single point, so it is a different puzzle rather\n" +
    "  than a harder one."
);

// ---------------------------------------------------------------------
// The finer version of lever 3: not how many anchors, but how good a
// baseline the pair makes. Generation already constrains this to 2..5.
console.log("\n\n4. ANCHOR SEPARATION - the quality of the baseline (2-5 today)\n");
console.log(HEAD);
for (const d of [1, 2, 3, 4, 5, 6, 7]) {
  const t = empty();
  for (const r of pool) {
    const names = Object.keys(r.solution);
    const pairs: [string, string][] = [];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = sectorLookup.get(r.solution[names[i]].sector)!;
        const b = sectorLookup.get(r.solution[names[j]].sector)!;
        if (Math.abs(orthogonalDistanceSigned(a, b)) === d) pairs.push([names[i], names[j]]);
      }
    }
    if (pairs.length === 0) continue;
    const [a, b] = pairs[Math.floor(Math.random() * pairs.length)];
    const quads = r.clues.filter(
      (c) => c.kind === "quasar-quadrant" && c.quasar !== a && c.quasar !== b
    );
    const clues: Clue[] = [
      { kind: "quasar-sector", quasar: a, sector: r.solution[a].sector },
      { kind: "quasar-sector", quasar: b, sector: r.solution[b].sector },
      ...quads,
    ];
    record(t, { ...r, clues });
  }
  const inRange = d >= 2 && d <= 5 ? "" : "  (outside today's range)";
  console.log(row(`anchors ${d} apart${inRange}`, t));
}

// ---------------------------------------------------------------------
// The three levers composed into one profile per rung. This is the
// proposal in docs/region-difficulty.md, measured rather than asserted.
console.log("\n\n5. PROPOSED PER-RANK PROFILES\n");
console.log(HEAD);

interface Profile {
  label: string;
  signatures: number[];
  separation: [number, number];
  quadrantClues: number;
}

const PROFILES: Profile[] = [
  { label: "0 Technician", signatures: [8], separation: [4, 5], quadrantClues: 4 },
  { label: "1 Assistant", signatures: [7, 8], separation: [3, 5], quadrantClues: 3 },
  { label: "2 Officer (today)", signatures: [6, 7, 8], separation: [2, 5], quadrantClues: 2 },
  { label: "3 Senior", signatures: [6, 7], separation: [2, 4], quadrantClues: 1 },
  { label: "4 Chief", signatures: [6], separation: [2, 3], quadrantClues: 0 },
];

/**
 * A shallower bottom half, measured because the career simulation says the
 * shipped one is *too* kind: a careless player recovers off the bottom rung
 * and is never relieved at all, which deletes the loss state. These two
 * rows are the candidate fix - the top three rungs are untouched.
 */
const SOFTER_BOTTOM: Profile[] = [
  { label: "0 Technician (alt)", signatures: [8], separation: [4, 5], quadrantClues: 3 },
  { label: "1 Assistant (alt)", signatures: [7, 8], separation: [3, 5], quadrantClues: 2 },
];

function reshape(r: Region, p: Profile): Region | null {
  const names = Object.keys(r.solution);
  const pairs: [string, string][] = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = sectorLookup.get(r.solution[names[i]].sector)!;
      const b = sectorLookup.get(r.solution[names[j]].sector)!;
      const d = Math.abs(orthogonalDistanceSigned(a, b));
      if (d >= p.separation[0] && d <= p.separation[1]) pairs.push([names[i], names[j]]);
    }
  }
  if (pairs.length === 0) return null;
  const [a, b] = pairs[Math.floor(Math.random() * pairs.length)];
  const rest = names.filter((n) => n !== a && n !== b);
  const clues: Clue[] = [
    { kind: "quasar-sector", quasar: a, sector: r.solution[a].sector },
    { kind: "quasar-sector", quasar: b, sector: r.solution[b].sector },
    ...rest.slice(0, p.quadrantClues).map((quasar) => ({
      kind: "quasar-quadrant" as const,
      quasar,
      quadrant: quadrantOf(sectorLookup.get(r.solution[quasar].sector)!),
    })),
  ];
  return { ...r, clues };
}

console.log("  (a) solvability\n");
console.log(HEAD);
const shapedByProfile = new Map<string, Region[]>();
for (const p of PROFILES) {
  const t = empty();
  const shapedAll: Region[] = [];
  for (const r of pool) {
    if (!p.signatures.includes(r.quasars.length)) continue;
    const shaped = reshape(r, p);
    if (shaped) {
      shapedAll.push(shaped);
      record(t, shaped);
    }
  }
  shapedByProfile.set(p.label, shapedAll);
  console.log(row(p.label, t));
}

console.log("\n  (b) search effort - the axis that decides how much thinking\n");
console.log(`  ${"".padEnd(26)}  start   round-1   rounds   elims   stuck`);
for (const p of PROFILES) {
  const shaped = shapedByProfile.get(p.label)!;
  let startCandidates = 0;
  let unknowns = 0;
  let round1 = 0;
  let rounds = 0;
  let solved = 0;
  let elims = 0;
  let stuck = 0;
  for (const r of shaped) {
    const clued = r.clues.filter((c) => c.kind === "quasar-quadrant").length;
    const o = solveByPropagation(r, { label: "", ringBudget: 0 });
    startCandidates += clued * 10 + (o.unknowns - clued) * 40;
    unknowns += o.unknowns;
    round1 += o.perRound[0] ?? 0;
    elims += o.eliminations;
    stuck += o.stuck;
    if (o.stuck === 0) {
      solved++;
      rounds += o.rounds;
    }
  }
  console.log(
    `  ${p.label.padEnd(26)}` +
      `${(startCandidates / unknowns).toFixed(1).padStart(6)}` +
      `${((round1 / unknowns) * 100).toFixed(0).padStart(8)}%` +
      `${(rounds / Math.max(1, solved)).toFixed(2).padStart(9)}` +
      `${(elims / shaped.length).toFixed(0).padStart(8)}` +
      `${(stuck / shaped.length).toFixed(2).padStart(8)}`
  );
}

console.log("\n  (c) candidate fix for the bottom rungs - see the note on SOFTER_BOTTOM\n");
console.log(HEAD);
for (const p of SOFTER_BOTTOM) {
  const t = empty();
  const shaped: Region[] = [];
  for (const r of pool) {
    if (!p.signatures.includes(r.quasars.length)) continue;
    const out = reshape(r, p);
    if (out) {
      shaped.push(out);
      record(t, out);
    }
  }
  console.log(row(p.label, t));
  let stuck = 0;
  for (const r of shaped) stuck += solveByPropagation(r, { label: "", ringBudget: 0 }).stuck;
  console.log(`  ${"".padEnd(26)} stuck ${(stuck / shaped.length).toFixed(2)}`);
}

console.log(`\nSampled ${SAMPLES} generated regions.\n`);
