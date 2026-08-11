"use client";

import { useSyncExternalStore } from "react";
import { isSoundMuted, setSoundMuted, subscribeSoundMuted } from "@/lib/sound";

/**
 * The muted flag and its setter, for callers that want to draw the control
 * themselves. The phone hub does: below `lg` this lives in the menu as one
 * of the buttons rather than in the header, so it has to look like its
 * neighbours rather than like a header pill.
 */
export function useSoundMuted(): [boolean, (muted: boolean) => void] {
  const muted = useSyncExternalStore(subscribeSoundMuted, isSoundMuted, () => true);
  return [muted, setSoundMuted];
}

export function soundLabel(muted: boolean): string {
  return `Sound: ${muted ? "Off" : "On"}`;
}

export function SoundToggle({ className = "" }: { className?: string }) {
  const [muted, setMuted] = useSoundMuted();

  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      className={`lcars-caps text-xs md:text-sm px-4 py-1.5 rounded-full bg-black/15 text-black font-semibold cursor-pointer hover:bg-black/25 transition-colors shrink-0 ${className}`}
    >
      {soundLabel(muted)}
    </button>
  );
}
