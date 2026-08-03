"use client";

import { Region } from "@/lib/puzzle-types";
import { RING_COUNT, SEGMENT_COUNT } from "@/lib/grid";
import { runShape } from "@/lib/lcars-colors";
import { COPY } from "@/lib/copy";
import { LcarsPanel } from "@/components/LcarsShell";
import { LcarsButton } from "@/components/LcarsButton";
import { ClueLog } from "@/components/ClueLog";
import { NoActiveAssignmentPanel } from "@/components/NoActiveAssignmentPanel";

export function BriefingPanel({
  region,
  regions,
  hasAnySurveys,
  onSelectRegion,
  onOpenStationInfo,
}: {
  /** Null when there is no live survey - the placeholder branch below. */
  region: Region | null;
  regions: Region[];
  /**
   * Whether the player has any surveys on record at all, archived
   * included. Only used to pick which empty-state hint to show: without
   * it, a brand-new player is told their region was archived.
   */
  hasAnySurveys: boolean;
  onSelectRegion: (id: string) => void;
  onOpenStationInfo: () => void;
}) {
  if (!region) {
    // Rendered exactly like the Star Manifest/Sweep Scope/Quadrant Survey
    // placeholders: a single title-barred LcarsPanel sized with h-full,
    // directly under <main> - no extra wrapper div and no flex-1 sizing.
    // Wrapping this in the same flex-col container the button-row layout
    // below uses (and sizing it with flex-1 instead of h-full) was enough
    // to shift the logo a few pixels off from the other tabs' placeholders,
    // so this branch deliberately keeps the DOM shape identical to theirs
    // instead of just visually close.
    return (
      <LcarsPanel
        id="briefing-placeholder"
        title="Active Assignment"
        accent="bg-lcars-orange"
        className="h-full"
      >
        <NoActiveAssignmentPanel
          hint={hasAnySurveys ? COPY.briefing.archivedHint : COPY.briefing.noSurveysHint}
          onOpenStationInfo={onOpenStationInfo}
        />
      </LcarsPanel>
    );
  }

  return (
    <div id="briefing-panel" className="flex flex-col gap-4 h-full">
      <LcarsPanel
        id="active-assignment-picker"
        title="Active Assignment"
        accent="bg-lcars-orange"
        className="shrink-0"
      >
        <div className="flex flex-nowrap gap-1 overflow-x-auto">
          {regions.map((r, i) => (
            <LcarsButton
              key={r.id}
              color="orange"
              onClick={() => onSelectRegion(r.id)}
              shape={runShape(i, regions.length)}
              orientation="horizontal"
            >
              {r.name}
            </LcarsButton>
          ))}
        </div>
      </LcarsPanel>

      <LcarsPanel id="region-detail" title={region.name} accent="bg-lcars-violet">
        <p className="text-sm md:text-base text-lcars-ice/90 leading-relaxed">
          {region.briefing}
        </p>
        <div className="flex flex-wrap items-end gap-6 mt-3">
          <div>
            <div className="text-3xl font-bold text-lcars-amber leading-none font-mono">
              {region.quasars.length}
            </div>
            <div className="lcars-caps text-[10px] text-lcars-ice/50 mt-1">Signatures</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-lcars-amber leading-none font-mono">
              {region.clues.length}
            </div>
            <div className="lcars-caps text-[10px] text-lcars-ice/50 mt-1">Logged Bearings</div>
          </div>
          <div className="text-xs text-lcars-ice/40 font-mono">
            {RING_COUNT}&times;{SEGMENT_COUNT} polar field
          </div>
        </div>
      </LcarsPanel>

      <LcarsPanel id="logged-bearings" title="Logged Bearings" accent="bg-lcars-lilac">
        <ClueLog clues={region.clues} />
      </LcarsPanel>
    </div>
  );
}
