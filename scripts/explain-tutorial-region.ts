// Walks the baked tutorial region the way a player would, and prints the
// deduction path in order.
//
// This exists because the walk-through copy is written against the actual
// solution - "CTA 118 reads the same from both anchors, so bearings alone
// cannot place it" - and that claim has to be true of the region that is
// actually baked. Re-run it after `bake-tutorial-region.ts` and write the
// steps from its output rather than from memory.
//
// It reports, in order: what the briefing gives away, which signatures fall
// out by plain elimination before any scan, exactly which one is stuck and
// what its surviving candidates are, and what one scan unlocks.
//
// Usage: npx tsx scripts/explain-tutorial-region.ts

import { TUTORIAL_SCAN_TARGET, tutorialRegion } from "../src/data/regions/tutorial";
import { uniqueWithRingsKnown } from "../src/lib/solvability";
import { buildSectors, orthogonalDistanceSigned, quadrantOf } from "../src/lib/grid";
import { Quadrant, Sector } from "../src/lib/puzzle-types";

const R = tutorialRegion;
const VISIBILITY_RANGE = 5;
const OUT_OF_RANGE = 99;

const sectors = buildSectors();
const byId = new Map(sectors.map((s) => [s.id, s]));
const names = Object.keys(R.solution);
const truth = new Map(names.map((n) => [n, byId.get(R.solution[n].sector)!]));

const observed = (a: Sector, b: Sector) => {
  const d = Math.abs(orthogonalDistanceSigned(a, b));
  return d <= VISIBILITY_RANGE ? d : OUT_OF_RANGE;
};

const fixed = new Map<string, string>();
const quad = new Map<string, Quadrant>();
for (const c of R.clues) {
  if (c.negate) continue;
  if (c.kind === "quasar-sector") fixed.set(c.quasar, c.sector);
  if (c.kind === "quasar-quadrant") quad.set(c.quasar, c.quadrant);
}

/** Plain elimination, reporting which signature resolves in which round. */
function propagate(ringKnown: Set<string>) {
  const unanchored = names.filter((n) => !fixed.has(n));
  const known = new Map<string, Sector>();
  for (const [n, sid] of fixed) known.set(n, byId.get(sid)!);

  const cand = new Map<string, Sector[]>();
  for (const n of unanchored) {
    cand.set(
      n,
      sectors.filter((s) => {
        if (quad.has(n) && quadrantOf(s) !== quad.get(n)) return false;
        if (ringKnown.has(n) && s.ring !== truth.get(n)!.ring) return false;
        return true;
      })
    );
  }

  const rounds: string[][] = [];
  for (;;) {
    const used = new Set([...known.values()].map((s) => s.id));
    for (const n of unanchored) {
      if (known.has(n)) continue;
      cand.set(
        n,
        cand.get(n)!.filter((c) => {
          if (used.has(c.id)) return false;
          for (const [k, ks] of known) {
            if (observed(c, ks) !== observed(truth.get(n)!, truth.get(k)!)) return false;
          }
          return true;
        })
      );
    }
    const got: string[] = [];
    for (const n of unanchored) {
      if (known.has(n)) continue;
      if (cand.get(n)!.length === 1) {
        known.set(n, cand.get(n)![0]);
        got.push(n);
      }
    }
    if (got.length === 0) break;
    rounds.push(got);
  }

  const stuck = unanchored.filter((n) => !known.has(n));
  return { rounds, stuck, candidatesFor: (n: string) => cand.get(n)!.map((s) => s.id) };
}

const where = (n: string) => R.solution[n].sector;

console.log(`=== ${R.name} (${R.id}) ===\n`);
console.log(`Signatures: ${R.quasars.map((q) => q.designation).join(", ")}\n`);

console.log("Briefing gives you:");
for (const [n, s] of fixed) console.log(`  ${n} is at ${s}   (exact anchor)`);
for (const [n, q] of quad) console.log(`  ${n} is in Quadrant ${q}`);
const unclued = names.filter((n) => !fixed.has(n) && !quad.has(n));
console.log(`  nothing at all about: ${unclued.join(", ")}\n`);

const before = propagate(new Set());
console.log("Plain elimination from bearings alone:");
before.rounds.forEach((g, i) =>
  console.log(`  round ${i + 1}: ${g.map((n) => `${n} -> ${where(n)}`).join(", ")}`)
);
if (before.rounds.length === 0) console.log("  (nothing resolves)");

console.log(`\n  THE WALL: ${before.stuck.join(", ") || "(nothing stuck — region is not tutorial-grade!)"}`);
for (const n of before.stuck) {
  const cands = before.candidatesFor(n);
  console.log(`    ${n} still has ${cands.length} candidate(s): ${cands.join(", ")}`);
  console.log(`    truth is ${where(n)}`);
  // Why the anchors can't separate them: they read identically from both.
  for (const [a, asid] of fixed) {
    const reads = cands.map((c) => observed(byId.get(c)!, byId.get(asid)!));
    console.log(`      from ${a} (${asid}): ${cands.map((c, i) => `${c}=${reads[i]}`).join("  ")}`);
  }
}

const scanRing = truth.get(TUTORIAL_SCAN_TARGET)!.ring + 1;
console.log(`\nOne ring scan aimed at ${TUTORIAL_SCAN_TARGET} returns: ring ${scanRing}`);
const after = propagate(new Set([TUTORIAL_SCAN_TARGET]));
after.rounds.forEach((g, i) =>
  console.log(`  round ${i + 1}: ${g.map((n) => `${n} -> ${where(n)}`).join(", ")}`)
);
console.log(`  stuck after the scan: ${after.stuck.join(", ") || "(none)"}`);

const otherTargets = names
  .filter((n) => !fixed.has(n) && n !== TUTORIAL_SCAN_TARGET)
  .filter((n) => uniqueWithRingsKnown(R, [n]));
console.log(
  `\nOther signatures a single scan would also crack: ${otherTargets.join(", ") || "(none — the aim point is unambiguous)"}`
);

console.log("\nCatalog (secret until the region closes):");
for (const q of R.quasars) {
  console.log(`  ${q.designation.padEnd(10)} ${where(q.id).padEnd(5)} ${R.solution[q.id].type}`);
}
