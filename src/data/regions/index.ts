import { Region } from "@/lib/puzzle-types";
import { region2 } from "./region-2";

/**
 * The hand-authored regions. **Nothing seeds the roster from this list any
 * more** - the app starts a new player with no active assignment at all,
 * and every region they play is generated (see AppShell).
 *
 * It stays because log entries written before that change carry
 * `origin: "builtin"` and only an id, not a snapshot of the region. Drop
 * this list and `resolveEntryRegion` returns undefined for them, so
 * `LogEntryCard` renders null and the entry silently vanishes from a
 * player's history. That is the one thing removing the default region must
 * not do.
 */
export const regions: Region[] = [region2];

export function getRegion(id: string): Region | undefined {
  return regions.find((r) => r.id === id);
}
