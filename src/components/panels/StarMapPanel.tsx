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
      {/* No `rounded-tr` any more: the arm now ends in a flat stub that runs
          off this column's right edge, and rounding the corner would close a
          run that is meant to continue. */}
      <div
        className="bg-lcars-panel rounded-tl-[var(--lcars-panel-elbow-outer-r)] overflow-hidden flex-1 min-h-0 flex flex-col"
      >
      {/* The arm, with the title sitting in a gap punched out of it rather
          than printed on a filled bar.

          This is the image-frame construction from `thelcars.com`, measured
          2026-08-11: a long run of the frame colour, a black notch carrying
          the label, then a short detached stub closing the arm. The filled
          full-width shelf this replaced was a legitimate LCARS shape but the
          wrong one for a frame - a solid bar across the top made the panel
          read as a captioned box, and the label competed with the very
          content the frame is meant to be presenting.

          The label is left-aligned in its gap, hugging the run it continues
          out of: the title belongs to the arm, and here the arm hands it
          over directly. */}
      <div className="h-[var(--lcars-shelf-h-panel)] shrink-0 flex items-stretch gap-2">
        {/* One mass with the leg below it - this is the corner. */}
        <div className="w-[calc(var(--lcars-panel-leg-w)+2.5rem)] shrink-0 bg-lcars-amber rounded-tl-[var(--lcars-panel-elbow-outer-r)]" />
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span className="lcars-caps text-sm font-semibold text-lcars-amber truncate">
            Star Map{region ? ` — ${region.name}` : ""}
          </span>
          {onToggleMaximize && (
            /* On the arm rather than beside the dial: it is a control over
               the panel, not over the survey, and the actions row below is
               already File / Withdraw / Reset - none of which this belongs
               next to. */
            <button
              type="button"
              onClick={() => {
                playButtonClick();
                onToggleMaximize();
              }}
              className="ml-auto shrink-0 lcars-caps text-[10px] font-bold tracking-wider rounded-full px-2.5 py-0.5 bg-lcars-amber hover:bg-lcars-orange text-black cursor-pointer transition-colors"
            >
              {maximized ? "Restore" : "Maximise"}
            </button>
          )}
        </div>
        {/* The stub. Flat, because the arm continues off this column's right
            edge rather than terminating here. */}
        <div className="w-6 shrink-0 bg-lcars-amber" />
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
          className="lcars-elbow-notch top-0 left-[var(--lcars-panel-leg-w)] [--lcars-notch-colour:var(--lcars-amber)] [--lcars-notch-bg:var(--lcars-panel)] [--lcars-elbow-inner-r:0.75rem] md:[--lcars-elbow-inner-r:1.25rem]"
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
