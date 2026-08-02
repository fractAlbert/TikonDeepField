// Exercises the rank state machine head-on: feed sequences of outcomes,
// assert where the ladder ends up.
//
// The review window is the one piece of this feature that is pure logic and
// completely invisible until it fires - a wrong threshold or a window that
// fails to reset would look like nothing at all for eight regions and then
// promote or demote at the wrong moment. Clicking through eight surveys in
// a browser to test one path is not a viable loop; this runs every path in
// a second.
//
// Usage: npx tsx scripts/simulate-career.ts

import {
  DEMOTION_RETRACTED,
  RANKS,
  filingsForRank,
  PROMOTION_CONFIRMED,
  PROMOTION_MAX_RETRACTED,
  RELIEVED,
  REVIEW_WINDOW,
  STARTING_RANK,
  SurveyOutcome,
  rankTitle,
} from "../src/lib/ranks";
import * as player from "../src/lib/player";

// player.ts is a browser store - it early-returns on `typeof window ===
// "undefined"` and persists through localStorage. Stubbing both makes it
// see a browser and take the real write path, instead of the no-op branch
// that would pass every test below vacuously.
//
// The static import above is safe despite the stub being installed after
// it: nothing in player.ts touches `window` at module scope, only inside
// the functions this script calls.
const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
};

let failures = 0;
let checks = 0;

/**
 * Clearing storage is enough to start a fresh career: `ensurePlayer` reads
 * storage rather than the module's cached snapshot, finds nothing, and
 * commits a new profile over the cache. No test-only export needed.
 */
function reset() {
  store.clear();
}

function feed(outcomes: SurveyOutcome[]) {
  outcomes.forEach((o, i) => player.recordOutcome(o, `region-${i}`, `Region ${i}`));
}

function expectRank(label: string, expected: number) {
  checks++;
  const actual = player.getPlayer().rank;
  if (actual === expected) {
    console.log(`  ok   ${label}: ${rankTitle(actual)}`);
  } else {
    failures++;
    console.log(`  FAIL ${label}: expected ${rankTitle(expected)}, got ${rankTitle(actual)}`);
  }
}

function expectHistoryLength(label: string, expected: number) {
  checks++;
  const actual = player.getPlayer().history.length;
  if (actual === expected) console.log(`  ok   ${label}: ${actual} entries`);
  else {
    failures++;
    console.log(`  FAIL ${label}: expected ${expected} entries, got ${actual}`);
  }
}

function scenario(name: string, body: () => void) {
  console.log(`\n${name}`);
  reset();
  player.ensurePlayer();
  body();
}

const C: SurveyOutcome = "confirmed";
const R: SurveyOutcome = "retracted";
const W: SurveyOutcome = "withdrawn";

// ---------------------------------------------------------------------

scenario("A clean run of 8 promotes exactly once", () => {
  feed([C, C, C, C, C, C, C]);
  expectRank("after 7 confirmed (window not full)", STARTING_RANK);
  feed([C]);
  expectRank("after 8 confirmed", STARTING_RANK + 1);
  expectHistoryLength("history", 2); // commission + promotion
});

/**
 * A full window with a given make-up, padded with withdrawals. Built from
 * the thresholds rather than hard-coded, so tuning a constant does not mean
 * hand-editing every scenario below - the boundaries stay the boundaries.
 */
function windowOf(confirmed: number, retracted: number): SurveyOutcome[] {
  const w = [
    ...Array<SurveyOutcome>(confirmed).fill(C),
    ...Array<SurveyOutcome>(retracted).fill(R),
  ];
  while (w.length < REVIEW_WINDOW) w.push(W);
  return w.slice(0, REVIEW_WINDOW);
}

scenario("Exactly the confirmation quota, rest withdrawn, promotes", () => {
  feed(windowOf(PROMOTION_CONFIRMED, 0));
  expectRank(`${PROMOTION_CONFIRMED} confirmed`, STARTING_RANK + 1);
});

scenario("One short of the quota is not enough", () => {
  feed(windowOf(PROMOTION_CONFIRMED - 1, 0));
  expectRank(`${PROMOTION_CONFIRMED - 1} confirmed`, STARTING_RANK);
});

scenario("The quota survives the maximum allowed retractions", () => {
  feed(windowOf(PROMOTION_CONFIRMED, PROMOTION_MAX_RETRACTED));
  expectRank(
    `${PROMOTION_CONFIRMED} confirmed, ${PROMOTION_MAX_RETRACTED} retracted`,
    STARTING_RANK + 1
  );
});

scenario("One retraction over the allowance blocks promotion", () => {
  feed(windowOf(PROMOTION_CONFIRMED, PROMOTION_MAX_RETRACTED + 1));
  expectRank(
    `${PROMOTION_CONFIRMED} confirmed, ${PROMOTION_MAX_RETRACTED + 1} retracted`,
    STARTING_RANK
  );
});

scenario("Demotion beats promotion when a window qualifies for both", () => {
  // Only reachable if the two thresholds can be met at once; skip if the
  // window is too small to hold both.
  if (PROMOTION_CONFIRMED + DEMOTION_RETRACTED <= REVIEW_WINDOW) {
    feed(windowOf(PROMOTION_CONFIRMED, DEMOTION_RETRACTED));
    expectRank("quota met but demotion threshold reached", STARTING_RANK - 1);
  } else {
    // Otherwise just check the demotion threshold on its own.
    feed(windowOf(0, DEMOTION_RETRACTED));
    expectRank(`${DEMOTION_RETRACTED} retracted`, STARTING_RANK - 1);
  }
});

scenario("Withdrawing everything holds rank forever", () => {
  feed(Array<SurveyOutcome>(24).fill(W));
  expectRank("24 withdrawals", STARTING_RANK);
  expectHistoryLength("history", 1); // commission only
});

scenario("The window resets on a rank change, so one bad run is charged once", () => {
  feed([R, R, R, W, W, W, W, W]);
  expectRank("first demotion", STARTING_RANK - 1);
  // Those same three retractions are now outside the window. Without the
  // reset the very next closed region would re-trigger the demotion.
  feed([W]);
  expectRank("one more withdrawal after demotion", STARTING_RANK - 1);
  feed([W, W, W, W, W, W, W]);
  expectRank("window refilled with withdrawals only", STARTING_RANK - 1);
});

scenario("Falling off the bottom, and coming back", () => {
  feed([R, R, R, W, W, W, W, W]); // 2 -> 1
  expectRank("first demotion", 1);
  feed([R, R, R, W, W, W, W, W]); // 1 -> 0
  expectRank("second demotion", 0);
  feed([R, R, R, W, W, W, W, W]); // 0 -> relieved
  expectRank("relieved", RELIEVED);

  // No review runs while off the ladder - a relieved officer has no rank
  // to move, and their filings just accumulate on the record.
  feed([C, C, C, C, C, C, C, C]);
  expectRank("8 confirmed while relieved", RELIEVED);

  player.requestReinstatement();
  expectRank("after reinstatement", 0);
  feed([C, C, C, C, C, C, C, C]);
  expectRank("8 confirmed after reinstatement", 1);
});

scenario("The top of the ladder holds", () => {
  feed([C, C, C, C, C, C, C, C]); // 2 -> 3
  feed([C, C, C, C, C, C, C, C]); // 3 -> 4
  expectRank("two clean runs", 4);
  feed([C, C, C, C, C, C, C, C]); // already top
  expectRank("a third clean run at the top", 4);
  expectHistoryLength("history", 3); // commission + 2 promotions, no third
});

scenario("Renaming does not touch the record", () => {
  feed([C, C, C, C, C, C, C, C]);
  player.renamePlayer("Nobody At All");
  expectRank("rank after rename", STARTING_RANK + 1);
  checks++;
  if (player.getPlayer().name === "Nobody At All") console.log("  ok   name changed");
  else {
    failures++;
    console.log("  FAIL name did not change");
  }
  checks++;
  const before = player.getPlayer().serviceNumber;
  player.rerollPlayerName();
  if (player.getPlayer().serviceNumber === before) console.log("  ok   service number survives a reroll");
  else {
    failures++;
    console.log("  FAIL service number changed on reroll");
  }
});

scenario("Filings shrink as rank rises", () => {
  const ladder = RANKS.map((r) => filingsForRank(r.index));

  checks++;
  if (ladder.every((n, i) => i === 0 || n <= ladder[i - 1]))
    console.log(`  ok   ladder is non-increasing: ${ladder.join(" ")}`);
  else {
    failures++;
    console.log(`  FAIL ladder rises somewhere: ${ladder.join(" ")}`);
  }

  checks++;
  if (ladder[0] > ladder[ladder.length - 1])
    console.log(`  ok   technician beats chief: ${ladder[0]} vs ${ladder[ladder.length - 1]}`);
  else {
    failures++;
    console.log("  FAIL top and bottom of the ladder get the same budget");
  }

  // One filing would delete the cross-check rather than tighten it: the
  // discrepancy count would only ever arrive on the filing that already
  // retracted you.
  checks++;
  if (Math.min(...ladder) >= 2) console.log("  ok   no rank is cut to a single filing");
  else {
    failures++;
    console.log("  FAIL a rank gets one filing, which removes the cross-check");
  }

  checks++;
  if (filingsForRank(RELIEVED) === ladder[0])
    console.log("  ok   a relieved officer files as a technician");
  else {
    failures++;
    console.log("  FAIL relieved rank has no filing budget");
  }
});

console.log(`\n${checks - failures} / ${checks} checks passed.`);
process.exit(failures === 0 ? 0 : 1);
