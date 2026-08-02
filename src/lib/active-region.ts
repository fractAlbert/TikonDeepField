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

export function saveActiveRegionId(regionId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, regionId);
  } catch {
    // Storage full or blocked. The session still works; only the
    // remembered selection is lost.
  }
}
