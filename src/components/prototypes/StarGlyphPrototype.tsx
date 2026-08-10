"use client";

import { useState } from "react";
import { QUADRANTS, RING_COUNT, SEGMENT_COUNT } from "@/lib/grid";
import { annularSegmentPath, polarPoint } from "@/lib/polar-geometry";
import { quasarColorHex } from "@/lib/quasar-colors";
import { playButtonClick } from "@/lib/sound";
import { LcarsPanel } from "@/components/LcarsShell";

/**
 * Second identity channel for signature markers: can two markers be told
 * apart without relying on colour?
 *
 * Two constraints shaped what is on offer here.
 *
 * **It has to look like a sky.** Geometric glyphs - diamonds, triangles,
 * squares - are legible but read as a chart of shapes rather than a star
 * map, so they are deliberately absent. Everything below is a way an actual
 * point source differs through an actual instrument: how tight the core is,
 * how far the bloom spreads, whether the optics throw diffraction spikes
 * and how many.
 *
 * **It cannot key off type.** `region.solution[q.id].type` is secret until
 * a region closes, so rendering Binary-Class as a double or Dormant Core as
 * a faint one would hand the player the answer. These are assigned by the
 * signature's position in the region list, exactly like colour, and carry
 * no information about what the thing actually is.
 *
 * The question the prototype exists to settle is size, because the shipped
 * marker is far too small for any of this: `r=4` in a 440-unit viewBox
 * rendered at 260px paints 4.7px across, where every variant below
 * collapses to the same dot. Hence the width and scale controls, and the
 * comparison strip pinned to the three widths that actually ship.
 *
 * Monochrome is the real test. If the variants only separate while they are
 * also different colours, this has bought nothing.
 *
 * ## Settled 2026-08-03 — four of the six shipped
 *
 * Pinpoint, Bloom, Four-spike and Ringed are live; see `lib/quasar-glyph.ts`
 * and `components/QuasarMarker.tsx`. Six-spike and Four-spike-rotated were
 * cut: both separate from Four-spike only by counting arms or reading their
 * angle, which works on a swatch and not at 15px on the dial.
 *
 * The trial's own worry — that the shipped `r=4` core is too small for any
 * of this — turned out to be about the *core*, which is the one thing none
 * of the four shipped variants distinguish themselves by at a distance.
 * Spikes, bloom spread and a detached ring all carry outside the core, and
 * at the docked 260px they render 8.3 / 12.3 / 15.1 / 10.9 px across. So
 * nothing grew: `scripts/check-marker-clearance.ts` confirms all four fit
 * inside a cell's 15.5 units of clearance at the core the map already used.
 *
 * Kept here, with all six, as the record of the comparison. It draws its
 * own markers rather than importing `QuasarMarker`, because two of the six
 * no longer exist there.
 */

const CX = 220;
const CY = 220;
const INNER_HOLE = 30;
const MAX_R = 200;
const RING_GAP = 3;
const SEG_GAP_DEG = 3;
const RING_THICKNESS = (MAX_R - INNER_HOLE) / RING_COUNT;
const SEG_SPAN = 360 / SEGMENT_COUNT;
const SEGMENTS_PER_QUADRANT = SEGMENT_COUNT / QUADRANTS.length;

const opensQuadrant = (seg: number) => seg % SEGMENTS_PER_QUADRANT === 0;
const closesQuadrant = (seg: number) => seg % SEGMENTS_PER_QUADRANT === SEGMENTS_PER_QUADRANT - 1;
const cellStartAngle = (seg: number) => seg * SEG_SPAN + (opensQuadrant(seg) ? SEG_GAP_DEG / 2 : 0);
const cellEndAngle = (seg: number) =>
  (seg + 1) * SEG_SPAN - (closesQuadrant(seg) ? SEG_GAP_DEG / 2 : 0);

const CELL_LINE = "rgba(232,240,247,0.24)";
const CELL_FILL = "rgba(207,227,242,0.045)";
const MONO = "#dce8f5";

/** The shipped marker, for reference: core r=4 inside a blurred r=7 halo. */
const SHIPPED_CORE = 4;

/**
 * Side of the true-size swatch box, in the same user units as the dial.
 *
 * Only sets padding, not marker size: a marker paints at
 * `BOX * (w/440) / BOX = w/440` px per user unit whatever this is, which is
 * the same ratio the real dial uses. 80 leaves room for the widest thing
 * at the top of the scale slider - the bloom halo plus its blur reaches
 * 32.0 units, and the longest spikes 30.7, against a 40-unit half-box.
 */
const TRUE_SIZE_BOX = 80;

type VariantId = "pinpoint" | "bloom" | "spike4" | "spike6" | "spikeX" | "halo";

interface Variant {
  id: VariantId;
  name: string;
  note: string;
}

const VARIANTS: Variant[] = [
  {
    id: "pinpoint",
    name: "Pinpoint",
    note: "Tight core, tight bloom. The sharpest thing on the dial - a well-resolved point source.",
  },
  {
    id: "bloom",
    name: "Bloom",
    note: "Same core, halo spread wide and soft. Reads as brighter and nearer without being bigger.",
  },
  {
    id: "spike4",
    name: "Four-spike",
    note: "Diffraction spikes on the cardinals. The most star-like differentiator there is, and the spikes carry the difference well outside the core.",
  },
  {
    id: "spike6",
    name: "Six-spike",
    note: "Same idea, six arms. Distinct from four at a glance; the arms are shorter so it does not sprawl further.",
  },
  {
    id: "spikeX",
    name: "Four-spike, rotated",
    note: "Four arms on the diagonals. Tests whether orientation alone separates, which is the cheapest distinction available.",
  },
  {
    id: "halo",
    name: "Ringed",
    note: "Core with a faint detached ring, like a star through a slightly out-of-focus aperture. Adds a second radius without adding a shape.",
  },
];

/** Where the eight demo markers sit. Spread so no two share a ring. */
const DEMO_CELLS: [number, number][] = [
  [0, 1],
  [1, 4],
  [2, 6],
  [3, 0],
  [4, 3],
  [1, 7],
  [3, 5],
  [4, 6],
];

function cellCenter(ring: number, seg: number) {
  const r0 = INNER_HOLE + ring * RING_THICKNESS + RING_GAP / 2;
  const r1 = INNER_HOLE + (ring + 1) * RING_THICKNESS - RING_GAP / 2;
  return polarPoint(CX, CY, (r0 + r1) / 2, (cellStartAngle(seg) + cellEndAngle(seg)) / 2);
}

/**
 * One marker, in SVG user units. `scale` multiplies the shipped `r=4` core,
 * so 1.0 is exactly what ships today and everything is measured against it.
 */
function StarMarker({
  variant,
  x,
  y,
  color,
  scale,
  filterId,
}: {
  variant: VariantId;
  x: number;
  y: number;
  color: string;
  scale: number;
  filterId: string;
}) {
  const core = SHIPPED_CORE * scale;
  const spike = core * 3.2;
  const spikeW = Math.max(0.5, core * 0.22);

  const arms = (count: number, offsetDeg: number) =>
    Array.from({ length: count }, (_, i) => {
      const a = offsetDeg + (360 / count) * i;
      const p = polarPoint(x, y, spike, a);
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
    });

  return (
    <g style={{ pointerEvents: "none" }}>
      {/* Halo. Radius is what separates pinpoint from bloom; the blur
          itself is shared so every variant sits in the same optics. */}
      <circle
        cx={x}
        cy={y}
        r={variant === "bloom" ? core * 2.6 : core * 1.75}
        fill={color}
        filter={`url(#${filterId})`}
        opacity={variant === "bloom" ? 0.95 : 0.8}
      />
      {variant === "spike4" && arms(4, 0)}
      {variant === "spike6" && arms(6, 0)}
      {variant === "spikeX" && arms(4, 45)}
      {variant === "halo" && (
        <circle
          cx={x}
          cy={y}
          r={core * 2.3}
          fill="none"
          stroke={color}
          strokeWidth={Math.max(0.4, core * 0.16)}
          opacity={0.55}
        />
      )}
      <circle cx={x} cy={y} r={variant === "pinpoint" ? core * 0.8 : core} fill={color} />
    </g>
  );
}

/** The dial, at a real rendered pixel width. */
function Dial({
  widthPx,
  scale,
  mono,
  filterId,
}: {
  widthPx: number;
  scale: number;
  mono: boolean;
  filterId: string;
}) {
  return (
    <svg viewBox="0 0 440 440" width={widthPx} height={widthPx} className="shrink-0">
      <defs>
        <filter id={filterId} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation={3.5} />
        </filter>
      </defs>

      {Array.from({ length: RING_COUNT }).flatMap((_, ring) =>
        QUADRANTS.map((quadrant, q) => {
          const r0 = INNER_HOLE + ring * RING_THICKNESS + RING_GAP / 2;
          const r1 = INNER_HOLE + (ring + 1) * RING_THICKNESS - RING_GAP / 2;
          const firstSeg = q * SEGMENTS_PER_QUADRANT;
          return (
            <path
              key={`g-${ring}-${quadrant}`}
              d={annularSegmentPath(
                CX,
                CY,
                r0,
                r1,
                cellStartAngle(firstSeg),
                cellEndAngle(firstSeg + SEGMENTS_PER_QUADRANT - 1)
              )}
              fill={CELL_FILL}
              stroke={CELL_LINE}
              strokeWidth={1}
            />
          );
        })
      )}

      {DEMO_CELLS.map(([ring, seg], i) => {
        const p = cellCenter(ring, seg);
        return (
          <StarMarker
            key={`${ring}-${seg}`}
            variant={VARIANTS[i % VARIANTS.length].id}
            x={p.x}
            y={p.y}
            color={mono ? MONO : quasarColorHex(i)}
            scale={scale}
            filterId={filterId}
          />
        );
      })}
    </svg>
  );
}

export function StarGlyphPrototype() {
  const [widthPx, setWidthPx] = useState(260);
  const [scale, setScale] = useState(1);
  const [mono, setMono] = useState(true);

  const corePx = ((SHIPPED_CORE * scale * 2) / 440) * widthPx;

  return (
    <LcarsPanel title="Star Map — Marker Identity Trial" accent="bg-lcars-violet">
      <p className="text-sm text-lcars-ice/70 leading-relaxed mb-2">
        Can two signatures be told apart without colour? Six ways a point
        source can differ through an instrument &mdash; core tightness, bloom
        spread, diffraction spikes, a detached halo ring. No diamonds, no
        triangles: the dial has to keep reading as a sky.
      </p>
      <p className="text-xs text-lcars-ice/50 leading-relaxed mb-3">
        None of these keys off the signature&apos;s type, which stays secret
        until a region closes &mdash; they are assigned by list position, the
        same as colour. <strong className="text-lcars-ice/70">Monochrome is
        the real test:</strong> if the variants only separate while they are
        also different colours, this has bought nothing.
      </p>
      <p className="text-xs text-lcars-teal/80 leading-relaxed mb-4">
        <strong>Settled:</strong> Pinpoint, Bloom, Four-spike and Ringed
        shipped and are what the Star Map draws now. Six-spike and the
        rotated four were cut &mdash; both differ from Four-spike only by
        arm count or angle, which reads on a swatch and not at 15px on the
        dial. Nothing grew to make room: all four fit a cell at the core the
        map already used.
      </p>

      <div className="flex flex-wrap items-end gap-4 mb-4">
        <label className="flex flex-col gap-1">
          <span className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50">
            Map width {widthPx}px
          </span>
          <input
            type="range"
            min={220}
            max={460}
            step={10}
            value={widthPx}
            onChange={(e) => setWidthPx(+e.target.value)}
            className="w-44 accent-lcars-violet"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50">
            Marker scale {scale.toFixed(2)}&times;
          </span>
          <input
            type="range"
            min={0.7}
            max={2.4}
            step={0.05}
            value={scale}
            onChange={(e) => setScale(+e.target.value)}
            className="w-44 accent-lcars-violet"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            playButtonClick();
            setMono((m) => !m);
          }}
          className={`lcars-caps text-[11px] px-3 py-1.5 rounded-full cursor-pointer ${
            mono ? "bg-lcars-amber text-black font-semibold" : "bg-lcars-control text-lcars-ice/60"
          }`}
        >
          Monochrome
        </button>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <Dial widthPx={widthPx} scale={scale} mono={mono} filterId="proto-glow-main" />
        <div className="flex-1 min-w-[200px]">
          <div className="font-mono text-xs text-lcars-ice/60 mb-3">
            core {corePx.toFixed(1)}px across
            <span className="text-lcars-ice/35">
              {" "}
              &middot; shipped is 4.7px at 260px / 1.00&times;
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {VARIANTS.map((v, i) => (
              <li key={v.id} className="flex gap-2.5 text-xs">
                <svg viewBox="0 0 44 44" width={34} height={34} className="shrink-0">
                  <defs>
                    <filter id={`sw-${v.id}`} x="-150%" y="-150%" width="400%" height="400%">
                      <feGaussianBlur stdDeviation={1.6} />
                    </filter>
                  </defs>
                  <StarMarker
                    variant={v.id}
                    x={22}
                    y={22}
                    color={mono ? MONO : quasarColorHex(i)}
                    scale={1.5}
                    filterId={`sw-${v.id}`}
                  />
                </svg>
                <span className="min-w-0">
                  <span className="lcars-caps text-lcars-violet">{v.name}</span>
                  <span className="block text-lcars-ice/55 leading-relaxed">{v.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* The widths that actually ship, at true marker size.

          Markers rather than whole dials, and emphatically not dials
          shrunk to fit: rescaling to make three maps sit side by side
          would paint every marker at a size it never renders at, which is
          the exact error the label-size trial was built to catch. Each
          swatch below maps BOX user units onto BOX * w/440 px, so a marker
          here is the same number of pixels as on a map of that width. */}
      <div className="mt-5">
        <div className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50 mb-1">
          True size at the widths that ship
        </div>
        <div className="text-xs text-lcars-ice/45 leading-relaxed mb-3">
          260 desktop today &middot; 390 after the planned 50% widening
          &middot; 420 phone. If two of these are indistinguishable in a row,
          that row is the answer for that width.
        </div>
        <div className="flex flex-col gap-3">
          {[260, 390, 420].map((w) => {
            const px = TRUE_SIZE_BOX * (w / 440);
            return (
              <div key={w} className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-[10px] text-lcars-ice/40 w-28 shrink-0">
                  {w}px map
                  <span className="block text-lcars-ice/25">
                    core {(((SHIPPED_CORE * scale * 2) / 440) * w).toFixed(1)}px
                  </span>
                </span>
                {VARIANTS.map((v, i) => (
                  <svg
                    key={v.id}
                    viewBox={`0 0 ${TRUE_SIZE_BOX} ${TRUE_SIZE_BOX}`}
                    width={px}
                    height={px}
                    className="shrink-0"
                  >
                    <defs>
                      <filter
                        id={`true-${w}-${v.id}`}
                        x="-150%"
                        y="-150%"
                        width="400%"
                        height="400%"
                      >
                        <feGaussianBlur stdDeviation={3.5} />
                      </filter>
                    </defs>
                    <StarMarker
                      variant={v.id}
                      x={TRUE_SIZE_BOX / 2}
                      y={TRUE_SIZE_BOX / 2}
                      color={mono ? MONO : quasarColorHex(i)}
                      scale={scale}
                      filterId={`true-${w}-${v.id}`}
                    />
                  </svg>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </LcarsPanel>
  );
}
