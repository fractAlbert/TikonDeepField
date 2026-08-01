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

import { RELIEVED, STARTING_RANK, SurveyOutcome, rankTitle } from "../src/lib/ranks";
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

scenario("5 confirmed and 3 withdrawn still promotes", () => {
  feed([C, W, C, W, C, W, C, C]);
  expectRank("5 confirmed, 3 withdrawn", STARTING_RANK + 1);
});

scenario("4 confirmed is not enough", () => {
  feed([C, W, C, W, C, W, C, W]);
  expectRank("4 confirmed, 4 withdrawn", STARTING_RANK);
});

scenario("One retraction still allows promotion, two does not", () => {
  feed([C, C, C, C, C, R, W, W]);
  expectRank("5 confirmed, 1 retracted", STARTING_RANK + 1);
});

scenario("Two retractions block promotion", () => {
  feed([C, C, C, C, C, R, R, W]);
  expectRank("5 confirmed, 2 retracted", STARTING_RANK);
});

scenario("3 retractions demote", () => {
  feed([R, C, R, C, R, C, C, C]);
  expectRank("5 confirmed but 3 retracted - demotion wins", STARTING_RANK - 1);
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

console.log(`\n${checks - failures} / ${checks} checks passed.`);
process.exit(failures === 0 ? 0 : 1);
