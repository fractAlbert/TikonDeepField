"use client";

import { useSyncExternalStore } from "react";
import {
  getQuasarColors,
  getServerQuasarColors,
  resolveQuasarColor,
  subscribeQuasarColors,
} from "./quasar-colors";

/**
 * Returns the colour lookup for one region, re-rendering when the player
 * changes one.
 *
 * Every component that draws a signature uses this rather than
 * `quasarColorHex` directly, so a recolour lands on the Star Map, the Sweep
 * Scope, the Manifest, the Log and the Ring Scan at once.
 */
export function useQuasarColor(regionId: string): (quasarId: string, index: number) => string {
  const overrides = useSyncExternalStore(
    subscribeQuasarColors,
    getQuasarColors,
    getServerQuasarColors
  );
  return (quasarId, index) => resolveQuasarColor(overrides, regionId, quasarId, index);
}
