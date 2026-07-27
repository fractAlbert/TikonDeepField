"use client";

import { useSyncExternalStore } from "react";
import { isSoundMuted, setSoundMuted, subscribeSoundMuted } from "@/lib/sound";

export function SoundToggle() {
  const muted = useSyncExternalStore(
    subscribeSoundMuted,
    isSoundMuted,
    () => true
  );

  return (
    <button
      type="button"
      onClick={() => setSoundMuted(!muted)}
      className="lcars-caps text-xs md:text-sm px-4 py-1.5 rounded-full bg-black/15 text-black font-semibold cursor-pointer hover:bg-black/25 transition-colors shrink-0"
    >
      Sound: {muted ? "Off" : "On"}
    </button>
  );
}
