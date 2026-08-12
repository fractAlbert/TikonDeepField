// Checks the invariants a clue chain has to hold, now that a chain is a real
// ambiguity rather than an extra step.
//
// A chain is two clues: "OJ 502 is classified Ancient Relic" plus "Ancient
// Relic signatures are confined to Quadrants II and IV". Together they say
// the named signature is in one of those quadrants - genuinely less than a
// direct quadrant clue, which is the point.
//
// Run: npx tsx scripts/check-type-chains.ts [samples]

import { buildSectors, quadrantOf } from "../src/lib/grid";
import { generateRegion } from "../src/lib/generate-region";
import { RANKS, DEFAULT_DIFFICULTY } from "../src/lib/ranks";

const sectorLookup = new Map(buildSectors().map((s) => [s.id, s]));
const SAMPLES = Number(process.argv[2] ?? 2000);

let fail = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) {
    fail++;
    if (fail <= 6) console.log("FAIL " + msg);
  }
};

for (const profile of [DEFAULT_DIFFICULTY, ...RANKS.map((r) => r.difficulty)]) {
  let chains = 0;
  let regionsWithChain = 0;
  let spreadTotal = 0;

  for (let i = 0; i < SAMPLES; i++) {
    const region = generateRegion({ difficulty: profile });
    const names = Object.keys(region.solution);

    const typeClues = region.clues.filter((c) => c.kind === "quasar-type");
    const setClues = region.clues.filter((c) => c.kind === "type-quadrant-set");
    const direct = region.clues.filter((c) => c.kind === "quasar-quadrant");

    chains += typeClues.length;
    if (typeClues.length) regionsWithChain++;
    check(typeClues.length === setClues.length, "unpaired chain");

    // The pointless single-quadrant form must never be generated - a chain
    // that names one quadrant is exactly the direct clue with a hop in front.
    for (const c of setClues) {
      if (c.kind !== "type-quadrant-set") continue;
      check(c.quadrants.length > 1, `chain with only ${c.quadrants.length} quadrant(s)`);
      spreadTotal += c.quadrants.length;
    }

    for (const tc of typeClues) {
      if (tc.kind !== "quasar-type") continue;
      check(region.solution[tc.quasar].type === tc.type, "chain names the wrong type");

      const partner = setClues.find((c) => c.kind === "type-quadrant-set" && c.type === tc.type);
      check(!!partner, "chain has no partner");
      if (!partner || partner.kind !== "type-quadrant-set") continue;

      // The listed set must be *exactly* the quadrants that type occupies.
      // Too few and the clue is false; too many and it is a lie in the other
      // direction, quietly widening the search for no reason.
      const actual = new Set(
        names
          .filter((n) => region.solution[n].type === tc.type)
          .map((n) => quadrantOf(sectorLookup.get(region.solution[n].sector)!))
      );
      check(actual.size === partner.quadrants.length, "listed set is the wrong size");
      for (const q of partner.quadrants) check(actual.has(q), `listed quadrant ${q} holds none`);

      // And the named signature must itself be inside its own type's set.
      const own = quadrantOf(sectorLookup.get(region.solution[tc.quasar].sector)!);
      check(partner.quadrants.includes(own), "named signature is outside its own type's set");
    }

    // A chain replaces a direct clue rather than adding one.
    check(
      direct.length + setClues.length === profile.quadrantClues,
      `quadrant fact count drifted: ${direct.length} + ${setClues.length} != ${profile.quadrantClues}`
    );
  }

  const label = `quad=${profile.quadrantClues} indirect=${profile.indirectClues}`;
  const pct = (100 * regionsWithChain) / SAMPLES;
  const meanSpread = chains ? (spreadTotal / chains).toFixed(2) : "-";
  console.log(
    `${label.padEnd(26)} ${String(regionsWithChain).padStart(5)}/${SAMPLES} regions chained` +
      ` (${pct.toFixed(1)}%)   mean quadrants listed ${meanSpread}`
  );
}

console.log(fail ? `\n${fail} check(s) failed.` : "\nAll checks passed.");
process.exit(fail ? 1 : 0);
