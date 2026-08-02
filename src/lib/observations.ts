"use client";

// What the player has actually seen, per region - as distinct from what is
// true, which lives in the region's solution and must never leak.
//
// Two things are recorded. Which signatures have been used as a Sweep Scope
// reference, because every distance from that reference was on screen when
// it was; and whatever the player types about a signature.
//
// Only the *reference* is stored, not the readings. The readings are
// re-derived from the region when displayed, which is legitimate because
// the player saw them - and it means a stored observation can never
// disagree with the field it describes.

const KEY_PREFIX = "quasar-isolinear:observations:";

export interface RegionObservations {
  /** Quasar ids used as a Sweep Scope reference at least once. */
  references: string[];
  /** Quasar id -> the player's own note. */
  notes: Record<string, string>;
}

const EMPTY: RegionObservations = Object.freeze({
  references: Object.freeze([]) as unknown as string[],
  notes: Object.freeze({}) as Record<string, string>,
});

const cache = new Map<string, RegionObservations>();
const listeners = new Set<() => void>();

function keyFor(regionId: string) {
  return KEY_PREFIX + regionId;
}

function read(regionId: string): RegionObservations {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(keyFor(regionId));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<RegionObservations>;
    return { references: parsed.references ?? [], notes: parsed.notes ?? {} };
  } catch {
    return EMPTY;
  }
}

function commit(regionId: string, next: RegionObservations) {
  cache.set(regionId, next);
  try {
    window.localStorage.setItem(keyFor(regionId), JSON.stringify(next));
  } catch {
    // Storage full or blocked - the session keeps working from cache.
  }
  listeners.forEach((fn) => fn());
}

export function subscribeObservations(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Stable reference until this region's observations actually change. */
export function getObservations(regionId: string): RegionObservations {
  if (typeof window === "undefined") return EMPTY;
  let entry = cache.get(regionId);
  if (!entry) {
    entry = read(regionId);
    cache.set(regionId, entry);
  }
  return entry;
}

export function getServerObservations(): RegionObservations {
  return EMPTY;
}

/**
 * Note that this signature has been used as a Sweep Scope reference, which
 * means its distance to every other in-range signature was on screen.
 */
export function recordReference(regionId: string, quasarId: string) {
  if (typeof window === "undefined") return;
  const current = getObservations(regionId);
  if (current.references.includes(quasarId)) return;
  commit(regionId, { ...current, references: [...current.references, quasarId] });
}

export function setNote(regionId: string, quasarId: string, note: string) {
  if (typeof window === "undefined") return;
  const current = getObservations(regionId);
  const trimmed = note.trim();
  if ((current.notes[quasarId] ?? "") === trimmed) return;
  const notes = { ...current.notes };
  if (trimmed) notes[quasarId] = trimmed;
  else delete notes[quasarId];
  commit(regionId, { ...current, notes });
}

/**
 * Wipes a region's observations. Deliberately *not* called by the Star
 * Map's Reset: resetting the board clears your decisions, and a reading is
 * not a decision - you still saw it, and the Sweep Scope would hand it
 * straight back. This exists for deleting a region outright, which backlog
 * item 13 will need.
 */
export function clearObservations(regionId: string) {
  if (typeof window === "undefined") return;
  cache.delete(regionId);
  try {
    window.localStorage.removeItem(keyFor(regionId));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}
