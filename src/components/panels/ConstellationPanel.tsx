"use client";

import { Region } from "@/lib/puzzle-types";
import { LcarsPanel } from "@/components/LcarsShell";
import { ConstellationView } from "@/components/constellation/ConstellationView";

/**
 * The Constellation: a few signatures drawn as a shape, with no grid, no
 * orientation and no designations - only classifications.
 *
 * Promoted out of the localhost test bench on 2026-08-11 at the user's
 * request, which changed what it is. A shipped instrument is part of what a
 * player can know, so `solvability.ts` now models it - see the leaf check in
 * `countConsistent`. Leaving that out would have made the Survey Log accuse
 * players of missing regions the Constellation settles, which is the one
 * verdict that must never be wrong.
 *
 * How many signatures it shows is fixed per region at generation from the
 * rank that drew it, so a promotion mid-survey cannot change the region under
 * you. More is easier - each extra star is another constraint on the shape.
 */
export function ConstellationPanel({ region }: { region: Region | null }) {
  if (!region) {
    return (
      <div className="flex flex-col gap-4">
        <LcarsPanel title="Constellation" accent="bg-lcars-violet">
          <p className="text-sm text-lcars-ice/60">
            No active survey. Open one and the array will have a field to
            resolve.
          </p>
        </LcarsPanel>
      </div>
    );
  }

  if (!region.constellationStars) {
    return (
      <div className="flex flex-col gap-4">
        <LcarsPanel title="Constellation" accent="bg-lcars-violet">
          <p className="text-sm text-lcars-ice/60">
            This field predates the array and has no plate on file. Regions
            surveyed from now on will.
          </p>
        </LcarsPanel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <LcarsPanel title="Constellation" accent="bg-lcars-violet" size="lg">
        <p className="text-sm text-lcars-ice/70 leading-relaxed mb-4">
          A long-exposure plate of{" "}
          <strong className="text-lcars-violet">{region.constellationStars}</strong>{" "}
          signatures in this field, classified but not named. The plate is
          taken at an arbitrary orientation and scale, so where a star sits on
          it means nothing &mdash; only the shape does, and the
          classifications on it.
        </p>

        <ConstellationView
          region={region}
          count={region.constellationStars}
          className="w-full max-w-md h-auto"
        />

        <p className="text-xs text-lcars-ice/50 leading-relaxed mt-4">
          The field has eight bearings, so the plate is one of eight possible
          turns of the real arrangement. Registering it means working out
          which &mdash; and the distances here are true to each other even
          though the scale is not.
        </p>
      </LcarsPanel>
    </div>
  );
}
