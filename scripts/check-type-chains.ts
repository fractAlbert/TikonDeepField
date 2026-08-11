// Proves the indirect clue chain is what it claims to be.
//
// A chain is only worth anything if it is *exactly* the direct clue with a
// step in front of it. Two things have to hold for that, and neither is
// obvious from reading the generator: the chained type must be unique in its
// region, and the quadrant it names must be the signature's real one.
//
// Run: npx tsx scripts/check-type-chains.ts [samples]

import { buildSectors, quadrantOf } from "../src/lib/grid";
import { generateRegion } from "../src/lib/generate-region";
import { RANKS, DEFAULT_DIFFICULTY } from "../src/lib/ranks";

const sectorLookup = new Map(buildSectors().map((s) => [s.id, s]));
const SAMPLES = Number(process.argv[2] ?? 3000);

let fail = 0;
const check = (ok: boolean, msg: string) => { if (!ok) { fail++; console.log("FAIL " + msg); } };

for (const profile of [DEFAULT_DIFFICULTY, ...RANKS.map((r) => r.difficulty)]) {
  let regions = 0, chains = 0, directs = 0, wanted = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const region = generateRegion({ difficulty: profile });
    regions++;
    wanted += Math.min(profile.indirectClues, profile.quadrantClues);

    const typeClues = region.clues.filter((c) => c.kind === "quasar-type");
    const typeQuad = region.clues.filter((c) => c.kind === "type-quadrant");
    const direct = region.clues.filter((c) => c.kind === "quasar-quadrant");
    chains += typeClues.length;
    directs += direct.length;

    // Every quasar-type is matched by a type-quadrant on the same type.
    check(typeClues.length === typeQuad.length, "unpaired chain");

    for (const tc of typeClues) {
      if (tc.kind !== "quasar-type") continue;
      // 1. The named signature really is that type.
      check(region.solution[tc.quasar].type === tc.type, "chain names the wrong type");
      // 2. That type is held by exactly one signature - without this the
      //    partner clue does not resolve to a single name and the pair is
      //    NOT equivalent to the direct clue.
      const holders = Object.keys(region.solution).filter(
        (n) => region.solution[n].type === tc.type
      );
      check(holders.length === 1, `chained a type held by ${holders.length} signatures`);
      // 3. The partner names that signature's real quadrant.
      const partner = typeQuad.find((c) => c.kind === "type-quadrant" && c.type === tc.type);
      check(!!partner, "chain has no partner");
      if (partner && partner.kind === "type-quadrant") {
        const real = quadrantOf(sectorLookup.get(region.solution[tc.quasar].sector)!);
        check(partner.quadrant === real, "partner names the wrong quadrant");
      }
    }

    // Total quadrant facts always equals the profile's quadrantClues.
    check(direct.length + typeQuad.length === profile.quadrantClues, "quadrant fact count drifted");
  }

  const label = `sig=[${profile.signatures}] quad=${profile.quadrantClues} indirect=${profile.indirectClues}`;
  const pct = wanted === 0 ? 100 : (100 * chains) / wanted;
  console.log(
    `${label.padEnd(46)} chains ${String(chains).padStart(5)}/${String(wanted).padStart(5)}` +
      ` (${pct.toFixed(1)}% of budget met)  direct ${directs}`
  );
}

console.log(fail ? `\n${fail} check(s) failed.` : "\nAll checks passed.");
process.exit(fail ? 1 : 0);
