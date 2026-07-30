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
 * Shaped as a two-part run (flat inner joint, rounded outer caps) so it
 * reads as one LCARS block rather than a label next to a button.
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
    <div id={id} className="flex items-stretch gap-1 shrink-0">
      <div className="flex-1 min-w-0 flex items-center bg-lcars-panel rounded-l-full px-4 py-2">
        <span className="lcars-caps text-sm font-semibold text-lcars-amber truncate">{title}</span>
      </div>
      <LcarsButton
        color="ice"
        shape="cap-end"
        orientation="horizontal"
        onClick={onBack}
        className="shrink-0 text-xs"
      >
        Back
      </LcarsButton>
    </div>
  );
}
