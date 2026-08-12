"use client";

import { useMemo } from "react";
import { Region } from "@/lib/puzzle-types";
import { buildSectors } from "@/lib/grid";
import { useQuasarColor } from "@/lib/use-quasar-colors";
import { PANEL_LABELS } from "@/lib/copy";
import { recordReference } from "@/lib/observations";
import { LcarsPanel } from "@/components/LcarsShell";
import { RelativeDistanceScope, ScopeSignature } from "@/components/sweep/RelativeDistanceScope";
import { quasarGlyph } from "@/lib/quasar-glyph";

// One fixed lookup, not tied to any region (sectors are the same 40-cell
// field for everyone).
const sectorLookup = new Map(buildSectors().map((s) => [s.id, s]));

export function SweepScopePanel({
  region,
  visible,
  placedQuasarIds,
}: {
  region: Region;
  visible: boolean;
  /**
   * Signatures already on the Star Map. Resolved to `placed` here rather
   * than passed down as a set, because the scope keys its signatures by
   * designation and the board keys by quasar id - the same string for a
   * generated region, but not guaranteed to be, and this panel is the one
   * place that holds both.
   */
  placedQuasarIds: Set<string>;
}) {
  const colorOf = useQuasarColor(region.id);
  const signatures: ScopeSignature[] = useMemo(
    () =>
      region.quasars.map((q, i) => {
        const sector = sectorLookup.get(region.solution[q.id].sector)!;
        return {
          id: q.designation,
          label: q.designation,
          color: colorOf(q.id, i),
          glyph: quasarGlyph(i),
          ring: sector.ring,
          seg: sector.seg,
          placed: placedQuasarIds.has(q.id),
        };
      }),
    [region, colorOf, placedQuasarIds]
  );

  return (
    <div className="flex flex-col gap-4">
      <LcarsPanel title={`${PANEL_LABELS.sweep} — ${region.name}`} accent="bg-lcars-violet">
        {/* `mb-3` on a phone: the panel fitted 390x844 by exactly 1px
            without it, and this is the cheapest 4 in the panel. */}
        <p className="text-sm text-lcars-ice/70 leading-relaxed mb-3 md:mb-4">
          Pick a signature as a reference &mdash; a single line sweeps out
          from it every cycle. Others glow as the line approaches, peaking
          as it crosses them. Distance is absolute orthogonal distance
          (ring-steps plus segment-hops) with no direction to it; anything
          farther than the visibility range from the current reference
          doesn&apos;t render at all. Switch reference to reveal a different
          set.
        </p>
        {/* The scope keys its signatures by designation; the observation
            store keys by quasar id. They are the same string for generated
            regions but not guaranteed to be, so map rather than assume. */}
        <RelativeDistanceScope
          signatures={signatures}
          // Per-rank since 2026-08-11: a region carries the range it was
          // drawn with, so a promotion cannot narrow a survey already open.
          range={region.sweepRange}
          visible={visible}
          onReference={(designation) => {
            const quasar = region.quasars.find((q) => q.designation === designation);
            if (quasar) recordReference(region.id, quasar.id);
          }}
        />
      </LcarsPanel>
    </div>
  );
}
