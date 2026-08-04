"use client";

import { Region } from "@/lib/puzzle-types";
import { StarMap } from "@/components/starmap/StarMap";
import { playButtonClick } from "@/lib/sound";
import type { TutorialHint } from "@/lib/tutorial";

export function StarMapPanel({
  region,
  onClosed,
  onBoardChange,
  hint,
  maximized = false,
  onToggleMaximize,
}: {
  region: Region | null;
  /** Passed straight through - see StarMap for what they're for. */
  onClosed?: (regionId: string) => void;
  onBoardChange?: (board: {
    regionId: string;
    placements: Record<string, string | undefined>;
    markCount: number;
  }) => void;
  hint?: TutorialHint | null;
  /** Filling `main` instead of sitting in the sidebar. Desktop only. */
  maximized?: boolean;
  /**
   * Omitted where there is nothing to maximise *into*: below `lg` the map
   * is already a full-width panel of its own, so the control would only
   * offer a state the layout is permanently in.
   */
  onToggleMaximize?: () => void;
}) {
  return (
    /* Maximised, the panel takes the full height it was given and passes it
       down, so the dial can be sized against the space that actually exists
       rather than spilling past the fold. Every link in that chain needs
       `min-h-0`, or a flex child refuses to shrink below its content and
       the constraint never reaches the svg. Docked, none of this applies -
       the panel is as tall as its content and the sidebar scrolls. */
    <div
      className={`bg-lcars-panel rounded-t-xl overflow-hidden ${
        maximized ? "h-full flex flex-col min-h-0" : ""
      }`}
    >
      <div className="bg-lcars-amber lcars-caps text-black font-semibold px-4 py-1.5 text-sm flex items-center justify-between gap-3 shrink-0">
        <span className="truncate">Star Map{region ? ` — ${region.name}` : ""}</span>
        {onToggleMaximize && (
          /* On the header rather than beside the dial: it is a control over
             the panel, not over the survey, and the actions row below is
             already File / Withdraw / Reset - none of which this belongs
             next to. */
          <button
            type="button"
            onClick={() => {
              playButtonClick();
              onToggleMaximize();
            }}
            className="shrink-0 lcars-caps text-[10px] font-bold tracking-wider rounded-full px-2.5 py-0.5 bg-black/25 hover:bg-black/45 text-black cursor-pointer transition-colors"
          >
            {maximized ? "Restore" : "Maximise"}
          </button>
        )}
      </div>
      {/* The amber gutter and padding are pure chrome; below `md` they're
          64px of a ~390px screen the map would rather have. */}
      <div className={`flex ${maximized ? "flex-1 min-h-0" : ""}`}>
        <div className="w-6 md:w-10 shrink-0 bg-lcars-amber" />
        <div className={`flex-1 min-w-0 p-3 md:p-4 ${maximized ? "min-h-0" : ""}`}>
          {/* Only the empty-field line lives here. The instructions for a
              live survey depend on whether the region has been closed,
              which is StarMap's business - it holds the survey log
              subscription. */}
          {!region && (
            <p className="text-xs text-lcars-ice/60 leading-relaxed mb-3">
              No active survey &mdash; the field is shown for reference only.
            </p>
          )}
          <StarMap
            key={region?.id ?? "empty"}
            region={region}
            onClosed={onClosed}
            onBoardChange={onBoardChange}
            hint={hint}
            maximized={maximized}
          />
        </div>
      </div>
    </div>
  );
}
