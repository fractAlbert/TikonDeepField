"use client";

// Persistent play-history store, independent of the in-memory `regions`
// list AppShell keeps - a generated region normally vanishes on reload, so
// a log entry for one carries a full snapshot of the region itself, not
// just its id, or it would have nothing left to point to after a refresh.

import { Region } from "./puzzle-types";
import { SurveyOutcome } from "./ranks";
import { RankEvent, recordOutcome } from "./player";

export type SurveyOrigin = "builtin" | "generated";

/**
 * How many times a region can be filed before the last one is binding.
 *
 * A filing returns a discrepancy count, which is only useful if you get to
 * act on it - but unlimited filings make the count a search tool rather
 * than evidence, and the region can be brute-forced. Three is enough to
 * narrow a near-miss by reasoning and far too few to enumerate: with 6-8
 * signatures over 40 sectors, guessing your way in on three tries is not a
 * strategy. Spend all three without confirming and the region is retracted.
 */
export const FILING_LIMIT = 3;

export interface SurveyLogEntry {
  regionId: string;
  origin: SurveyOrigin;
  /** Only set for generated regions - builtin ones are looked up by id instead. */
  region?: Region;
  firstSurveyedAt: number;
  lastActiveAt: number;
  verifyAttempts: number;
  solved: boolean;
  solvedAt: number | null;
  archived: boolean;
  /**
   * Filings spent. Optional because entries written before the filing
   * budget existed have none - `filingsUsed()` reads it, not this field.
   */
  filings?: number;
  /**
   * Set once and never cleared. Its presence is what "closed" means, and
   * it is the flag that keeps a region from being reported to the career
   * record twice.
   */
  outcome?: SurveyOutcome;
  closedAt?: number;
}

/** What one filing did, for the Star Map to render and announce. */
export interface FilingResult {
  discrepancies: number;
  solved: boolean;
  /** Filings spent including this one. */
  filings: number;
  remaining: number;
  /** Non-null if this filing closed the region. */
  outcome: SurveyOutcome | null;
  /** Non-null if closing it also moved the officer's rank. */
  rankEvent: RankEvent | null;
}

const STORAGE_KEY = "quasar-isolinear:survey-log";
type LogStore = Record<string, SurveyLogEntry>;

export const EMPTY_LOG: SurveyLogEntry[] = [];

let cachedStore: LogStore | null = null;
let cachedList: SurveyLogEntry[] | null = null;
const listeners = new Set<() => void>();

function readRaw(): LogStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LogStore) : {};
  } catch {
    return {};
  }
}

function getStore(): LogStore {
  if (!cachedStore) cachedStore = readRaw();
  return cachedStore;
}

function commit(store: LogStore) {
  cachedStore = store;
  cachedList = null;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  listeners.forEach((fn) => fn());
}

export function subscribeSurveyLog(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Stable reference until the store actually changes - required for useSyncExternalStore. */
export function getSurveyLog(): SurveyLogEntry[] {
  if (typeof window === "undefined") return EMPTY_LOG;
  if (!cachedList) {
    cachedList = Object.values(getStore()).sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  }
  return cachedList;
}

/** Call whenever a region becomes the active survey (selected or freshly generated). */
export function touchSurvey(region: Region, origin: SurveyOrigin) {
  if (typeof window === "undefined") return;
  const store = { ...getStore() };
  const now = Date.now();
  const existing = store[region.id];
  store[region.id] = existing
    ? { ...existing, lastActiveAt: now }
    : {
        regionId: region.id,
        origin,
        region: origin === "generated" ? region : undefined,
        firstSurveyedAt: now,
        lastActiveAt: now,
        verifyAttempts: 0,
        solved: false,
        solvedAt: null,
        archived: false,
        filings: 0,
      };
  commit(store);
}

export function filingsUsed(entry: SurveyLogEntry): number {
  return entry.filings ?? entry.verifyAttempts;
}

export function filingsRemaining(entry: SurveyLogEntry): number {
  return Math.max(0, FILING_LIMIT - filingsUsed(entry));
}

/**
 * A region's outcome, tolerating entries written before outcomes existed.
 * Those only recorded a `solved` boolean, so a legacy solved region reads
 * as confirmed and a legacy unsolved one reads as still open - which is
 * what it was.
 */
export function entryOutcome(entry: SurveyLogEntry): SurveyOutcome | null {
  if (entry.outcome) return entry.outcome;
  return entry.solved ? "confirmed" : null;
}

export function isClosed(entry: SurveyLogEntry): boolean {
  return entryOutcome(entry) !== null;
}

export function getEntry(regionId: string): SurveyLogEntry | undefined {
  if (typeof window === "undefined") return undefined;
  return getStore()[regionId];
}

/**
 * Writes the outcome and reports it to the career record - the single
 * place either of those happens.
 *
 * The `isClosed` guard is what makes "exactly once per region" structural
 * rather than a thing every caller has to remember: a second close is a
 * no-op, so a double-click, a re-render or a restored save can't inflate
 * the review window.
 */
function closeEntry(
  store: LogStore,
  entry: SurveyLogEntry,
  region: Region,
  outcome: SurveyOutcome,
  now: number
): { entry: SurveyLogEntry; rankEvent: RankEvent | null } {
  if (isClosed(entry)) return { entry, rankEvent: null };
  const closed: SurveyLogEntry = {
    ...entry,
    outcome,
    closedAt: now,
    solved: outcome === "confirmed" ? true : entry.solved,
    solvedAt: outcome === "confirmed" ? entry.solvedAt ?? now : entry.solvedAt,
  };
  store[region.id] = closed;
  return { entry: closed, rankEvent: recordOutcome(outcome, region.id, region.name) };
}

/**
 * Call whenever a classification is filed from the Star Map. Spends one
 * filing, and closes the region if this filing either got it right or was
 * the last one available.
 */
export function recordFiling(region: Region, discrepancies: number): FilingResult | null {
  if (typeof window === "undefined") return null;
  const store = { ...getStore() };
  const existing = store[region.id];
  if (!existing || isClosed(existing)) return null;

  const now = Date.now();
  const filings = filingsUsed(existing) + 1;
  const solved = discrepancies === 0;

  const spent: SurveyLogEntry = {
    ...existing,
    lastActiveAt: now,
    verifyAttempts: existing.verifyAttempts + 1,
    filings,
  };
  store[region.id] = spent;

  let outcome: SurveyOutcome | null = null;
  let rankEvent: RankEvent | null = null;
  if (solved) outcome = "confirmed";
  else if (filings >= FILING_LIMIT) outcome = "retracted";

  if (outcome) ({ rankEvent } = closeEntry(store, spent, region, outcome, now));

  commit(store);
  return { discrepancies, solved, filings, remaining: FILING_LIMIT - filings, outcome, rankEvent };
}

/**
 * Release a region unresolved. Neutral against rank by design - see
 * docs/win-conditions.md - and irreversible, which is what makes it a
 * judgment call rather than a free reset.
 */
export function withdrawSurvey(region: Region): RankEvent | null {
  if (typeof window === "undefined") return null;
  const store = { ...getStore() };
  const existing = store[region.id];
  if (!existing || isClosed(existing)) return null;
  const { rankEvent } = closeEntry(store, existing, region, "withdrawn", Date.now());
  commit(store);
  return rankEvent;
}

export function isSolved(regionId: string): boolean {
  if (typeof window === "undefined") return false;
  return getStore()[regionId]?.solved ?? false;
}

export function setArchived(regionId: string, archived: boolean) {
  if (typeof window === "undefined") return;
  const store = { ...getStore() };
  const existing = store[regionId];
  if (!existing) return;
  store[regionId] = { ...existing, archived };
  commit(store);
}

/** Recovers the actual puzzle data for a log entry - from the builtin list by id, or from the entry's own snapshot for a generated region. */
export function resolveEntryRegion(entry: SurveyLogEntry, builtInRegions: Region[]): Region | undefined {
  if (entry.origin === "builtin") return builtInRegions.find((r) => r.id === entry.regionId);
  return entry.region;
}
