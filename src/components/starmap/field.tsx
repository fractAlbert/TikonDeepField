"use client";

// The dial itself: geometry, palette, and the two non-interactive layers of
// chrome that every drawing of the field needs.
//
// Split out of StarMap on 2026-08-03, when the survey result report gained
// its own copy of the field. The report draws the same 440-unit polar grid
// at four times the size, and the alternative was duplicating ~170 lines of
// SVG - at which point the two would drift, and "the catalog reveal looks
// different in the report" is exactly the kind of bug nobody reports.
//
// The split is by *interactivity*, not by shape. Everything here is inert:
// no pointer handlers, no armed signature, no hover. The cells are the one
// layer that stays with each caller, because that is where the two
// genuinely differ - StarMap's take clicks and paint strokes, the report's
// are flat fills.
//
// Layer order is load-bearing and is why this is two components rather than
// one: grid lines go *under* the cells (so the dashed ghost-target outline
// lands on top of them), labels go *over*. A caller renders
// FieldGridLines -> its own cells -> FieldLabels.

import { QUADRANTS, RING_COUNT, SEGMENT_COUNT, buildSectors } from "@/lib/grid";
import { annularSegmentPath, polarPoint } from "@/lib/polar-geometry";

export const CX = 220;
export const CY = 220;
export const INNER_HOLE = 30;
export const MAX_R = 200;
export const RING_GAP = 3;
export const SEG_GAP_DEG = 3;
export const RING_THICKNESS = (MAX_R - INNER_HOLE) / RING_COUNT;
export const SEG_SPAN = 360 / SEGMENT_COUNT;

// A quadrant is a run of adjacent segments (grid.ts: two of the eight).
// Cells inside one quadrant sit flush, sharing a single dividing line, so
// the pair reads as one block; the gap is spent only where a quadrant
// actually ends. Without this every boundary looked alike and the four
// quadrants were invisible on the dial - which matters, because two of the
// four briefing clues are quadrant clues.
export const SEGMENTS_PER_QUADRANT = SEGMENT_COUNT / QUADRANTS.length;
const opensQuadrant = (seg: number) => seg % SEGMENTS_PER_QUADRANT === 0;
const closesQuadrant = (seg: number) => seg % SEGMENTS_PER_QUADRANT === SEGMENTS_PER_QUADRANT - 1;

/** Angular extent of one cell, gapped only at quadrant boundaries. */
export const cellStartAngle = (seg: number) =>
  seg * SEG_SPAN + (opensQuadrant(seg) ? SEG_GAP_DEG / 2 : 0);
export const cellEndAngle = (seg: number) =>
  (seg + 1) * SEG_SPAN - (closesQuadrant(seg) ? SEG_GAP_DEG / 2 : 0);

/** Inner and outer radius of a ring's cells, gaps already taken out. */
export function ringRadii(ring: number): [number, number] {
  return [
    INNER_HOLE + ring * RING_THICKNESS + RING_GAP / 2,
    INNER_HOLE + (ring + 1) * RING_THICKNESS - RING_GAP / 2,
  ];
}

/** The path for one cell, which is the only shape on the dial. */
export function cellPath(ring: number, seg: number): string {
  const [r0, r1] = ringRadii(ring);
  return annularSegmentPath(CX, CY, r0, r1, cellStartAngle(seg), cellEndAngle(seg));
}

// Static, so this is built once for the whole app rather than per map.
const SECTOR_BY_ID = new Map(buildSectors().map((s) => [s.id, s]));

/** Centre point of a sector's cell, in SVG user units. */
export function centerOf(sid: string): { x: number; y: number } {
  const sector = SECTOR_BY_ID.get(sid)!;
  const [r0, r1] = ringRadii(sector.ring);
  const a0 = cellStartAngle(sector.seg);
  const a1 = cellEndAngle(sector.seg);
  return polarPoint(CX, CY, (r0 + r1) / 2, (a0 + a1) / 2);
}

export const CELL_LINE = "rgba(232,240,247,0.24)";
export const CELL_LINE_GHOST = "rgba(232,240,247,0.65)";
export const CELL_FILL = "rgba(207,227,242,0.045)";
export const CELL_FILL_HOVER = "rgba(232,240,247,0.14)";
export const CELL_FILL_OCCUPIED = "rgba(207,227,242,0.08)";
export const RULED_OUT_TINT = "rgba(255,107,107,0.05)";
// Light grey, off the rule-out's red entirely: red is already the app's "no"
// everywhere (Reset, incorrect-verify, ruled-out), so a maybe must not read
// as a paler no. Grey also keeps the mark neutral against every signature
// colour, which an amber one didn't - it sat close to the amber and orange
// entries in the palette.
//
// The tint runs hotter than the rule-out's (0.10 against 0.05) because a
// grey wash can't lean on hue to separate itself from the resting cell fill
// (rgba(207,227,242,0.045)) - only on being brighter. Still under the hover
// fill at 0.14, so hovering a marked cell still reads as a change.
export const MAYBE_TINT = "rgba(210,220,232,0.10)";
export const MAYBE_STROKE = "#c3ccd6";

/**
 * Core radius of a signature marker on the dial. Unchanged since launch:
 * the glyphs adopted on 2026-08-03 all fit inside a cell at this size
 * (widest is the four-spike's 12.8 reach against 15.5 of clearance), so
 * they cost no growth. See `QuasarMarker`.
 */
export const MARKER_CORE = 4;

/**
 * "This one was right in the filing you made", and the catalog's own
 * position once a region closes.
 *
 * Both were pushed outward when glyphs shipped, and it was forced rather
 * than cosmetic. The Ringed glyph draws its detached ring at
 * `MARKER_CORE * 2.3` = 9.2, which sat exactly on the catalog ring's old
 * radius of 9 and 1.8 units inside the confirmation ring's old 11 - so a
 * Ringed signature read as already confirmed, and its own ring merged with
 * the reveal. At 12 and 14 both clear the glyph by a comfortable margin and
 * still sit inside the 15.5 cell clearance.
 */
export const CATALOG_RING_R = 12;
export const CONFIRM_RING_R = 14;

/**
 * A ring drawn around a marker, backed so it survives the glow underneath.
 *
 * The backing is not decoration. Bloom's halo has a hard radius of 10.4 and
 * a blur of 3.5, which puts real brightness out at 14 - so a plain teal
 * confirmation ring over a Bloom signature simply vanished, while reading
 * perfectly over the other three glyphs. Found by zooming into a confirmed
 * board; the DOM said all eight rings were present, which is exactly the
 * kind of thing a count cannot catch.
 *
 * Moving the ring outward instead was the other option and was rejected:
 * the cell only has 15.5 units of clearance, so there is nowhere to go that
 * doesn't crowd the grid line.
 */
export function MarkerRing({
  x,
  y,
  r,
  color,
  dashed = false,
}: {
  x: number;
  y: number;
  r: number;
  color: string;
  dashed?: boolean;
}) {
  return (
    <>
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        stroke="#05070b"
        strokeWidth={dashed ? 3.2 : 3}
        opacity={0.6}
        strokeDasharray={dashed ? "3 2.5" : undefined}
      />
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={dashed ? 1.6 : 1.5}
        strokeDasharray={dashed ? "3 2.5" : undefined}
      />
    </>
  );
}

// Ring/segment/centre labels. The size is in SVG user units, not pixels:
// the viewBox is 440 wide and renders into 260px in the desktop sidebar,
// so a label paints at size * 260/440 there (and correspondingly larger on
// a phone, where the map is wider - and larger again in the survey report,
// which is the whole reason that panel exists). The old value of 10 came
// out at 5.9px, which was simply too small to read. 18 lands at 10.6px and,
// per the label-size trial in the Prototypes panel, is still clear of the
// grid - the ring labels sit at a fixed radius and only start crowding
// their own ring nearer 22.
//
// Neutral gray rather than the ice tint used elsewhere, so labels this much
// larger sit behind the signatures instead of competing with them.
export const LABEL_SIZE = 18;
export const LABEL_SIZE_CTR = 17;
export const LABEL_FILL = "rgba(198,203,211,0.45)";

// Quadrant labels sit in the corners of the viewBox, which are empty: the
// dial is a circle of radius 200 in a 440 box, so the diagonals have ~80
// units of clearance the cardinal directions don't. That works because a
// quadrant is two of the eight segments, which puts every quadrant's
// midpoint exactly on a diagonal - 45, 135, 225, 315 degrees.
//
// Worth labelling at all because two of the four briefing clues are
// quadrant clues, and until now the map never said which segments a
// quadrant covered. See grid.ts: quadrant I is segments S1-S2, II is
// S3-S4, and so on clockwise.
const QUADRANT_LABEL_R = 236;
// User units, like every other label here. The sidebar renders the 440-unit
// viewBox at 260px, so this paints at ~10px - matching the ring and segment
// labels, which the label-size trial in the Prototypes panel settled at
// 10.6px after 5.9px proved unreadable. Going larger is what runs "QUAD III"
// out of the corner; `scripts/check-quadrant-labels.ts` measures the margin.
const QUADRANT_LABEL_SIZE = 17;
const QUADRANT_FILL = "rgba(198,203,211,0.40)";
const QUADRANT_LINE = "rgba(232,240,247,0.30)";

/**
 * Blurred glow halo behind a solid core - the same look Sweep Scope's blips
 * use, kept consistent so a quasar reads the same everywhere it's shown.
 *
 * The id is global to the document, so two dials on one page would collide.
 * They can't be: the map lives in the sidebar or in `main`, never both
 * (see AppShell), and the report replaces `main` entirely.
 */
export function QuasarGlowDefs() {
  return (
    <defs>
      <filter id="quasar-glow" x="-150%" y="-150%" width="400%" height="400%">
        <feGaussianBlur stdDeviation="3.5" />
      </filter>
    </defs>
  );
}

/**
 * The centre hole and the grid, drawn once per line. Goes *under* the cells.
 *
 * The cells are fill-only and can't carry the outline: two cells inside a
 * quadrant share a radial edge, so stroking each cell painted that edge
 * twice and it came out heavier than the quadrant's real boundary - making
 * the middle of a quadrant look like its edge, which is the opposite of the
 * point.
 *
 * So each quadrant-ring block is outlined as one shape, with its internal
 * divider drawn separately as a single line.
 */
export function FieldGridLines() {
  return (
    <>
      <circle cx={CX} cy={CY} r={INNER_HOLE - 4} fill="none" stroke={CELL_LINE} />
      <text
        x={CX}
        y={CY + 6}
        textAnchor="middle"
        fontSize={LABEL_SIZE_CTR}
        letterSpacing="0.08em"
        fill={LABEL_FILL}
      >
        CTR
      </text>

      {Array.from({ length: RING_COUNT }).flatMap((_, ring) =>
        QUADRANTS.map((quadrant, q) => {
          const [r0, r1] = ringRadii(ring);
          const firstSeg = q * SEGMENTS_PER_QUADRANT;
          return (
            <g key={`grid-${ring}-${quadrant}`} style={{ pointerEvents: "none" }}>
              <path
                d={annularSegmentPath(
                  CX,
                  CY,
                  r0,
                  r1,
                  cellStartAngle(firstSeg),
                  cellEndAngle(firstSeg + SEGMENTS_PER_QUADRANT - 1)
                )}
                fill="none"
                stroke={CELL_LINE}
                strokeWidth={1}
              />
              {Array.from({ length: SEGMENTS_PER_QUADRANT - 1 }).map((__, k) => {
                const angle = (firstSeg + k + 1) * SEG_SPAN;
                const inner = polarPoint(CX, CY, r0, angle);
                const outer = polarPoint(CX, CY, r1, angle);
                return (
                  <line
                    key={k}
                    x1={inner.x}
                    y1={inner.y}
                    x2={outer.x}
                    y2={outer.y}
                    stroke={CELL_LINE}
                    strokeWidth={1}
                  />
                );
              })}
            </g>
          );
        })
      )}
    </>
  );
}

/**
 * Ring, segment and quadrant labels, plus the quadrant boundaries. Goes
 * *over* the cells and under the markers.
 *
 * The boundaries fall in the gaps the segments already leave, so those
 * lines sit in dead space rather than over any cell - they just make the
 * four blocks legible as blocks. Drawn before the markers so a signature is
 * never underneath one.
 */
export function FieldLabels() {
  return (
    <>
      {Array.from({ length: RING_COUNT }).map((_, ring) => {
        if (ring % 2 !== 0) return null;
        const [r0, r1] = ringRadii(ring);
        const p = polarPoint(CX, CY, (r0 + r1) / 2, -SEG_GAP_DEG);
        return (
          <text
            key={`ring-label-${ring}`}
            x={p.x}
            y={p.y}
            textAnchor="end"
            fontSize={LABEL_SIZE}
            fill={LABEL_FILL}
            fontFamily="ui-monospace, monospace"
          >
            R{ring + 1}
          </text>
        );
      })}

      {Array.from({ length: SEGMENT_COUNT }).map((_, seg) => {
        const mid = seg * SEG_SPAN + SEG_SPAN / 2;
        const p = polarPoint(CX, CY, MAX_R + 14, mid);
        return (
          <text
            key={`seg-label-${seg}`}
            x={p.x}
            y={p.y}
            textAnchor={mid > 185 ? "end" : mid < 175 ? "start" : "middle"}
            fontSize={LABEL_SIZE}
            fill={LABEL_FILL}
            fontFamily="ui-monospace, monospace"
          >
            S{seg + 1}
          </text>
        );
      })}

      {QUADRANTS.map((quadrant, q) => {
        const boundary = q * 90;
        const a = polarPoint(CX, CY, INNER_HOLE, boundary);
        const b = polarPoint(CX, CY, MAX_R + 4, boundary);
        const label = polarPoint(CX, CY, QUADRANT_LABEL_R, boundary + 45);
        return (
          <g key={`quad-${quadrant}`} style={{ pointerEvents: "none" }}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={QUADRANT_LINE} strokeWidth={1} />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={QUADRANT_LABEL_SIZE}
              letterSpacing="0.12em"
              fill={QUADRANT_FILL}
              fontFamily="ui-monospace, monospace"
            >
              QUAD {quadrant}
            </text>
          </g>
        );
      })}
    </>
  );
}
