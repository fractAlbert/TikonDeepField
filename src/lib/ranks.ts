// The rank ladder and the catalog integrity review that moves you along it.
//
// Pure logic, no storage and no React - `player.ts` owns the persisted
// profile and calls in here to decide what a new outcome does to a rank.
// Keeping the two apart means the thresholds below can be re-tuned (they
// will need playtesting) without touching anything that writes to disk.
//
// See docs/win-conditions.md for why the ladder is short, why it starts in
// the middle, and why withdrawal has to stay neutral.

import { ButtonColor } from "./lcars-colors";

/**
 * How a region ended. `withdrawn` is deliberately neutral: roughly one
 * region in five is provably unsolvable (docs/win-conditions.md), and a
 * player cannot tell those from ones they merely failed to crack, so
 * penalising a withdrawal would punish people for the generator's output.
 * Neutral rather than *good*, though - withdraw from everything and you
 * hold your rank forever without ever advancing.
 */
export type SurveyOutcome = "confirmed" | "retracted" | "withdrawn";

export interface Rank {
  /** Position on the ladder, 0 = lowest. Matches the array index. */
  index: number;
  title: string;
  /** Three-letter form, for places too tight for the full title. */
  short: string;
  /**
   * One word that reads on its own, for the ladder strip - the three-letter
   * codes are compact but opaque, and "Survey"/"Science" (the first word of
   * two different titles) don't distinguish anything.
   */
  rung: string;
  color: ButtonColor;
  hex: string;
  /** What the station thinks of you at this rank. */
  blurb: string;
  /** What actually changes about the work. */
  duty: string;
  /**
   * Filings allowed on a region at this rank. Descending on purpose: a
   * senior officer gets fewer chances to correct a mistake than a junior
   * one, so the same care converts to fewer confirmations the higher you
   * go. See FILINGS_BY_RANK below for why the numbers are these.
   */
  filings: number;
  /**
   * Whether a filing circles the signatures it got right. Training wheels:
   * on for everyone except the top of the ladder, where you file blind.
   */
  filingMarks: boolean;
}

export const RANKS: Rank[] = [
  {
    index: 0,
    title: "Survey Technician",
    short: "SVT",
    rung: "Technician",
    color: "ice",
    hex: "#cce6ff",
    blurb:
      "Instrument operator. You run the passes and hand the readings to someone else to sign off on.",
    duty: "Draws the station's smallest, most heavily briefed regions - the ones nobody is worried about getting wrong.",
    filings: 4,
    filingMarks: true,
  },
  {
    index: 1,
    title: "Assistant Science Officer",
    short: "ASO",
    rung: "Assistant",
    color: "lilac",
    hex: "#cc99cc",
    blurb:
      "Trusted to classify, not yet trusted to be the only one who did. Your filings are reviewed on the way out.",
    duty: "Regions still run small, with the full briefing allocation.",
    filings: 4,
    filingMarks: true,
  },
  {
    index: 2,
    title: "Science Officer",
    short: "SCO",
    rung: "Officer",
    color: "amber",
    hex: "#ffcc66",
    blurb:
      "The post the station is actually built around. Your signature is the last one a catalog entry gets before it goes out to every ship in the region.",
    duty: "Standard survey load. The rank you were commissioned at.",
    filings: 3,
    filingMarks: true,
  },
  {
    index: 3,
    title: "Senior Science Officer",
    short: "SSO",
    rung: "Senior",
    color: "orange",
    hex: "#ff9900",
    blurb:
      "You get the regions that came back ambiguous the first time. Nobody double-checks you any more.",
    duty: "Draws larger, thinner-briefed regions - more signatures to place, less handed to you.",
    filings: 2,
    filingMarks: true,
  },
  {
    index: 4,
    title: "Chief of Survey",
    short: "CHS",
    rung: "Chief",
    color: "teal",
    hex: "#66ccbb",
    blurb:
      "You set what the station works on. The catalog's accuracy is your name on it, region by region.",
    duty: "Draws the fields nobody else has resolved. Full instrument allocation, minimum briefing.",
    filings: 2,
    filingMarks: false,
  },
];

/**
 * Commissioned in the middle of the ladder, so there is somewhere to fall
 * to that isn't the end of the game.
 */
export const STARTING_RANK = 2;

/** Below Survey Technician. The only true loss state, and it is recoverable. */
export const RELIEVED = -1;

/**
 * The station reviews your record periodically rather than reacting to
 * each filing - one bad region should sting without being punishing, a run
 * of them should cost you the post.
 */
export const REVIEW_WINDOW = 8;
/**
 * Raised from 5 to 6 on 2026-08-01, when the Ring Scan shipped.
 *
 * 5 was chosen against an ~81% ceiling - roughly one region in five could
 * not be solved by anyone - which made it about 77% of what was actually
 * achievable. Two metered ring scans took that ceiling to ~99% for careful
 * play (docs/instrument-analysis.md), so the same 77% of achievable is now
 * ~6.1 of 8.
 *
 * `scripts/tune-rank-thresholds.ts` simulates careers against this logic.
 * Be warned that it also shows the thresholds are a *weak* lever: every
 * player who can clear the bar at all eventually does, because attempts are
 * unlimited and the window resets on promotion. What decides the top of the
 * ladder is whether the work gets harder with rank, not this number.
 */
export const PROMOTION_CONFIRMED = 6;
export const PROMOTION_MAX_RETRACTED = 1;
/**
 * Left at 3 deliberately. Raising it to 4 takes a careless player's chance
 * of being relieved from ~77% to ~41%, which sounds closer to the "rare"
 * the design asks for - but the player it spares is one who never
 * withdraws, files a wrong classification instead, and does it repeatedly.
 * Being relieved is the game teaching that lesson, so it should land.
 */
export const DEMOTION_RETRACTED = 3;

export const TOP_RANK = RANKS.length - 1;

/**
 * Filings per rank, lowest first: 4, 4, 3, 2, 2.
 *
 * This is the lever the rank ladder was missing. Simulated over 4000
 * careers (`scripts/tune-rank-thresholds.ts`), a flat budget of 3 let an
 * average player reach Chief of Survey 84% of the time - barely different
 * from a careful one at 100% - because nothing about the work changed as
 * you rose. Scaling the budget separates them (53% against 100%) and is
 * *more* forgiving at the bottom, taking a careless player's chance of
 * being relieved from 82% to 62%. The two lowest ranks get four because
 * they are the ranks you fall to, and the design wants demotion to be a
 * recovery path rather than a spiral.
 *
 * Not 1 at the top, tempting as it sounds. A single filing removes the
 * cross-check entirely - you would learn the discrepancy count only after
 * being retracted by it - which deletes a mechanic rather than tightening
 * one. Two keeps it: one probe, one correction.
 */
export function filingsForRank(rank: number): number {
  // A relieved officer files as a technician would; they are on their way
  // back to that rung anyway.
  return rankAt(rank)?.filings ?? RANKS[0].filings;
}

/**
 * Does a filing at this rank say *which* signatures were right, or only how
 * many were wrong?
 *
 * On below the top rank. This is the oracle the 2026-07-30 filing rework
 * removed, reintroduced deliberately and bounded three ways: filings are
 * budgeted now, the marks come from a frozen snapshot so they cannot be
 * walked (see StarMap.tsx), and a Chief of Survey does not get them at all.
 *
 * It is also more self-limiting than it looks. A board you have not
 * reasoned about circles almost nothing - 8 signatures across 8 of 40 cells
 * is about 0.2 expected hits - so filing early to harvest marks costs a
 * filing and buys noise. They only pay once the work is mostly done.
 */
export function showsFilingMarks(rank: number): boolean {
  return rankAt(rank)?.filingMarks ?? true;
}

export function rankAt(index: number): Rank | null {
  return RANKS[index] ?? null;
}

export function rankTitle(index: number): string {
  return rankAt(index)?.title ?? "Relieved of Survey Duty";
}

export function rankHex(index: number): string {
  // Red is reserved for alert states elsewhere (see lcars-colors.ts), which
  // is exactly what being relieved is.
  return rankAt(index)?.hex ?? "#cc6666";
}

export interface ReviewTally {
  confirmed: number;
  retracted: number;
  withdrawn: number;
  total: number;
}

export function tallyOutcomes(outcomes: SurveyOutcome[]): ReviewTally {
  const tally: ReviewTally = { confirmed: 0, retracted: 0, withdrawn: 0, total: outcomes.length };
  for (const o of outcomes) tally[o]++;
  return tally;
}

export type ReviewVerdict = "promote" | "demote" | "hold" | "pending";

/**
 * The verdict on one window of closed regions.
 *
 * `pending` means the window isn't full yet, which is not the same as
 * `hold` - a review that hasn't happened can still go either way, and the
 * profile panel says so rather than showing a premature "no change".
 *
 * Note the demotion test runs first. A window can technically satisfy both
 * (5 confirmed and 3 retracted needs 8, so it can't - but the thresholds
 * are meant to be tunable, and if someone widens the window later the
 * safe reading of a record that bad is the pessimistic one).
 */
export function reviewVerdict(windowOutcomes: SurveyOutcome[]): ReviewVerdict {
  if (windowOutcomes.length < REVIEW_WINDOW) return "pending";
  // Only ever the most recent N, even if handed a longer run - a rank
  // change resets the window, so this is belt-and-braces rather than the
  // normal path.
  const t = tallyOutcomes(windowOutcomes.slice(-REVIEW_WINDOW));
  if (t.retracted >= DEMOTION_RETRACTED) return "demote";
  if (t.confirmed >= PROMOTION_CONFIRMED && t.retracted <= PROMOTION_MAX_RETRACTED)
    return "promote";
  return "hold";
}

/**
 * Plain-language statement of what the current window still needs. Shown on
 * the profile so the review isn't a black box - the player should be able
 * to see a demotion coming.
 */
export function reviewOutlook(windowOutcomes: SurveyOutcome[]): string {
  const t = tallyOutcomes(windowOutcomes);
  const remaining = REVIEW_WINDOW - t.total;

  if (remaining <= 0) {
    const verdict = reviewVerdict(windowOutcomes);
    if (verdict === "promote") return "Review passed - promotion pending.";
    if (verdict === "demote") return "Review failed - demotion pending.";
    return "Record reviewed. Rank held.";
  }

  const needed = PROMOTION_CONFIRMED - t.confirmed;
  const doomed = t.retracted >= DEMOTION_RETRACTED;
  if (doomed) return `Demotion threshold already met. ${remaining} to close before review.`;

  const parts: string[] = [];
  parts.push(
    needed <= 0
      ? "Confirmation quota met."
      : needed > remaining
      ? "Promotion out of reach this review."
      : `${needed} more confirmation${needed === 1 ? "" : "s"} needed for promotion.`
  );
  parts.push(
    `${DEMOTION_RETRACTED - t.retracted} more retraction${
      DEMOTION_RETRACTED - t.retracted === 1 ? "" : "s"
    } would trigger demotion.`
  );
  return parts.join(" ");
}
