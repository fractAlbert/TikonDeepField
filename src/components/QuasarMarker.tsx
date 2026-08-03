"use client";

// One signature, drawn as SVG. The single geometry behind every rendering
// of a quasar in the app: the Star Map dial, the survey result's field, and
// the `QuasarStar` chip that stands in for a signature in every list.
//
// Coordinates are whatever the caller's viewBox uses - the dial passes its
// 440-unit space, `QuasarStar` a 24-unit box - so `core` is the one number
// that sets the scale and every feature below is a multiple of it. That is
// what keeps a Four-spike in the Log's 14px chip the same drawing as the
// one on the dial rather than a smaller thing that resembles it.

import { polarPoint } from "@/lib/polar-geometry";
import { QuasarGlyph } from "@/lib/quasar-glyph";

/**
 * Feature radii, as multiples of the core.
 *
 * Taken from the Marker Identity Trial unchanged except for RINGED_CORE:
 * the trial drew the ringed variant's core at full size, which left it
 * crowding its own ring. Held slightly smaller here so the ring reads as
 * detached - a star through a slightly out-of-focus aperture, which is the
 * whole idea of the variant.
 */
const HALO = 1.75;
const HALO_BLOOM = 2.6;
const SPIKE = 3.2;
const RING = 2.3;
const PINPOINT_CORE = 0.8;
const RINGED_CORE = 0.85;

/**
 * Every feature has to fit inside one cell of the dial, whose tightest
 * clearance from centre to edge is 15.5 user units (ring 1, radially - the
 * angular direction is looser at 18.5). At the shipped core of 4 the widest
 * thing here is the four-spike's reach at 12.8, leaving 2.7 spare, so the
 * glyphs cost no size increase. `scripts/check-marker-clearance.ts` is the
 * check; run it before changing any multiplier above.
 */
export const MARKER_CLEARANCE = 15.5;

export function QuasarMarker({
  glyph,
  x,
  y,
  core,
  color,
  filterId,
}: {
  glyph: QuasarGlyph;
  x: number;
  y: number;
  /** Core radius in the caller's units. Everything else scales off it. */
  core: number;
  color: string;
  /** A Gaussian blur filter the caller has put in its own `defs`. */
  filterId: string;
}) {
  const spikeLen = core * SPIKE;
  const spikeW = Math.max(0.5, core * 0.22);

  return (
    <>
      {/* Halo. Its radius is the only thing separating pinpoint from
          bloom; the blur is shared so every variant sits in the same
          optics rather than looking like a different instrument. */}
      <circle
        cx={x}
        cy={y}
        r={core * (glyph === "bloom" ? HALO_BLOOM : HALO)}
        fill={color}
        filter={`url(#${filterId})`}
        opacity={glyph === "bloom" ? 0.95 : 0.8}
      />

      {glyph === "spike4" &&
        Array.from({ length: 4 }, (_, i) => {
          const p = polarPoint(x, y, spikeLen, 90 * i);
          return (
            <line
              key={i}
              x1={x}
              y1={y}
              x2={p.x}
              y2={p.y}
              stroke={color}
              strokeWidth={spikeW}
              strokeLinecap="round"
              opacity={0.85}
            />
          );
        })}

      {glyph === "ringed" && (
        <circle
          cx={x}
          cy={y}
          r={core * RING}
          fill="none"
          stroke={color}
          strokeWidth={Math.max(0.4, core * 0.16)}
          opacity={0.55}
        />
      )}

      <circle
        cx={x}
        cy={y}
        r={
          core *
          (glyph === "pinpoint" ? PINPOINT_CORE : glyph === "ringed" ? RINGED_CORE : 1)
        }
        fill={color}
      />
    </>
  );
}
