"use client";

// Persistent play-history store, independent of the in-memory `regions`
// list AppShell keeps - a generated region normally vanishes on reload, so
// a log entry for one carries a full snapshot of the region itself, not
// just its id, or it would have nothing left to point to after a refresh.

import { Region } from "./puzzle-types";
import { SurveyOutcome, filingsForRank } from "./ranks";
import { RankEvent, getPlayer, recordOutcome } from "./player";

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
export const DEFAULT_FILING_LIMIT = 3;

/**
 * Filings allowed on a region right now, which depends on the officer's
 * rank - see `filingsForRank`. A senior officer gets fewer chances to
 * correct a mistake; a junior one is more easily forgiven.
 *
 * Read at the moment it is needed rather than stored on the region. Rank
 * only changes when a region *closes*, so it cannot move underneath the
 * region you are filing on. It can differ between two surveys left open
 * across a promotion, which is correct: the budget is the station's
 * current expectation of you, not a property of the field.
 */
export function currentFilingLimit(): number {
  if (typeof window === "undefined") return DEFAULT_FILING_LIMIT;
  return filingsForRank(getPlayer().rank);
}

/**
 * Targeted ring scans per region. Aim one at a signature and it returns
 * that signature's ring - nothing else, and nothing about anyone else.
 *
 * Two, because that is where the numbers land (docs/instrument-analysis.md).
 * Aimed well, two scans take the share of regions that cannot be solved at
 * all from ~25% to ~1%; aimed carelessly, the same two only reach ~11%.
 * That ten-point gap is the whole point of metering them rather than
 * publishing a ring census: a census reads the same for everyone, while
 * this makes the loss rate depend on whether the player understands which
 * signature they are actually stuck on. One scan leaves a good player
 * losing 1 region in 24 to something unwinnable; three starts washing the
 * skill signal out.
 */
export const RING_SCAN_LIMIT = 2;

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
  /**
   * Quasar ids whose ring has been scanned, in the order they were spent.
   * Persisted rather than held in the panel so a reload cannot refund
   * them - a budget you can reset by pressing F5 is not a budget.
   */
  ringScans?: string[];
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
  return Math.max(0, currentFilingLimit() - filingsUsed(entry));
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

export function ringScansUsed(entry: SurveyLogEntry): string[] {
  return entry.ringScans ?? [];
}

export function ringScansRemaining(entry: SurveyLogEntry): number {
  return Math.max(0, RING_SCAN_LIMIT - ringScansUsed(entry).length);
}

/**
 * Spends one scan on `quasarId`, or no-ops if it has already been scanned.
 *
 * Re-reading a result you already paid for is deliberately free: the cost
 * is the decision about where to aim, not the act of looking. Returns the
 * full list of scanned ids so the caller can render without re-reading.
 */
export function recordRingScan(regionId: string, quasarId: string): string[] {
  if (typeof window === "undefined") return [];
  const store = { ...getStore() };
  const existing = store[regionId];
  if (!existing) return [];
  const used = ringScansUsed(existing);
  // A closed region has nothing left to scan for, and an exhausted budget
  // is exhausted. Both are guarded here rather than only in the UI, so no
  // caller can spend a scan that shouldn't exist.
  if (used.includes(quasarId)) return used;
  if (isClosed(existing) || used.length >= RING_SCAN_LIMIT) return used;
  const next = [...used, quasarId];
  store[regionId] = { ...existing, ringScans: next, lastActiveAt: Date.now() };
  commit(store);
  return next;
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
  else if (filings >= currentFilingLimit()) outcome = "retracted";

  if (outcome) ({ rankEvent } = closeEntry(store, spent, region, outcome, now));

  commit(store);
  return {
    discrepancies,
    solved,
    filings,
    remaining: Math.max(0, currentFilingLimit() - filings),
    outcome,
    rankEvent,
  };
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
