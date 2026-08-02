// Does the solvability recorded at generation agree with the analysis that
// produced the published figures?
//
// assessSolvability is a second implementation of the same question - it
// lives in src/ so the app can call it, while the numbers in
// docs/instrument-analysis.md come from scripts/. Two implementations of
// one definition is exactly the kind of thing that quietly drifts, so this
// checks the rate it reports against the measured one.
//
// Usage: npx tsx scripts/check-solvability-flag.ts [samples]

import { generateRegion } from "../src/lib/generate-region";
import { assessSolvability } from "../src/lib/solvability";

const SAMPLES = Number(process.argv[2] ?? 400);

// From docs/instrument-analysis.md, 2000-3000 samples each.
const EXPECTED_WITHOUT_SCANS = 18.6; // % unsolvable, no scans spent
const EXPECTED_WITH_SCANS = 0.9; // % unsolvable, two scans aimed well
const TOLERANCE = 5; // percentage points; this sample is much smaller

let unsolvableWithout = 0;
let unsolvableWith = 0;
let neededScans = 0;
const started = Date.now();

for (let i = 0; i < SAMPLES; i++) {
  const region = generateRegion();
  const s = assessSolvability(region);
  if (!s.withoutScans) unsolvableWithout++;
  if (!s.withBestScans) unsolvableWith++;
  if (s.withBestScans && !s.withoutScans) neededScans++;

  // A region solvable without scans must be solvable with them - more
  // information cannot make a region less resolvable.
  if (s.withoutScans && !s.withBestScans) {
    console.log("!! IMPOSSIBLE: solvable without scans but not with them");
    process.exit(1);
  }
}

const pct = (n: number) => (n / SAMPLES) * 100;
const withoutPct = pct(unsolvableWithout);
const withPct = pct(unsolvableWith);
const ms = Date.now() - started;

console.log(`${SAMPLES} regions assessed in ${ms}ms (${(ms / SAMPLES).toFixed(1)}ms each).\n`);
console.log(`  Unsolvable without scans: ${withoutPct.toFixed(1)}%  (expected ~${EXPECTED_WITHOUT_SCANS}%)`);
console.log(`  Unsolvable with 2 scans:  ${withPct.toFixed(1)}%  (expected ~${EXPECTED_WITH_SCANS}%)`);
console.log(`  Needed a scan to resolve: ${pct(neededScans).toFixed(1)}%`);

const failures = [
  Math.abs(withoutPct - EXPECTED_WITHOUT_SCANS) > TOLERANCE
    ? `without-scans rate ${withoutPct.toFixed(1)}% is more than ${TOLERANCE}pp from ${EXPECTED_WITHOUT_SCANS}%`
    : null,
  Math.abs(withPct - EXPECTED_WITH_SCANS) > TOLERANCE
    ? `with-scans rate ${withPct.toFixed(1)}% is more than ${TOLERANCE}pp from ${EXPECTED_WITH_SCANS}%`
    : null,
].filter(Boolean);

if (failures.length) {
  console.log("\nFAILED:\n  " + failures.join("\n  "));
  process.exit(1);
}
console.log("\nAgrees with the published figures.");
