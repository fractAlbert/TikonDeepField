"use client";

import { Region } from "@/lib/puzzle-types";
import { RING_COUNT, SEGMENT_COUNT } from "@/lib/grid";
import { runShape } from "@/lib/lcars-colors";
import { LcarsPanel } from "@/components/LcarsShell";
import { LcarsButton } from "@/components/LcarsButton";
import { ClueLog } from "@/components/ClueLog";
import { NoActiveAssignmentPanel } from "@/components/NoActiveAssignmentPanel";

export function BriefingPanel({
  region,
  regions,
  noActiveAssignment,
  onSelectRegion,
  onOpenStationInfo,
}: {
  region: Region;
  regions: Region[];
  noActiveAssignment: boolean;
  onSelectRegion: (id: string) => void;
  onOpenStationInfo: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 h-full">
      <LcarsPanel title="Active Assignment" accent="bg-lcars-orange" className="shrink-0">
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

      {noActiveAssignment ? (
        <LcarsPanel accent="bg-lcars-violet" className="flex-1 min-h-0">
          <NoActiveAssignmentPanel
            hint="This region was archived. Pick one above, or use Survey New Region in the right-hand rail, to continue."
            onOpenStationInfo={onOpenStationInfo}
          />
        </LcarsPanel>
      ) : (
        <>
          <LcarsPanel title={region.name} accent="bg-lcars-violet">
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

          <LcarsPanel title="Logged Bearings" accent="bg-lcars-lilac">
            <ClueLog clues={region.clues} />
          </LcarsPanel>
        </>
      )}
    </div>
  );
}
