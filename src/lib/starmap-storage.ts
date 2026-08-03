// Shared localStorage format for a region's Star Map progress, so the Log
// panel can read placement progress without duplicating StarMap's own
// parsing logic.

export type Placements = Record<string, string | undefined>; // quasarId -> sectorId

export interface StarMapSave {
  placements: Placements;
  ruledOut: Record<string, string[]>;
  /**
   * quasarId -> sectorIds marked "?" - a candidate the player wants to
   * come back to, the opposite of a rule-out rather than a weaker one.
   *
   * Optional because saves written before this existed have no such key,
   * and a reader that demanded one would drop every board in progress.
   */
  maybe?: Record<string, string[]>;
}

export function starMapStorageKey(regionId: string): string {
  return `quasar-isolinear:starmap:${regionId}`;
}

export function loadStarMapSave(regionId: string): StarMapSave | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(starMapStorageKey(regionId));
    return raw ? (JSON.parse(raw) as StarMapSave) : null;
  } catch {
    return null;
  }
}
