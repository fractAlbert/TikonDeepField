"use client";

// Which region was last being surveyed. Just an id - the region data itself
// already survives a reload inside the survey log, which carries a full
// snapshot of every generated region (see survey-log.ts).

const STORAGE_KEY = "quasar-isolinear:active-region";

export function loadActiveRegionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * `null` clears the key rather than storing "null". There is a real state
 * now where nothing is active - a first run, or the moment after the last
 * survey is archived - and writing the string would make the next load
 * hunt for a region called "null" instead of starting empty.
 */
export function saveActiveRegionId(regionId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (regionId === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, regionId);
  } catch {
    // Storage full or blocked. The session still works; only the
    // remembered selection is lost.
  }
}
