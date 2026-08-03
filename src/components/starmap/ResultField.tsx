"use client";

// The field as it stood when a survey closed, drawn read-only and large.
//
// This is the same dial the Star Map draws - same geometry module, same
// palette - with everything interactive taken out and the catalog reveal
// promoted. The reveal is the best thing in the endgame and it was being
// rendered into a 260px sidebar; here it gets the whole panel.
//
// One rule differs on purpose. The Star Map only reveals a region it can't
// spoil, so `revealed` excludes `confirmed`. That is right for the board
// (every marker on a confirmed board is already the answer) but wrong for a
// report, whose job is to show the catalog. So this draws per signature
// rather than per outcome:
//
//   - marker on the true sector  -> teal confirmation ring
//   - marker somewhere else      -> dashed ring on the true sector, tethered
//   - never placed               -> dashed ring alone
//
// which reads correctly for all three outcomes and, unlike the board's
// rule, also handles a withdrawal made with half the signatures still in
// the palette.

import { RING_COUNT, SEGMENT_COUNT, sectorId } from "@/lib/grid";
import { Region } from "@/lib/puzzle-types";
import { useQuasarColor } from "@/lib/use-quasar-colors";
import {
  CATALOG_RING_R,
  CELL_FILL,
  CELL_FILL_OCCUPIED,
  CONFIRM_RING_R,
  FieldGridLines,
  FieldLabels,
  MARKER_CORE,
  MarkerRing,
  QuasarGlowDefs,
  cellPath,
  centerOf,
} from "@/components/starmap/field";
import { QuasarMarker } from "@/components/QuasarMarker";
import { quasarGlyph } from "@/lib/quasar-glyph";

const CONFIRM_STROKE = "#5ce1c8";

export type Placements = Record<string, string | undefined>;

export function ResultField({
  region,
  placements,
  className = "",
}: {
  region: Region;
  /** The board as filed, from the region's star map save. */
  placements: Placements;
  className?: string;
}) {
  const colorOf = useQuasarColor(region.id);
  const occupied = new Set(Object.values(placements).filter(Boolean) as string[]);

  return (
    <svg viewBox="0 0 440 440" className={className} role="img" aria-label={`Catalog positions for ${region.name}`}>
      <QuasarGlowDefs />
      <FieldGridLines />

      {/* Flat fills only. Nothing here takes a pointer, so there is no
          hover, no armed target and no ghost outline to draw. */}
      {Array.from({ length: RING_COUNT }).flatMap((_, ring) =>
        Array.from({ length: SEGMENT_COUNT }).map((__, seg) => {
          const id = sectorId(ring, seg);
          return (
            <path
              key={id}
              d={cellPath(ring, seg)}
              fill={occupied.has(id) ? CELL_FILL_OCCUPIED : CELL_FILL}
              stroke="none"
            />
          );
        })
      )}

      <FieldLabels />

      {region.quasars.map((q, i) => {
        const color = colorOf(q.id, i);
        const trueSid = region.solution[q.id]?.sector;
        const placedSid = placements[q.id];
        const right = !!placedSid && placedSid === trueSid;
        const p = placedSid ? centerOf(placedSid) : null;
        const t = trueSid ? centerOf(trueSid) : null;

        return (
          <g key={q.id} style={{ pointerEvents: "none" }}>
            {/* The tether is what makes a near-miss legible: one segment
                over reads very differently from the other side of the
                field, and the gap is the whole story of the filing. */}
            {p && t && !right && (
              <line
                x1={p.x}
                y1={p.y}
                x2={t.x}
                y2={t.y}
                stroke={color}
                strokeWidth={1.4}
                strokeDasharray="2 3"
                opacity={0.5}
              />
            )}

            {p && (
              <>
                <QuasarMarker
                  glyph={quasarGlyph(i)}
                  x={p.x}
                  y={p.y}
                  core={MARKER_CORE}
                  color={color}
                  filterId="quasar-glow"
                />
                {right && (
                  <MarkerRing x={p.x} y={p.y} r={CONFIRM_RING_R} color={CONFIRM_STROKE} />
                )}
              </>
            )}

            {t && !right && (
              <>
                <MarkerRing x={t.x} y={t.y} r={CATALOG_RING_R} color={color} dashed />
                <circle cx={t.x} cy={t.y} r={2} fill={color} />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
