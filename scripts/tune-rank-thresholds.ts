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
  solveRate: number;
  discipline: number;
}

const PLAYERS: Player[] = [
  { label: "careless", unsolvable: 0.11, solveRate: 0.55, discipline: 0.3 },
  { label: "average", unsolvable: 0.05, solveRate: 0.75, discipline: 0.6 },
  { label: "careful", unsolvable: 0.01, solveRate: 0.92, discipline: 0.85 },
];

/**
 * How much harder a region gets per rank above the starting one, if rank
 * ever drives generation (backlog item 3). Zero reproduces today, where a
 * Chief of Survey draws exactly the same regions as a technician.
 */
const DIFFICULTY_PER_RANK = 0.06;

function playRegion(p: Player, rank: number, difficultyPerRank: number): SurveyOutcome {
  const step = Math.max(0, rank - STARTING_RANK) * difficultyPerRank;
  const unsolvable = p.unsolvable + step * 0.5;
  const solveRate = p.solveRate - step;
  const solvable = Math.random() >= unsolvable;
  if (solvable && Math.random() < solveRate) return "confirmed";
  return Math.random() < p.discipline ? "withdrawn" : "retracted";
}

/** One career under one threshold set; returns the final rank. */
function runCareer(p: Player, t: Thresholds, difficultyPerRank = 0): number {
  let rank = STARTING_RANK;
  let window: SurveyOutcome[] = [];
  for (let i = 0; i < REGIONS_PER_CAREER; i++) {
    window.push(playRegion(p, rank, difficultyPerRank));
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

function profile(p: Player, t: Thresholds, difficultyPerRank = 0) {
  const ranks: number[] = [];
  for (let i = 0; i < CAREERS; i++) ranks.push(runCareer(p, t, difficultyPerRank));
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

// The table above says the thresholds barely separate competent players -
// everyone able to clear the bar saturates at the top, because the work
// never gets harder. Backlog item 3 (rank drives generation) is the thing
// that would change that, so measure whether it actually does.
console.log(
  `\n\nSame thresholds, but with regions getting harder per rank ` +
    `(backlog item 3, ${DIFFICULTY_PER_RANK} per step):\n`
);
console.log(head);
console.log("-".repeat(head.length));
for (const t of candidates) {
  const label = `${t.promoteConfirmed} of ${t.window} / ${t.demoteRetracted}`;
  const cells = PLAYERS.map((p) => {
    const { mean, top, off } = profile(p, t, DIFFICULTY_PER_RANK);
    return `${mean.toFixed(2)} top${(top * 100).toFixed(0).padStart(3)}% off${(off * 100).toFixed(0).padStart(3)}%`.padStart(22);
  });
  console.log(label.padEnd(22) + cells.join(""));
}
