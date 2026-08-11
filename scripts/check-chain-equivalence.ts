// Proves an indirect clue chain is *exactly* the direct clue, region by region.
//
// The whole case for `indirectClues` rests on one claim: a chain changes how
// hard a briefing is to read and not how hard the region is to solve. That is
// an equivalence, so a statistical comparison of solvable-rates is the wrong
// instrument - at a few hundred samples per bucket the noise is wider than
// any effect worth catching, and "the numbers look similar" would prove
// nothing.
//
// This checks it per region instead. For each generated region, assess
// solvability as generated, then flatten every chain back into the direct
// `quasar-quadrant` clue it stands for and assess again. If the fold in
// `solvability.ts` is correct the two must agree on **every** region, not on
// average.
//
// Run: npx tsx scripts/check-chain-equivalence.ts [samples]

import { generateRegion } from "../src/lib/generate-region";
import { assessSolvability } from "../src/lib/solvability";
import { Clue, Quadrant, Region } from "../src/lib/puzzle-types";
import { RANKS, DEFAULT_DIFFICULTY } from "../src/lib/ranks";

const SAMPLES = Number(process.argv[2] ?? 400);

/** Rewrites chains as the direct clue, leaving everything else alone. */
function flatten(region: Region): Region {
  const quadrantOfType = new Map<string, Quadrant>();
  for (const c of region.clues) {
    if (!c.negate && c.kind === "type-quadrant") quadrantOfType.set(c.type, c.quadrant);
  }

  const out: Clue[] = [];
  for (const c of region.clues) {
    if (c.kind === "type-quadrant") continue; // consumed by its partner
    if (c.kind === "quasar-type" && !c.negate) {
      const quadrant = quadrantOfType.get(c.type);
      if (quadrant !== undefined) {
        out.push({ kind: "quasar-quadrant", quasar: c.quasar, quadrant });
        continue;
      }
    }
    out.push(c);
  }
  return { ...region, clues: out };
}

let mismatches = 0;
let chained = 0;
let total = 0;

for (const profile of [DEFAULT_DIFFICULTY, ...RANKS.map((r) => r.difficulty)]) {
  let localChained = 0;
  let localMismatch = 0;

  for (let i = 0; i < SAMPLES; i++) {
    const region = generateRegion({ difficulty: profile });
    total++;
    const hasChain = region.clues.some((c) => c.kind === "quasar-type");
    if (hasChain) {
      chained++;
      localChained++;
    }

    const asGenerated = assessSolvability(region);
    const asDirect = assessSolvability(flatten(region));

    // Every field of the verdict has to match, not just the headline - the
    // ring-budget figures are what the Survey Log's "nobody could have got
    // this" flag is built on.
    const same =
      asGenerated.withoutScans === asDirect.withoutScans &&
      asGenerated.withBestScans === asDirect.withBestScans;
    if (!same) {
      localMismatch++;
      mismatches++;
      if (mismatches <= 3) {
        console.log(
          `  MISMATCH ${region.id}: generated ${JSON.stringify(asGenerated)} vs direct ${JSON.stringify(asDirect)}`
        );
      }
    }
  }

  const label = `quad=${profile.quadrantClues} indirect=${profile.indirectClues}`;
  console.log(
    `${label.padEnd(24)} ${String(localChained).padStart(4)}/${SAMPLES} regions carried a chain` +
      `   mismatches ${localMismatch}`
  );
}

console.log(
  `\n${total} regions, ${chained} carrying at least one chain, ${mismatches} mismatch(es).`
);
console.log(
  mismatches === 0
    ? "A chain is exactly the direct clue: solvability is identical region by region."
    : "FAILED - a chain is changing solvability, so it is not the neutral lever it claims to be."
);
process.exit(mismatches === 0 ? 0 : 1);
