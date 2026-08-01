"use client";

// The officer's own record: who they are, what rank they hold, and every
// rank change that got them there.
//
// Same external-store shape as `survey-log.ts` (cached snapshot + listener
// set + useSyncExternalStore), for the same reason: it has to survive a
// reload, and React needs a stable reference between real changes.
//
// The dependency runs one way - `survey-log.ts` imports this to report a
// closed region, and nothing here knows the survey log exists. A career is
// a stream of outcomes; where those outcomes came from is not its problem.

import { randomOfficerName, randomServiceNumber } from "./officer-name";
import {
  RELIEVED,
  REVIEW_WINDOW,
  STARTING_RANK,
  SurveyOutcome,
  TOP_RANK,
  reviewVerdict,
  tallyOutcomes,
} from "./ranks";

export type RankChangeReason =
  | "commission"
  | "promotion"
  | "demotion"
  | "relieved"
  | "reinstatement";

export interface RankEvent {
  at: number;
  /** Rank index before, or RELIEVED. -1 on the initial commission is not used. */
  from: number;
  to: number;
  reason: RankChangeReason;
  /** The review window that produced this, so history can show its evidence. */
  confirmed: number;
  retracted: number;
  withdrawn: number;
}

export interface OutcomeRecord {
  at: number;
  outcome: SurveyOutcome;
  regionId: string;
  regionName: string;
}

export interface PlayerProfile {
  name: string;
  serviceNumber: string;
  commissionedAt: number;
  /** Rank index into RANKS, or RELIEVED. */
  rank: number;
  /** Every closed region, oldest first. Append-only. */
  outcomes: OutcomeRecord[];
  /**
   * Index into `outcomes` where the current review window starts. Reset to
   * the end of the stream on every rank change, so a single bad stretch
   * can't demote you twice.
   */
  windowStart: number;
  history: RankEvent[];
}

const STORAGE_KEY = "quasar-isolinear:player";

/**
 * Rendered on the server and on the very first client paint, before
 * localStorage has been read. Frozen and module-level so the reference is
 * stable - useSyncExternalStore compares snapshots by identity and will
 * loop forever on a fresh object each call.
 *
 * The empty name is what tells the UI it is looking at a placeholder; real
 * profiles always have one.
 */
export const PLACEHOLDER_PLAYER: PlayerProfile = Object.freeze({
  name: "",
  serviceNumber: "----",
  commissionedAt: 0,
  rank: STARTING_RANK,
  outcomes: [],
  windowStart: 0,
  history: [],
}) as PlayerProfile;

let cached: PlayerProfile | null = null;
const listeners = new Set<() => void>();

function read(): PlayerProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    if (!parsed.name) return null;
    // Defaulted field by field rather than trusted wholesale: this store
    // will gain fields, and a profile written by an older build must not
    // come back with `outcomes` undefined and crash the review.
    return {
      name: parsed.name,
      serviceNumber: parsed.serviceNumber ?? randomServiceNumber(),
      commissionedAt: parsed.commissionedAt ?? Date.now(),
      rank: typeof parsed.rank === "number" ? parsed.rank : STARTING_RANK,
      outcomes: parsed.outcomes ?? [],
      windowStart: parsed.windowStart ?? 0,
      history: parsed.history ?? [],
    };
  } catch {
    return null;
  }
}

function commit(next: PlayerProfile) {
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked - the in-memory profile still works for the
    // session, which beats throwing out of a filing handler.
  }
  listeners.forEach((fn) => fn());
}

export function subscribePlayer(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Stable reference until the profile actually changes. */
export function getPlayer(): PlayerProfile {
  if (typeof window === "undefined") return PLACEHOLDER_PLAYER;
  if (!cached) cached = read() ?? PLACEHOLDER_PLAYER;
  return cached;
}

export function getServerPlayer(): PlayerProfile {
  return PLACEHOLDER_PLAYER;
}

/** True once a real profile exists - i.e. not the pre-hydration placeholder. */
export function isCommissioned(profile: PlayerProfile): boolean {
  return profile.name !== "";
}

/**
 * Creates the profile if there isn't one. Call from a mount effect, never
 * during render: it generates a random name, so running it on the server
 * would produce a different officer than the client and mismatch hydration.
 */
export function ensurePlayer(): PlayerProfile {
  if (typeof window === "undefined") return PLACEHOLDER_PLAYER;
  const existing = read();
  if (existing) {
    cached = existing;
    return existing;
  }
  const now = Date.now();
  const fresh: PlayerProfile = {
    name: randomOfficerName(),
    serviceNumber: randomServiceNumber(),
    commissionedAt: now,
    rank: STARTING_RANK,
    outcomes: [],
    windowStart: 0,
    history: [
      {
        at: now,
        from: STARTING_RANK,
        to: STARTING_RANK,
        reason: "commission",
        confirmed: 0,
        retracted: 0,
        withdrawn: 0,
      },
    ],
  };
  commit(fresh);
  return fresh;
}

export function renamePlayer(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const current = getPlayer();
  if (!isCommissioned(current)) return;
  commit({ ...current, name: trimmed });
}

/** A fresh random name, for the reroll control next to the name field. */
export function rerollPlayerName(): string {
  const current = getPlayer();
  let next = randomOfficerName();
  // One retry is enough to make "reroll" feel like it did something without
  // risking a loop on a short list.
  if (next === current.name) next = randomOfficerName();
  renamePlayer(next);
  return next;
}

/** The slice of closed regions the current review is judging. */
export function reviewWindow(profile: PlayerProfile): SurveyOutcome[] {
  return profile.outcomes.slice(Math.max(profile.windowStart, profile.outcomes.length - REVIEW_WINDOW))
    .map((o) => o.outcome);
}

/**
 * Records one closed region and runs the review.
 *
 * Returns the rank change if there was one, so the caller can announce it -
 * the Star Map shows a banner on the filing that caused it, which is the
 * only moment it's guaranteed to be looked at.
 *
 * Must be called exactly once per region. `survey-log.ts` guarantees that
 * by only calling it on the transition out of the open state.
 */
export function recordOutcome(
  outcome: SurveyOutcome,
  regionId: string,
  regionName: string
): RankEvent | null {
  if (typeof window === "undefined") return null;
  const current = getPlayer();
  if (!isCommissioned(current)) return null;

  const now = Date.now();
  const outcomes = [...current.outcomes, { at: now, outcome, regionId, regionName }];
  let next: PlayerProfile = { ...current, outcomes };

  // A relieved officer has no rank to move, so nothing is reviewed until
  // they're reinstated. Their filings still land in the record.
  if (current.rank === RELIEVED) {
    commit(next);
    return null;
  }

  const windowOutcomes = reviewWindow(next);
  const verdict = reviewVerdict(windowOutcomes);
  if (verdict !== "promote" && verdict !== "demote") {
    commit(next);
    return null;
  }

  const t = tallyOutcomes(windowOutcomes);
  const to =
    verdict === "promote"
      ? Math.min(current.rank + 1, TOP_RANK)
      : current.rank - 1; // may fall to RELIEVED (-1)

  if (to === current.rank) {
    // Already at the top and the review passed again. Nothing to award, but
    // the window still resets - otherwise a Chief of Survey sits on a
    // permanently-passing window and every later filing re-triggers this.
    commit({ ...next, windowStart: outcomes.length });
    return null;
  }

  const event: RankEvent = {
    at: now,
    from: current.rank,
    to,
    reason: to < current.rank ? (to === RELIEVED ? "relieved" : "demotion") : "promotion",
    confirmed: t.confirmed,
    retracted: t.retracted,
    withdrawn: t.withdrawn,
  };

  next = {
    ...next,
    rank: to,
    windowStart: outcomes.length,
    history: [...next.history, event],
  };
  commit(next);
  return event;
}

/**
 * Back onto the ladder at the bottom rung after being relieved. The record
 * is kept - the history is the point - but the review window starts clean,
 * so the stretch that cost you the post can't immediately cost it again.
 */
export function requestReinstatement(): RankEvent | null {
  const current = getPlayer();
  if (!isCommissioned(current) || current.rank !== RELIEVED) return null;
  const event: RankEvent = {
    at: Date.now(),
    from: RELIEVED,
    to: 0,
    reason: "reinstatement",
    confirmed: 0,
    retracted: 0,
    withdrawn: 0,
  };
  commit({
    ...current,
    rank: 0,
    windowStart: current.outcomes.length,
    history: [...current.history, event],
  });
  return event;
}
