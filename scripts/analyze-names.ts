// Measures how much variety the two name generators actually produce.
//
// Written because "it feels repetitive" is a real observation that needs a
// number before anyone changes a word list - the interesting failures here
// are not the size of the lists but the *shape* of the draw, and neither is
// visible by reading the source.
//
// Usage: npx tsx scripts/analyze-names.ts

import { FieldCharacter, generateRegionName } from "../src/lib/region-name";
import { generateQuasarNames } from "../src/lib/name-generator";

const SAMPLES = 200_000;

// Must match name-generator.ts. Kept as (prefix, size) pairs rather than
// imported, because the module exposes only the finished strings and the
// question here is about the space behind them.
const GENERATORS: [string, number][] = [
  ["3C", 990], // 10..999
  ["4C", 8900], // 1..89 . 00..99
  ["PKS", 2260], // 100..2359
  ["PG", 1360], // 1000..2359
  ["CTA", 190], // 10..199
  ["OJ", 900], // 100..999
  ["HE", 2260], // 100..2359
  ["Ton", 990], // 10..999
  ["Mrk", 999], // 1..999
  ["APM", 9000], // 1000..9999
  ["RX J", 1360], // 1000..2359
  ["SDSS", 9000], // 1000..9999
  ["Q", 9000], // 1000..9999
];

const prefixOf = (name: string) => name.replace(/[\d.]+$/, "").trim();

console.log("=".repeat(64));
console.log("SIGNATURE DESIGNATIONS");
console.log("=".repeat(64));

const totalSpace = GENERATORS.reduce((n, [, size]) => n + size, 0);
console.log(`\n${GENERATORS.length} prefixes, ${totalSpace.toLocaleString()} distinct designations.\n`);
for (const [prefix, size] of GENERATORS) {
  const share = ((size / totalSpace) * 100).toFixed(1);
  const drawn = ((1 / GENERATORS.length) * 100).toFixed(1);
  console.log(
    `  ${prefix.padEnd(5)} ${String(size).padStart(5)} names` +
      `  ${share.padStart(5)}% of the space  but drawn ${drawn}% of the time`
  );
}
console.log(
  "\nThe prefix is picked uniformly, not by how many names sit behind it," +
    "\nso CTA (190 names) turns up as often as APM (9,000)."
);

// The thing you actually see: how many *different* catalog prefixes show up
// on one board. Six to eight signatures per region.
console.log("\nPrefix variety within one region (measured, not derived):\n");
for (const count of [6, 7, 8]) {
  let distinctTotal = 0;
  let anyRepeat = 0;
  let worst = 0;
  const RUNS = 20_000;
  for (let i = 0; i < RUNS; i++) {
    const names = generateQuasarNames(count);
    const prefixes = names.map(prefixOf);
    const distinct = new Set(prefixes).size;
    distinctTotal += distinct;
    if (distinct < count) anyRepeat++;
    const busiest = Math.max(
      ...[...new Set(prefixes)].map((p) => prefixes.filter((q) => q === p).length)
    );
    worst = Math.max(worst, busiest);
  }
  console.log(
    `  ${count} signatures:  ${(distinctTotal / RUNS).toFixed(2)} distinct prefixes on average` +
      `  ·  ${((anyRepeat / RUNS) * 100).toFixed(1)}% of regions repeat at least one` +
      `  ·  worst seen ${worst} of the same`
  );
}

console.log("\n" + "=".repeat(64));
console.log("REGION NAMES");
console.log("=".repeat(64));

const shape = (n: string) => {
  if (n.includes("'s ")) return "charter";
  if (/ (I{2,3}|IV|V|VI{0,3}|IX)$/.test(n)) return "numbered";
  if (n.includes("-")) return "compound";
  return "plain";
};

const seen = new Map<string, number>();
const byShape = new Map<string, number>();
for (let i = 0; i < SAMPLES; i++) {
  const name = generateRegionName();
  seen.set(name, (seen.get(name) ?? 0) + 1);
  const s = shape(name);
  byShape.set(s, (byShape.get(s) ?? 0) + 1);
}
console.log(`\n${seen.size.toLocaleString()} distinct names seen in ${SAMPLES.toLocaleString()} draws.\n`);
for (const [s, n] of [...byShape].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${s.padEnd(10)} ${((n / SAMPLES) * 100).toFixed(1).padStart(5)}%`);
}

// How long until a player sees a name twice, with no de-duplication. The
// live game also refuses repeats outright (station.ts), so this is the
// floor the grammar provides on its own.
const RUNS = 20_000;
let totalDraws = 0;
let earliest = Infinity;
for (let r = 0; r < RUNS; r++) {
  const drawn = new Set<string>();
  let draws = 0;
  for (;;) {
    draws++;
    const name = generateRegionName();
    if (drawn.has(name)) break;
    drawn.add(name);
  }
  totalDraws += draws;
  earliest = Math.min(earliest, draws);
}
console.log(
  `\nRegions before a repeat, from the grammar alone: ${(totalDraws / RUNS).toFixed(1)} on average` +
    `\n(soonest of ${RUNS.toLocaleString()} runs: ${earliest}). The save refuses repeats on top of this.`
);

// A word in two pools can pair with itself.
const dupes = [
  ...new Set(
    [...seen.keys()]
      .map((n) => n.split(" "))
      .filter((parts) => parts.length === 2 && parts[0] === parts[1])
      .map((parts) => parts[0])
  ),
];
console.log(
  dupes.length
    ? `\nWords that can double: ${dupes.join(", ")}`
    : "\nNo name can repeat a word."
);

// Does the field actually lean the name? Two extreme fields, same generator.
const OUTER_TIGHT: FieldCharacter = { meanRing: 3.9, spread: 2.4, types: ["Ancient Relic"] };
const INNER_WIDE: FieldCharacter = { meanRing: 1.1, spread: 5.6, types: ["Pulsar-Class"] };
const sampleNouns = (f: FieldCharacter) => {
  const counts = new Map<string, number>();
  for (let i = 0; i < 40_000; i++) {
    const parts = generateRegionName(f).replace(/^[^ ]+'s /, "").split(" ");
    const noun = parts[1] ?? parts[0];
    counts.set(noun, (counts.get(noun) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 5);
};
console.log("\nThe field leans the name. Top nouns for two opposite fields:\n");
console.log(
  "  outer + tight (Ancient Relic): " +
    sampleNouns(OUTER_TIGHT).map(([n, c]) => `${n} ${((c / 40000) * 100).toFixed(1)}%`).join("  ")
);
console.log(
  "  inner + wide  (Pulsar-Class):  " +
    sampleNouns(INNER_WIDE).map(([n, c]) => `${n} ${((c / 40000) * 100).toFixed(1)}%`).join("  ")
);

console.log("\nThree of each grammar, to read as a set:\n");
const examples = new Map<string, string[]>();
for (let i = 0; examples.size < 4 || [...examples.values()].some((v) => v.length < 3); i++) {
  if (i > 100_000) break;
  const name = generateRegionName(i % 2 ? OUTER_TIGHT : INNER_WIDE);
  const s = shape(name);
  const bucket = examples.get(s) ?? [];
  if (bucket.length < 3 && !bucket.includes(name)) bucket.push(name);
  examples.set(s, bucket);
}
for (const s of ["plain", "charter", "numbered", "compound"]) {
  console.log(`  ${s.padEnd(10)} ${(examples.get(s) ?? []).map((n) => n.padEnd(24)).join("")}`);
}

// The name the whole charter grammar exists for.
let tries = 0;
const TIGHT: FieldCharacter = { meanRing: 2.2, spread: 2.8, types: [] };
while (tries < 200_000 && generateRegionName(TIGHT) !== "Kemble's Cascade") tries++;
console.log(
  tries < 200_000
    ? `\n"Kemble's Cascade" is reachable (found after ${tries.toLocaleString()} draws on a tight field).`
    : "\nWARNING: Kemble's Cascade is not reachable."
);
