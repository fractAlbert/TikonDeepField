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
    /* `min-h-full` always, not only when maximised. The leg is the frame's
       left edge and has to reach the bottom of the column: sized to its
       content it stopped wherever the content happened to end, which with no
       active survey is about half way down and reads as a bug. `min-` rather
       than `h-` so a tall board still grows the panel instead of spilling
       out of it. */
    <div className="flex flex-col min-h-full">
      {/* The body is clipped so the top-left sweep actually cuts the amber
          shelf inside it; the bottom bar lives outside that clip, because it
          has to run past this column's right edge and a clip would eat it. */}
      <div
        className="bg-lcars-panel rounded-tr-xl rounded-tl-[var(--lcars-panel-elbow-outer-r)] overflow-hidden flex-1 min-h-0 flex flex-col"
      >
      {/* The title starts *past* the leg, not over it. The shelf still spans
          the full width - it is one mass with the leg - but the label
          belongs to the horizontal arm, and a label sitting on top of the
          corner reads as text floating on the frame rather than as the
          arm's own content. Same as the shell's header, where the title
          begins after the elbow rather than above it. */}
      <div className="bg-lcars-amber lcars-caps text-black font-semibold h-[var(--lcars-shelf-h-panel)] pl-[calc(var(--lcars-panel-leg-w)+1rem)] pr-4 text-sm flex items-center justify-between gap-3 shrink-0">
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
      <div className="relative flex flex-1 min-h-0">
        <div className="w-[var(--lcars-panel-leg-w)] shrink-0 bg-lcars-amber" />
        {/* The same concave corner the shell's elbow has, at panel scale.
            This header wraps: the amber runs across the top and then down
            the side, so the junction between them is a real corner and was
            being drawn as a right angle.

            Three things differ from the shell's. It is amber, not orange.
            It curves into `bg-lcars-panel` rather than into the page, since
            what sits beside the leg here is the panel's own fill - getting
            that wrong paints a black bite out of the content. And the
            radius is smaller because the leg is: 12px against a 40px leg is
            about the proportion 20px strikes against the shell's 160. */}
        <div
          aria-hidden
          className="lcars-elbow-notch top-0 left-[var(--lcars-panel-leg-w)] [--lcars-notch-colour:var(--lcars-amber)] [--lcars-notch-bg:var(--lcars-panel)] [--lcars-elbow-inner-r:0.5rem] md:[--lcars-elbow-inner-r:0.75rem]"
        />
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
    </div>
  );
}
