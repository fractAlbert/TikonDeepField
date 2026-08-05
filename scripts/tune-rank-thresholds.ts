// Where do the rank thresholds put players of different skill?
//
// The shipped numbers were calibrated when ~19% of regions could not be
// solved at all, so "5 of 8 confirmed" sat comfortably under an ~81%
// ceiling. The Ring Scan moved that ceiling to ~99% for careful play, which
// makes the same threshold much easier to clear - so promotion may now be
// automatic and the ladder may have stopped meaning anything.
//
// Rather than guess a replacement, simulate careers and look at where each
// kind of player ends up. The review logic here mirrors ranks.ts but takes
// the thresholds as parameters; `assertMatchesShipped` below checks the
// mirror still agrees with the real implementation, so this cannot drift.
//
// Usage: npx tsx scripts/tune-rank-thresholds.ts [careers]

import {
  DEMOTION_RETRACTED,
  PROMOTION_CONFIRMED,
  PROMOTION_MAX_RETRACTED,
  RELIEVED,
  REVIEW_WINDOW,
  STARTING_RANK,
  SurveyOutcome,
  TOP_RANK,
  rankTitle,
  reviewVerdict,
} from "../src/lib/ranks";

const CAREERS = Number(process.argv[2] ?? 4000);
const REGIONS_PER_CAREER = 60;

interface Thresholds {
  window: number;
  promoteConfirmed: number;
  promoteMaxRetracted: number;
  demoteRetracted: number;
}

const SHIPPED: Thresholds = {
  window: REVIEW_WINDOW,
  promoteConfirmed: PROMOTION_CONFIRMED,
  promoteMaxRetracted: PROMOTION_MAX_RETRACTED,
  demoteRetracted: DEMOTION_RETRACTED,
};

function verdict(w: SurveyOutcome[], t: Thresholds): "promote" | "demote" | "hold" | "pending" {
  if (w.length < t.window) return "pending";
  const recent = w.slice(-t.window);
  const confirmed = recent.filter((o) => o === "confirmed").length;
  const retracted = recent.filter((o) => o === "retracted").length;
  if (retracted >= t.demoteRetracted) return "demote";
  if (confirmed >= t.promoteConfirmed && retracted <= t.promoteMaxRetracted) return "promote";
  return "hold";
}

/** The mirror above must agree with the real thing, or this measures fiction. */
function assertMatchesShipped() {
  const kinds: SurveyOutcome[] = ["confirmed", "retracted", "withdrawn"];
  for (let i = 0; i < 20000; i++) {
    const w: SurveyOutcome[] = Array.from(
      { length: 1 + Math.floor(Math.random() * (REVIEW_WINDOW + 2)) },
      () => kinds[Math.floor(Math.random() * 3)]
    );
    if (verdict(w, SHIPPED) !== reviewVerdict(w)) {
      throw new Error(`mirror disagrees with ranks.ts on ${w.join(",")}`);
    }
  }
}

/**
 * A player, as three numbers.
 *
 * `unsolvable` is measured, not invented (docs/instrument-analysis.md): a
 * player who aims their two ring scans well meets ~1% impossible regions,
 * one who aims blind meets ~11%. The other two are behavioural assumptions
 * and are the soft part of this - they set how often a solvable region is
 * actually cracked, and whether an uncracked one is withdrawn or filed
 * wrong anyway.
 */
interface Player {
  label: string;
  unsolvable: number;
  /**
   * Chance of getting the whole board right on *one* filing attempt, given
   * the region is solvable. The chance of confirming a region is then
   * 1-(1-accuracy)^filings, which is what makes the filing budget a lever:
   * fewer attempts means fewer chances to correct a near-miss.
   *
   * Chosen so that at the current flat budget of 3 these reproduce the
   * solve rates the earlier version of this script assumed - 0.55, 0.75
   * and 0.92 - so the two are comparable.
   */
  accuracy: number;
  discipline: number;
}

const PLAYERS: Player[] = [
  { label: "careless", unsolvable: 0.11, accuracy: 0.234, discipline: 0.3 },
  { label: "average", unsolvable: 0.05, accuracy: 0.37, discipline: 0.6 },
  { label: "careful", unsolvable: 0.01, accuracy: 0.57, discipline: 0.85 },
];

/**
 * Filings allowed at each rank, index 0 = Survey Technician. A flat 3 is
 * today. Anything descending is the proposal: a senior officer gets fewer
 * chances to correct a mistake than a junior one.
 */
type FilingLadder = number[];
const FLAT: FilingLadder = [3, 3, 3, 3, 3];
const LADDERS: { label: string; filings: FilingLadder }[] = [
  { label: "flat 3 (today)", filings: FLAT },
  { label: "4 4 3 2 2", filings: [4, 4, 3, 2, 2] },
  { label: "4 3 3 2 1", filings: [4, 3, 3, 2, 1] },
  { label: "3 3 2 2 1", filings: [3, 3, 2, 2, 1] },
];

/**
 * The measured difficulty of the fields each rank draws, from
 * `scripts/measure-difficulty-levers.ts` and specified in
 * `docs/region-difficulty.md`. Index 0 = Survey Technician.
 *
 * `needsScan` is the share of regions that stall without a well-aimed ring
 * scan. `stuck` is the mean number of signatures ordinary elimination
 * cannot reach at all - the closest thing to "how many times did this
 * region make me stop and think", and the number that separates the rungs
 * most cleanly.
 */
const NEEDS_SCAN = [0.096, 0.136, 0.181, 0.247, 0.295];
const STUCK = [0.53, 0.75, 1.3, 2.03, 3.18];

/**
 * The same ladder with the bottom two rungs less generous - Technician on
 * three quadrant clues instead of four, Assistant on two instead of three.
 * Also measured. Exists because the shipped profiles turn out to make
 * relief unreachable, and this is the candidate fix.
 */
const NEEDS_SCAN_ALT = [0.1, 0.13, 0.181, 0.247, 0.295];
const STUCK_ALT = [0.58, 1.15, 1.3, 2.03, 3.18];

/** The floor even careful play cannot get under (docs/instrument-analysis.md). */
const UNSOLVABLE_FLOOR = 0.01;

const atRank = (table: number[], rank: number) =>
  table[Math.max(0, Math.min(table.length - 1, rank))];

/**
 * Translates a player profile, which is calibrated against today's
 * generator, onto a rank that draws different fields.
 *
 * Both rescalings are anchored at `STARTING_RANK`, because rank 2's
 * difficulty profile *is* today's generator - so a gradient of "none"
 * reproduces the existing tables exactly and the two are comparable.
 *
 *  - **Unsolvable-for-this-player** is their scan-aiming miss rate applied
 *    to however many regions actually need a scan. A careful player misses
 *    none of them, which is why their rate sits on the floor.
 *  - **Accuracy** decays per genuinely-hard signature. If a board carries
 *    `stuck` signatures that plain elimination cannot reach, and this
 *    player gets a whole board right `accuracy` of the time at rank 2, then
 *    their per-hard-signature success is the `stuck`-th root of that.
 */
function difficultyAdjusted(p: Player, rank: number, alt = false) {
  const scan = alt ? NEEDS_SCAN_ALT : NEEDS_SCAN;
  const stuck = alt ? STUCK_ALT : STUCK;
  const missRate = (p.unsolvable - UNSOLVABLE_FLOOR) / scan[STARTING_RANK];
  const unsolvable = UNSOLVABLE_FLOOR + atRank(scan, rank) * Math.max(0, missRate);
  const perHard = Math.pow(p.accuracy, 1 / stuck[STARTING_RANK]);
  const accuracy = Math.pow(perHard, atRank(stuck, rank));
  return { unsolvable, accuracy };
}

function playRegion(
  p: Player,
  rank: number,
  difficultyPerRank: number,
  filings: FilingLadder,
  measured: false | "shipped" | "alt" = false
): SurveyOutcome {
  const step = Math.max(0, rank - STARTING_RANK) * difficultyPerRank;
  const adjusted = measured ? difficultyAdjusted(p, rank, measured === "alt") : null;
  const unsolvable = adjusted ? adjusted.unsolvable : p.unsolvable + step * 0.5;
  const accuracy = adjusted
    ? Math.max(0.02, adjusted.accuracy)
    : Math.max(0.02, p.accuracy - step);
  const attempts = filings[Math.max(0, Math.min(filings.length - 1, rank))];
  const solveRate = 1 - Math.pow(1 - accuracy, attempts);
  const solvable = Math.random() >= unsolvable;
  if (solvable && Math.random() < solveRate) return "confirmed";
  return Math.random() < p.discipline ? "withdrawn" : "retracted";
}

/** One career under one threshold set; returns the final rank. */
function runCareer(
  p: Player,
  t: Thresholds,
  difficultyPerRank = 0,
  filings: FilingLadder = FLAT,
  measured: false | "shipped" | "alt" = false
): number {
  let rank = STARTING_RANK;
  let window: SurveyOutcome[] = [];
  for (let i = 0; i < REGIONS_PER_CAREER; i++) {
    window.push(playRegion(p, rank, difficultyPerRank, filings, measured));
    if (rank === RELIEVED) continue;
    const v = verdict(window, t);
    if (v === "promote" || v === "demote") {
      const next = v === "promote" ? Math.min(rank + 1, TOP_RANK) : rank - 1;
      // The window resets on any rank change - including the no-op at the
      // top of the ladder, same as player.ts.
      window = [];
      rank = next;
    }
  }
  return rank;
}

function profile(
  p: Player,
  t: Thresholds,
  difficultyPerRank = 0,
  filings: FilingLadder = FLAT,
  measured: false | "shipped" | "alt" = false
) {
  const ranks: number[] = [];
  for (let i = 0; i < CAREERS; i++)
    ranks.push(runCareer(p, t, difficultyPerRank, filings, measured));
  const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
  const top = ranks.filter((r) => r === TOP_RANK).length / ranks.length;
  const off = ranks.filter((r) => r === RELIEVED).length / ranks.length;
  return { mean, top, off };
}

// ---------------------------------------------------------------------

assertMatchesShipped();
console.log(`Mirror agrees with ranks.ts.\n`);
console.log(
  `${CAREERS} careers x ${REGIONS_PER_CAREER} regions each. ` +
    `"top" = reached ${rankTitle(TOP_RANK)}, "off" = relieved of duty.\n`
);

const candidates: Thresholds[] = [];
for (const promoteConfirmed of [5, 6, 7]) {
  for (const demoteRetracted of [3, 4]) {
    candidates.push({ ...SHIPPED, promoteConfirmed, demoteRetracted });
  }
}

const head = "confirmed/retracted".padEnd(22) + PLAYERS.map((p) => p.label.padStart(22)).join("");
console.log(head);
console.log("-".repeat(head.length));

for (const t of candidates) {
  const isShipped =
    t.promoteConfirmed === SHIPPED.promoteConfirmed &&
    t.demoteRetracted === SHIPPED.demoteRetracted;
  const label = `${t.promoteConfirmed} of ${t.window} / ${t.demoteRetracted}${isShipped ? "  (shipped)" : ""}`;
  const cells = PLAYERS.map((p) => {
    const { mean, top, off } = profile(p, t);
    return `${mean.toFixed(2)} top${(top * 100).toFixed(0).padStart(3)}% off${(off * 100).toFixed(0).padStart(3)}%`.padStart(22);
  });
  console.log(label.padEnd(22) + cells.join(""));
}

console.log(
  `\nRank scale: ${RELIEVED} relieved, 0 ${rankTitle(0)} .. ${TOP_RANK} ${rankTitle(TOP_RANK)}, ` +
    `starting at ${STARTING_RANK} ${rankTitle(STARTING_RANK)}.`
);

// The tables above say the thresholds barely separate competent players -
// everyone able to clear the bar saturates at the top, because nothing
// about the work changes as you rise. Scaling the *filing budget* with rank
// is the cheapest way to change that: a senior officer gets fewer chances
// to correct a near-miss, so the same accuracy converts to fewer
// confirmations. Does that create an equilibrium at the top, or just a
// slower climb?
console.log(`

Filings per rank, at the shipped thresholds:
`);
console.log(head);
console.log("-".repeat(head.length));
for (const ladder of LADDERS) {
  const cells = PLAYERS.map((p) => {
    const { mean, top, off } = profile(p, SHIPPED, 0, ladder.filings);
    return `${mean.toFixed(2)} top${(top * 100).toFixed(0).padStart(3)}% off${(off * 100).toFixed(0).padStart(3)}%`.padStart(22);
  });
  console.log(ladder.label.padEnd(22) + cells.join(""));
}

// ---------------------------------------------------------------------
// The acceptance test for backlog item 1.
//
// Everything above holds difficulty constant across the ladder, which is
// what the game did until 2026-08-05. These two rows are the same shipped
// thresholds and the same shipped filing ladder, run against the *measured*
// per-rank difficulty profiles in docs/region-difficulty.md.
//
// The question is narrow: does a careful player still saturate at Chief of
// Survey, or does the top of the ladder finally hold?
console.log(`

Region difficulty by rank, at the shipped thresholds and filing ladder:
`);
console.log(head);
console.log("-".repeat(head.length));
const SHIPPED_FILINGS: FilingLadder = [4, 4, 3, 2, 2];
for (const [label, measured] of [
  ["flat (before)", false],
  ["measured profiles", "shipped"],
  ["softer bottom rungs", "alt"],
] as [string, false | "shipped" | "alt"][]) {
  const cells = PLAYERS.map((p) => {
    const { mean, top, off } = profile(p, SHIPPED, 0, SHIPPED_FILINGS, measured);
    return `${mean.toFixed(2)} top${(top * 100).toFixed(0).padStart(3)}% off${(off * 100)
      .toFixed(0)
      .padStart(3)}%`.padStart(22);
  });
  console.log(label.padEnd(22) + cells.join(""));
}
