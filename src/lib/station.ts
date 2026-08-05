"use client";

// What the station remembers across careers.
//
// A career used to *be* the save: one officer profile, and everything else
// hung off it. Once relief became terminal (docs/rank-ladder.md, "Career
// end") that stopped working, because two things have to outlive the
// officer who happened to be on duty:
//
//  1. **Whether the tutorial has been done.** It lived on `PlayerProfile`,
//     so a second career would arrive with it undefined and the
//     walk-through would fire again at exactly the moment it is least
//     wanted - the player has just finished a career, they do not need
//     teaching how to place a signature.
//  2. **The roll of past careers.** Without it, retiring is a delete
//     button. With it, retiring at Chief of Survey is a thing that stays
//     said.
//
// Same external-store shape as `player.ts` and `survey-log.ts` (cached
// snapshot + listener set + useSyncExternalStore), for the same reason.
//
// **This module must not import `player.ts`** - player imports it, for
// `TutorialState` and to file a finished career. The one place that would
// have needed to go the other way is the migration below, which reads the
// player's raw blob out of storage instead.

const STORAGE_KEY = "quasar-isolinear:station";
const LEGACY_PLAYER_KEY = "quasar-isolinear:player";

/**
 * How far through the first-run walk-through the player has got.
 *
 * The furthest step is stored rather than a boolean so it can resume
 * mid-way, and `done` is separate from `step` because finishing and
 * skipping both end it but only one of them reached the last step.
 */
export interface TutorialState {
  /** Furthest step index reached. */
  step: number;
  /** Finished, or skipped. Either way it stops offering itself. */
  done: boolean;
}

/** How a career ended. Both are final; there is no way back onto the ladder. */
export type CareerEnding = "retired" | "relieved";

/** A finished career, as it appears on the service record. */
export interface PastCareer {
  name: string;
  serviceNumber: string;
  commissionedAt: number;
  endedAt: number;
  /** Rank held at the close. `RELIEVED` (-1) for a career that ended badly. */
  finalRank: number;
  ending: CareerEnding;
  confirmed: number;
  retracted: number;
  withdrawn: number;
}

export interface StationRecord {
  tutorial?: TutorialState;
  /** Oldest first. Append-only. */
  careers: PastCareer[];
  /**
   * Every region name this save has ever used, so no two are alike.
   *
   * Here rather than on the career because the station is what did the
   * charting: a field your first officer surveyed does not get rediscovered
   * and renamed by your second. It also means the list survives the wipe
   * that starting a new career performs, which is the point.
   *
   * Names only, never regions - this is a "has this been used" set, and the
   * survey log is where regions actually live.
   */
  regionNames?: string[];
}

/** Stable reference for the pre-hydration render - see `player.ts`. */
export const EMPTY_STATION: StationRecord = Object.freeze({
  careers: [] as PastCareer[],
}) as StationRecord;

let cached: StationRecord | null = null;
const listeners = new Set<() => void>();

function read(): StationRecord {
  if (typeof window === "undefined") return EMPTY_STATION;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StationRecord>;
      return {
        tutorial: parsed.tutorial,
        careers: parsed.careers ?? [],
        regionNames: parsed.regionNames,
      };
    }
  } catch {
    // fall through to the migration
  }
  return migrateFromPlayer();
}

/**
 * First read on a save that predates this module.
 *
 * The only thing worth rescuing is tutorial completion, and it matters:
 * without it, every existing player gets the walk-through offered again the
 * next time their board happens to be empty. Read straight from the raw
 * blob rather than through `player.ts`, which imports this module.
 *
 * Not written back here. A read should not have a side effect, and the
 * first real change commits it anyway.
 */
function migrateFromPlayer(): StationRecord {
  try {
    const raw = window.localStorage.getItem(LEGACY_PLAYER_KEY);
    if (!raw) return EMPTY_STATION;
    const parsed = JSON.parse(raw) as { tutorial?: TutorialState };
    if (!parsed.tutorial) return EMPTY_STATION;
    return { tutorial: parsed.tutorial, careers: [] };
  } catch {
    return EMPTY_STATION;
  }
}

function commit(next: StationRecord) {
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked - the in-memory record still works for the
    // session, same call as player.ts makes.
  }
  listeners.forEach((fn) => fn());
}

export function subscribeStation(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getStation(): StationRecord {
  if (typeof window === "undefined") return EMPTY_STATION;
  if (!cached) cached = read();
  return cached;
}

export function getServerStation(): StationRecord {
  return EMPTY_STATION;
}

/**
 * The tutorial's state, defaulted for anyone whose save predates it.
 *
 * The fallback keys off whether they have surveys, not off rank or age of
 * save: someone mid-campaign is treated as **done**, so the walk-through
 * cannot ambush them the next time a board happens to be empty. Someone
 * with an empty roster is offered it regardless of rank - which does mean a
 * senior officer who archived everything gets the welcome, and that is the
 * right call, because the alternative on that screen is the bare "no
 * surveys on record" placeholder. It is one click to decline.
 *
 * A *second* career never hits the fallback: the record says done, and it
 * says so from outside the career that finished.
 */
export function tutorialState(hasAnySurveys: boolean): TutorialState {
  return getStation().tutorial ?? { step: 0, done: hasAnySurveys };
}

/** Records progress through the walk-through. Never moves backwards. */
export function setTutorialStep(step: number) {
  const current = getStation();
  const existing = current.tutorial ?? { step: 0, done: false };
  if (existing.step >= step && !existing.done) return;
  commit({ ...current, tutorial: { step: Math.max(existing.step, step), done: false } });
}

/** Finished it, or skipped it. Both stop it offering itself again. */
export function endTutorial(step: number) {
  commit({ ...getStation(), tutorial: { step, done: true } });
}

/** Replay from the top, from the Officer panel. */
export function restartTutorial() {
  commit({ ...getStation(), tutorial: { step: 0, done: false } });
}

/**
 * Files a finished career on the service record.
 *
 * Idempotent on `commissionedAt`, which is the one field a career cannot
 * change: ending a career already-ended must not put a second copy on the
 * roll, and `endCareer` is reachable from both a review verdict and a
 * button.
 */
/** Has this save charted a region by this name before? */
export function isRegionNameUsed(name: string): boolean {
  return getStation().regionNames?.includes(name) ?? false;
}

/**
 * Marks a region name as charted.
 *
 * Called for every region that joins a roster, including the tutorial's
 * fixed one - `Ember Verge` is a real name on a real map, and a generated
 * region turning up with it later would read as the bug it looks like.
 */
export function claimRegionName(name: string) {
  const current = getStation();
  const used = current.regionNames ?? [];
  if (used.includes(name)) return;
  commit({ ...current, regionNames: [...used, name] });
}

export function recordCareer(career: PastCareer) {
  const current = getStation();
  if (current.careers.some((c) => c.commissionedAt === career.commissionedAt)) return;
  commit({ ...current, careers: [...current.careers, career] });
}
