"use client";

// Persistent play-history store, independent of the in-memory `regions`
// list AppShell keeps - a generated region normally vanishes on reload, so
// a log entry for one carries a full snapshot of the region itself, not
// just its id, or it would have nothing left to point to after a refresh.

import { Region } from "./puzzle-types";

export type SurveyOrigin = "builtin" | "generated";

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
      };
  commit(store);
}

/** Call whenever Verify is pressed in the Star Map. */
export function recordVerify(regionId: string, allCorrect: boolean) {
  if (typeof window === "undefined") return;
  const store = { ...getStore() };
  const existing = store[regionId];
  if (!existing) return;
  const now = Date.now();
  store[regionId] = {
    ...existing,
    lastActiveAt: now,
    verifyAttempts: existing.verifyAttempts + 1,
    solved: existing.solved || allCorrect,
    solvedAt: existing.solved ? existing.solvedAt : allCorrect ? now : existing.solvedAt,
  };
  commit(store);
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
