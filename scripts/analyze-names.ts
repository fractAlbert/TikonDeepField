// Measures how much variety the two name generators actually produce.
//
// Written because "it feels repetitive" is a real observation that needs a
// number before anyone changes a word list - the interesting failures here
// are not the size of the lists but the *shape* of the draw, and neither is
// visible by reading the source.
//
// Usage: npx tsx scripts/analyze-names.ts

import { generateRegionName } from "../src/lib/flavor-text";
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

const seen = new Map<string, number>();
for (let i = 0; i < SAMPLES; i++) {
  const name = generateRegionName();
  seen.set(name, (seen.get(name) ?? 0) + 1);
}
console.log(`\n${seen.size} distinct names exist. Every one is "<Adjective> <Noun>".`);

// How long until a player sees a name twice. The birthday problem, but
// measured by drawing until a repeat rather than trusting the formula.
const RUNS = 50_000;
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
  `\nRegions opened before the first repeated name: ${(totalDraws / RUNS).toFixed(1)} on average` +
    `\n(the soonest, in ${RUNS.toLocaleString()} careers, was ${earliest}).`
);

// A word in both lists can pair with itself.
const dupes = [
  ...new Set(
    [...seen.keys()]
      .map((n) => n.split(" "))
      .filter(([a, b]) => a === b)
      .map(([a]) => a)
  ),
];
console.log(
  dupes.length
    ? `\nWords that appear in BOTH lists, so the generator can double them: ${dupes.join(", ")}`
    : "\nNo word appears in both lists."
);

console.log("\nA sample of twelve, to read as a set:\n");
console.log(
  "  " +
    Array.from({ length: 12 }, () => generateRegionName())
      .map((n) => n.padEnd(18))
      .join("")
      .replace(/(.{72})/g, "$1\n  ")
);
