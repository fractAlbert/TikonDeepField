"use client";

import { LcarsButton } from "@/components/LcarsButton";

/**
 * Title + Back strip sitting above every phone panel.
 *
 * The other half of the hub-and-spoke trade: with no nav on screen, Back is
 * the only way out of a panel, so it belongs in one fixed predictable place
 * rather than being left to each panel to remember to provide. Doubling as
 * the panel's title also earns its keep - without a nav strip there's
 * otherwise nothing on screen saying where you are.
 *
 * Shaped as a two-part run so it reads as one LCARS block rather than a
 * label next to a button: rounded where it starts, flat at the joint, and -
 * since 2026-08-06 - flat where it ends, because it no longer ends. Back
 * runs off the right edge of the screen, matching the jump bar at the foot
 * of the panel. Only the strip's negative margin changes; Back keeps its
 * width and the title gains the 12px, which is the right way round given
 * the title is the thing that truncates at 390px.
 */
export function MobilePanelBar({
  title,
  onBack,
  id,
}: {
  title: string;
  onBack: () => void;
  id?: string;
}) {
  return (
    // `-mr-3 md:-mr-6` cancels the shell's gutter on this side only, so the
    // flat end lands on the glass rather than 12px short of it. It has to
    // track the shell's own padding, and this bar only exists below `lg`.
    <div id={id} className="flex items-stretch gap-1 shrink-0 -mr-3 md:-mr-6">
      <div className="flex-1 min-w-0 flex items-center bg-lcars-panel rounded-l-full px-4 py-2">
        <span className="lcars-caps text-sm font-semibold text-lcars-amber truncate">{title}</span>
      </div>
      <LcarsButton
        color="ice"
        /* Flipped, not squared off: the cap that used to close the run on
           the right is now on Back's left, and the right edge is flat
           because it carries on off the screen. */
        shape="cap-start"
        orientation="horizontal"
        onClick={onBack}
        className="shrink-0 text-xs"
      >
        Back
      </LcarsButton>
    </div>
  );
}
