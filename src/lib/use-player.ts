"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  PlayerProfile,
  ensurePlayer,
  getPlayer,
  getServerPlayer,
  isCommissioned,
  subscribePlayer,
} from "./player";

/**
 * The officer's profile, commissioning one on first run.
 *
 * The commission happens in an effect rather than during render because it
 * generates a random name: the server would pick a different officer than
 * the client and hydration would mismatch. Until that effect runs, every
 * caller gets the frozen placeholder, which is why `commissioned` is
 * returned separately - it's the signal to render a skeleton rather than
 * an officer with no name.
 *
 * Safe to call from several components at once. `ensurePlayer` re-reads
 * storage first and writes synchronously, so the second caller in a commit
 * finds what the first just wrote instead of generating a rival officer.
 */
export function usePlayer(): { player: PlayerProfile; commissioned: boolean } {
  const player = useSyncExternalStore(subscribePlayer, getPlayer, getServerPlayer);

  useEffect(() => {
    ensurePlayer();
  }, []);

  return { player, commissioned: isCommissioned(player) };
}
