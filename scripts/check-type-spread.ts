// Two questions about how classifications land on the field.
//
// 1. If a type is held by two or more signatures, does it always occupy two
//    or more quadrants? No - they can share one, and then no chain is
//    emitted. This measures how often that happens, because it is the case
//    that silently falls back to a direct clue.
//
// 2. Can two signatures share a sector? No, and several things depend on it:
//    `solvability.ts` tracks a `used` set and refuses to place two
//    signatures in one cell, which is only a correct search if generation
//    never does it either. Asserted here rather than assumed.
//
// Run: npx tsx scripts/check-type-spread.ts [samples]

import { buildSectors, quadrantOf } from "../src/lib/grid";
import { generateRegion } from "../src/lib/generate-region";
import { DEFAULT_DIFFICULTY } from "../src/lib/ranks";

const sectorLookup = new Map(buildSectors().map((s) => [s.id, s]));
const SAMPLES = Number(process.argv[2] ?? 4000);

let sharedSector = 0;
let typesTotal = 0;
let typesSingleton = 0;
let typesMultiOneQuadrant = 0;
let typesMultiSpread = 0;
const spreadHistogram = new Map<number, number>();
let chainsSeen = 0;
let chainsUnder2 = 0;

for (let i = 0; i < SAMPLES; i++) {
  const region = generateRegion({ difficulty: DEFAULT_DIFFICULTY });
  const names = Object.keys(region.solution);

  // 2. Sectors must be distinct across the whole region.
  const seen = new Set<string>();
  for (const n of names) {
    const s = region.solution[n].sector;
    if (seen.has(s)) sharedSector++;
    seen.add(s);
  }

  // 1. Per classification: how many hold it, and how many quadrants.
  const holders = new Map<string, string[]>();
  for (const n of names) {
    const t = region.solution[n].type;
    holders.set(t, [...(holders.get(t) ?? []), n]);
  }

  for (const [, hs] of holders) {
    typesTotal++;
    if (hs.length === 1) {
      typesSingleton++;
      continue;
    }
    const quads = new Set(hs.map((n) => quadrantOf(sectorLookup.get(region.solution[n].sector)!)));
    if (quads.size === 1) typesMultiOneQuadrant++;
    else {
      typesMultiSpread++;
      spreadHistogram.set(quads.size, (spreadHistogram.get(quads.size) ?? 0) + 1);
    }
  }

  // Every emitted chain must list at least two quadrants, which is what
  // makes "at least two of them" a safe read for the player.
  for (const c of region.clues) {
    if (c.kind !== "type-quadrant-set") continue;
    chainsSeen++;
    if (c.quadrants.length < 2) chainsUnder2++;
  }
}

const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;

console.log(`${SAMPLES} regions, ${typesTotal} classifications drawn\n`);
console.log(`held by exactly one signature   ${String(typesSingleton).padStart(6)}  ${pct(typesSingleton, typesTotal)}`);
console.log(`held by several, one quadrant   ${String(typesMultiOneQuadrant).padStart(6)}  ${pct(typesMultiOneQuadrant, typesTotal)}   <- no chain, falls back to a direct clue`);
console.log(`held by several, spread out     ${String(typesMultiSpread).padStart(6)}  ${pct(typesMultiSpread, typesTotal)}   <- chainable`);

console.log("\nquadrants occupied, among spread types:");
for (const k of [...spreadHistogram.keys()].sort()) {
  console.log(`  ${k} quadrants   ${String(spreadHistogram.get(k)).padStart(6)}  ${pct(spreadHistogram.get(k)!, typesMultiSpread)}`);
}

console.log(
  `\ntwo signatures sharing a sector: ${sharedSector}` +
    (sharedSector === 0 ? "  (never - sectors are drawn without replacement)" : "  <- FAILED")
);
console.log(
  `chains listing fewer than 2 quadrants: ${chainsUnder2}` +
    (chainsUnder2 === 0 ? `  (never, of ${chainsSeen} chains)` : "  <- FAILED")
);

process.exit(sharedSector === 0 && chainsUnder2 === 0 ? 0 : 1);
