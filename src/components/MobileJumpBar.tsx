"use client";

import { ButtonColor } from "@/lib/lcars-colors";
import { LcarsButton } from "@/components/LcarsButton";

/**
 * The one-tap hop between an instrument and the Star Map, on a phone.
 *
 * ## Why it exists
 *
 * Solving a region is a loop: read a bearing on the Sweep Scope or the Ring
 * Scan, go put a marker down, come back. On a desktop that costs nothing -
 * the map is a permanent sidebar next to whatever you are reading. On a
 * phone the hub made it three taps each way (Back, Star Map, then Back, then
 * the instrument again), which is the same navigation cost as visiting a
 * page you rarely open, for the thing you do most.
 *
 * So the four survey panels get a Star Map button, and the Star Map gets one
 * back to wherever you came from - the same slot, the same size, on all
 * five, so it stops being a thing you look for.
 *
 * ## Why the bottom, and not the panel bar at the top
 *
 * The obvious home was `MobilePanelBar`, which is already the fixed spot on
 * every phone panel and would have cost no height at all. It does not fit:
 * that bar carries the panel's *title*, which with no nav on screen is the
 * only thing saying where you are, and a third element squeezes it to a
 * truncated stub at 390px. Ergonomics agree with the measurement - this is
 * pressed dozens of times a survey, and the top-right corner is the hardest
 * place on a phone to reach with a thumb.
 *
 * Structurally it is the same move as the panel bar, mirrored: a `shrink-0`
 * sibling of `main` rather than anything inside it. `main` stays the only
 * scroller, so this never scrolls away - the standing rule is that chrome is
 * never something you scroll to reveal.
 *
 * ## Why the colour changes
 *
 * The label is always the destination and the fill is always that
 * destination's own colour, so the bar reads as "one tap puts you here"
 * rather than as a back button that happens to be labelled. Amber leaving an
 * instrument (the Star Map's colour, matching its hub entry and its panel
 * header), the instrument's own colour leaving the map.
 */
export function MobileJumpBar({
  label,
  color,
  onSelect,
  id,
}: {
  label: string;
  color: ButtonColor;
  onSelect: () => void;
  id?: string;
}) {
  return (
    <div id={id} className="flex items-stretch gap-1 shrink-0">
      <LcarsButton
        color={color}
        shape="cap-start"
        orientation="horizontal"
        onClick={onSelect}
        /* Half the bar, which is a deliberately oversized target: the whole
           point is that this is hit repeatedly, mid-puzzle, one-handed. */
        className="flex-1 min-w-0 min-h-11 text-sm"
      >
        {label}
      </LcarsButton>
      {/* Unlabeled filler closing the run against the panel's outer edge -
          the rails' idiom, and the mirror of the title block the panel bar
          opens with, so the two bars frame the content between them. */}
      <div className="flex-1 bg-lcars-panel rounded-r-full" />
    </div>
  );
}
