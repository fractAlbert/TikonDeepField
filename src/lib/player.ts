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
//
// **This file is one career, not the save.** Since 2026-08-04 relief is
// terminal (docs/rank-ladder.md, "Career end"), so a profile has an end as
// well as a beginning, and the things that outlive it - tutorial
// completion, the roll of finished careers - live in `station.ts`.

import { randomOfficerName, randomServiceNumber } from "./officer-name";
import { CareerEnding, TutorialState, recordCareer } from "./station";
import {
  RELIEVED,
  REVIEW_WINDOW,
  STARTING_RANK,
  SurveyOutcome,
  TOP_RANK,
  reviewVerdict,
  tallyOutcomes,
} from "./ranks";

// "reinstatement" is gone: it put a relieved officer back on the ladder at
// rank 0, which is exactly what relief becoming terminal removes. Old
// profiles may still carry one in `history`, so the type keeps it - the
// record is the point, and rewriting history to match a rule change would
// be the wrong kind of tidy.
export type RankChangeReason =
  | "commission"
  | "promotion"
  | "demotion"
  | "relieved"
  | "retired"
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
   * **Legacy.** Tutorial state lives on the station record now, because it
   * has to outlive the career (see station.ts). Still read off old profiles
   * so the migration has something to find; never written.
   */
  tutorial?: TutorialState;
  /**
   * Set once, when the career is over. Its presence *is* the game-over
   * condition - there is no separate flag, and no way back.
   *
   * The ended career stays the current profile rather than being cleared on
   * the spot, because the career-end screen has to render something and
   * that something is this record. `beginNewCareer` is what replaces it.
   */
  ended?: { at: number; reason: CareerEnding };
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
      tutorial: parsed.tutorial,
      ended: parsed.ended,
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

/** True while there is a career to play. False once it has ended, either way. */
export function isServing(profile: PlayerProfile): boolean {
  return isCommissioned(profile) && !profile.ended;
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
  // Nothing can close on a career that is over - there is no board left to
  // file from. Guarded anyway, because this is reachable from storage
  // handlers rather than only from a button.
  if (!isServing(current)) return null;

  const now = Date.now();
  const outcomes = [...current.outcomes, { at: now, outcome, regionId, regionName }];
  let next: PlayerProfile = { ...current, outcomes };

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

  // Falling below Survey Technician is the end of the career, not a rung.
  // Committed first so the ending is written against a profile that already
  // holds the demotion - the career-end screen shows both.
  if (to === RELIEVED) endCareer("relieved", next);

  return event;
}

/**
 * Closes the career. Final either way - there is no path back onto the
 * ladder, which is the whole point of relief being terminal.
 *
 * Files the career on the station's service record on the way out, so
 * retiring at Chief of Survey is a thing that stays said. `recordCareer` is
 * idempotent on the commissioning date, so calling this twice cannot put
 * two copies on the roll.
 *
 * `profile` is an override for the one caller that has just committed a
 * newer profile than the cache would hand back.
 */
export function endCareer(reason: CareerEnding, profile?: PlayerProfile): PlayerProfile | null {
  const current = profile ?? getPlayer();
  if (!isServing(current)) return null;

  const now = Date.now();
  const t = tallyOutcomes(current.outcomes.map((o) => o.outcome));

  // Retirement is a rank event too. It is not a rank *change* - you retire
  // at whatever you held - but the history is what the record is made of,
  // and a career that just stops mid-list reads as a bug.
  const history =
    reason === "retired"
      ? [
          ...current.history,
          {
            at: now,
            from: current.rank,
            to: current.rank,
            reason: "retired" as const,
            confirmed: t.confirmed,
            retracted: t.retracted,
            withdrawn: t.withdrawn,
          },
        ]
      : current.history;

  const next: PlayerProfile = { ...current, history, ended: { at: now, reason } };
  commit(next);

  recordCareer({
    name: next.name,
    serviceNumber: next.serviceNumber,
    commissionedAt: next.commissionedAt,
    endedAt: now,
    finalRank: next.rank,
    ending: reason,
    confirmed: t.confirmed,
    retracted: t.retracted,
    withdrawn: t.withdrawn,
  });

  return next;
}

/** The officer's own choice, from the Officer panel. Available at any rank. */
export function retireCareer(): PlayerProfile | null {
  return endCareer("retired");
}

/**
 * Everything a career owns, as storage key prefixes.
 *
 * Matched by prefix rather than listed exactly because two of them are
 * per-region (`starmap:<id>`, `observations:<id>`) and a new one would
 * otherwise be forgotten here and quietly survive into the next career -
 * which is the kind of leak that shows up as a stranger's notes on your
 * first board.
 *
 * Not in the list, deliberately: the station record (it outlives careers,
 * that is its job) and the sound preference (a device setting, not a
 * career's).
 */
const CAREER_OWNED_PREFIXES = [
  "quasar-isolinear:survey-log",
  "quasar-isolinear:active-region",
  "quasar-isolinear:starmap:",
  "quasar-isolinear:observations:",
  "quasar-isolinear:colors",
];

/**
 * Starts over. The finished career is already on the service record, so
 * this only has to clear what belonged to it and commission someone new.
 *
 * **Reloads the page**, and that is deliberate rather than lazy. Half a
 * dozen modules hold cached snapshots of the storage this wipes, and
 * `AppShell` holds the region roster in React state restored once on mount;
 * resetting each of them by hand is five chances to miss one and hand the
 * new officer a stale board. A career change is a deliberate, once-in-a-
 * while act - it can afford a reload, and the loading screen already exists
 * for exactly this kind of moment.
 */
export function beginNewCareer(): void {
  if (typeof window === "undefined") return;
  for (const key of Object.keys(window.localStorage)) {
    if (CAREER_OWNED_PREFIXES.some((p) => key.startsWith(p))) {
      window.localStorage.removeItem(key);
    }
  }
  const now = Date.now();
  commit({
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
  });
  window.location.reload();
}
