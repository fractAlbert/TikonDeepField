// Bakes the fixed tutorial region into src/data/regions/tutorial.ts.
//
// Separate from `find-tutorial-region.ts`, which surveys how *rare* a
// tutorial-grade region is and prints a candidate summary. This one emits
// the actual file, because the region has to be transcribed exactly - the
// walk-through is written against its solution, and a mistyped sector would
// make the tutorial teach the wrong inference.
//
// Same four bars as the finder, which are re-asserted at load time by
// `verify-puzzles.ts` so a hand-edit can't silently break them:
//
//   - six signatures
//   - NOT unique with no scans (propagation must hit a wall)
//   - unique after ONE scan, aimed at the right signature
//   - the rest falls out by plain elimination in <= 2 rounds
//
// It also prefers a region with exactly one viable scan target, so the
// walk-through's "work out which one you are actually stuck on" has a
// single defensible answer.
//
// Usage: npx tsx scripts/bake-tutorial-region.ts [samples]
//        npx tsx scripts/bake-tutorial-region.ts --write

import { writeFileSync } from "node:fs";
import { generateRegion } from "../src/lib/generate-region";
import { assessSolvability, uniqueWithRingsKnown } from "../src/lib/solvability";
import { buildSectors, orthogonalDistanceSigned, quadrantOf } from "../src/lib/grid";
import { Quadrant, Region, Sector } from "../src/lib/puzzle-types";

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const SAMPLES = Number(args.find((a) => /^\d+$/.test(a)) ?? 4000);

const TUTORIAL_ID = "region-tutorial";
const TUTORIAL_SIGNATURES = 6;
const MAX_ROUNDS = 2;
const VISIBILITY_RANGE = 5;
const OUT_OF_RANGE = 99;

const sectors = buildSectors();
const sectorLookup = new Map(sectors.map((s) => [s.id, s]));

function observed(a: Sector, b: Sector): number {
  const d = Math.abs(orthogonalDistanceSigned(a, b));
  return d <= VISIBILITY_RANGE ? d : OUT_OF_RANGE;
}

/** Rounds plain elimination needs, and how many it never resolves. */
function propagate(region: Region, ringKnown: Set<string>) {
  const names = Object.keys(region.solution);
  const truth = new Map(names.map((n) => [n, sectorLookup.get(region.solution[n].sector)!]));

  const fixed = new Map<string, string>();
  const quadClue = new Map<string, Quadrant>();
  for (const clue of region.clues) {
    if (clue.negate) continue;
    if (clue.kind === "quasar-sector") fixed.set(clue.quasar, clue.sector);
    if (clue.kind === "quasar-quadrant") quadClue.set(clue.quasar, clue.quadrant);
  }

  const unanchored = names.filter((n) => !fixed.has(n));
  const known = new Map<string, Sector>();
  for (const [n, sid] of fixed) known.set(n, sectorLookup.get(sid)!);

  const candidates = new Map<string, Sector[]>();
  for (const n of unanchored) {
    candidates.set(
      n,
      sectors.filter((s) => {
        if (quadClue.has(n) && quadrantOf(s) !== quadClue.get(n)) return false;
        if (ringKnown.has(n) && s.ring !== truth.get(n)!.ring) return false;
        return true;
      })
    );
  }

  let rounds = 0;
  for (;;) {
    const used = new Set([...known.values()].map((s) => s.id));
    for (const n of unanchored) {
      if (known.has(n)) continue;
      candidates.set(
        n,
        candidates.get(n)!.filter((cand) => {
          if (used.has(cand.id)) return false;
          for (const [k, ks] of known) {
            if (observed(cand, ks) !== observed(truth.get(n)!, truth.get(k)!)) return false;
          }
          return true;
        })
      );
    }
    let resolved = 0;
    for (const n of unanchored) {
      if (known.has(n)) continue;
      if (candidates.get(n)!.length === 1) {
        known.set(n, candidates.get(n)![0]);
        resolved++;
      }
    }
    if (resolved === 0) break;
    rounds++;
  }
  return { rounds, stuck: unanchored.filter((n) => !known.has(n)).length };
}

function scannable(region: Region): string[] {
  const anchored = new Set(
    region.clues.filter((c) => c.kind === "quasar-sector").map((c) => c.quasar)
  );
  return Object.keys(region.solution).filter((n) => !anchored.has(n));
}

/** All four bars, as one predicate. Returns the viable scan targets. */
function grade(region: Region): { targets: string[]; rounds: number } | null {
  if (region.quasars.length !== TUTORIAL_SIGNATURES) return null;
  if (uniqueWithRingsKnown(region)) return null; // must hit a wall
  const targets = scannable(region).filter((n) => uniqueWithRingsKnown(region, [n]));
  if (targets.length === 0) return null;
  const viable = targets
    .map((t) => ({ t, ...propagate(region, new Set([t])) }))
    .filter((r) => r.stuck === 0 && r.rounds <= MAX_ROUNDS);
  if (viable.length === 0) return null;
  return {
    targets: viable.map((v) => v.t),
    rounds: Math.min(...viable.map((v) => v.rounds)),
  };
}

let best: { region: Region; targets: string[]; rounds: number } | null = null;
let graded = 0;
for (let i = 0; i < SAMPLES; i++) {
  const region = generateRegion();
  const g = grade(region);
  if (!g) continue;
  graded++;
  // Fewest viable aim points wins: exactly one makes the walk-through's
  // advice unambiguous. Ties break toward the shallower propagation.
  if (
    !best ||
    g.targets.length < best.targets.length ||
    (g.targets.length === best.targets.length && g.rounds < best.rounds)
  ) {
    best = { region, ...g };
  }
}

if (!best) {
  console.error(`No tutorial-grade region in ${SAMPLES} samples. Try more.`);
  process.exit(1);
}

const { region, targets, rounds } = best;
const anchors = region.clues.filter((c) => c.kind === "quasar-sector") as {
  quasar: string;
  sector: string;
}[];

console.log(`${graded} tutorial-grade of ${SAMPLES} sampled.\n`);
console.log(`--- ${region.name} ---`);
console.log(`  resolves in ${rounds} round(s) after one scan`);
console.log(`  scan targets that work: ${targets.join(", ")}${targets.length === 1 ? "  (the only one)" : ""}`);
console.log(`  anchors: ${anchors.map((c) => `${c.quasar} at ${c.sector}`).join(", ")}`);
for (const q of region.quasars) {
  console.log(
    `  ${q.designation.padEnd(12)} ${region.solution[q.id].sector}  ${region.solution[q.id].type}`
  );
}

if (!WRITE) {
  console.log("\n(dry run — pass --write to emit src/data/regions/tutorial.ts)");
  process.exit(0);
}

// The baked region carries its own solvability verdict, exactly as a
// generated one does: it is not solvable without a scan, and is with one.
const solvability = assessSolvability(region);

const q = (s: string) => (/^[A-Za-z_$][\w$]*$/.test(s) ? s : JSON.stringify(s));
const file = `import { Region } from "@/lib/puzzle-types";

// The first-run tutorial's region. Fixed, not generated - see
// docs/tutorial-plan.md.
//
// Baked by \`scripts/bake-tutorial-region.ts\`; do not hand-edit. The
// walk-through is written against these exact sectors ("${targets[0]} reads
// the same from both anchors, so bearings alone cannot place it"), so a
// changed coordinate silently makes the tutorial teach a false inference.
// \`scripts/verify-puzzles.ts\` re-asserts the four bars on every run.
//
// What makes it tutorial-grade:
//   - ${TUTORIAL_SIGNATURES} signatures, the smallest a region comes
//   - NOT solvable from bearings alone: propagation stalls on purpose, and
//     that wall is where the walk-through introduces the Ring Scan
//   - ONE scan is enough, and exactly one signature is worth aiming it at
//     (${targets.join(", ")}), so "work out which one you are stuck on" has
//     a single defensible answer
//   - after the scan the rest falls out by plain elimination in ${rounds} round(s)
//
// Exported on its own rather than added to \`regions\` in ./index.ts: that
// list is a legacy resolver for old \`origin: "builtin"\` log entries, and
// seeding the roster from it is exactly what the no-default-region change
// removed.
export const TUTORIAL_REGION_ID = ${JSON.stringify(TUTORIAL_ID)};

/** The one signature a ring scan has to be aimed at for this to resolve. */
export const TUTORIAL_SCAN_TARGET = ${JSON.stringify(targets[0])};

export const tutorialRegion: Region = {
  id: TUTORIAL_REGION_ID,
  name: ${JSON.stringify(region.name)},
  briefing: ${JSON.stringify(region.briefing)},
  quasarTypes: [${region.quasarTypes.map((t) => JSON.stringify(t)).join(", ")}],
  quasars: [
${region.quasars.map((x) => `    { id: ${JSON.stringify(x.id)}, designation: ${JSON.stringify(x.designation)} },`).join("\n")}
  ],
  solution: {
${region.quasars
  .map(
    (x) =>
      `    ${q(x.id)}: { type: ${JSON.stringify(region.solution[x.id].type)}, sector: ${JSON.stringify(
        region.solution[x.id].sector
      )} },`
  )
  .join("\n")}
  },
  clues: [
${region.clues
  .map(
    (c) =>
      `    { ${Object.entries(c)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(", ")} },`
  )
  .join("\n")}
  ],
  solvability: { withoutScans: ${solvability.withoutScans}, withBestScans: ${solvability.withBestScans} },
};
`;

writeFileSync("src/data/regions/tutorial.ts", file);
console.log("\nWrote src/data/regions/tutorial.ts");
