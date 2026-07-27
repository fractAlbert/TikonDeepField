"use client";

import { useMemo } from "react";
import { Region } from "@/lib/puzzle-types";
import { buildSectors } from "@/lib/grid";
import { quasarColorHex } from "@/lib/quasar-colors";
import { LcarsPanel } from "@/components/LcarsShell";
import { RelativeDistanceScope, ScopeSignature } from "@/components/sweep/RelativeDistanceScope";

// One fixed lookup, not tied to any region (sectors are the same 40-cell
// field for everyone).
const sectorLookup = new Map(buildSectors().map((s) => [s.id, s]));

export function SweepScopePanel({ region, visible }: { region: Region; visible: boolean }) {
  const signatures: ScopeSignature[] = useMemo(
    () =>
      region.quasars.map((q, i) => {
        const sector = sectorLookup.get(region.solution[q.id].sector)!;
        return {
          id: q.designation,
          label: q.designation,
          color: quasarColorHex(i),
          ring: sector.ring,
          seg: sector.seg,
        };
      }),
    [region]
  );

  return (
    <div className="flex flex-col gap-4">
      <LcarsPanel title={`Sweep Scope — ${region.name}`} accent="bg-lcars-violet">
        <p className="text-sm text-lcars-ice/70 leading-relaxed mb-4">
          Pick a signature as a reference &mdash; a single line sweeps out
          from it every cycle. Others glow as the line approaches, peaking
          as it crosses them. Distance is absolute orthogonal distance
          (ring-steps plus segment-hops) with no direction to it; anything
          farther than the visibility range from the current reference
          doesn&apos;t render at all. Switch reference to reveal a different
          set.
        </p>
        <RelativeDistanceScope signatures={signatures} visible={visible} />
      </LcarsPanel>
    </div>
  );
}
