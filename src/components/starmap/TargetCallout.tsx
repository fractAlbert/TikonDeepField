"use client";

// "Put it here" - the walk-through pointing at one cell of the dial.
//
// A ring around the target cell, a leader out to a label in the nearest
// corner, and the sector's own id on the end of it. The idiom is the
// station schematic's callouts (`StationSchematic.tsx`): a thin line, an
// elbow off the label's edge so the association is unambiguous, and a small
// dot where the leader lands. Only the palette differs - teal, because that
// is already the walk-through's colour everywhere else (the coach bar's
// elbow, the `.tutorial-anchor` outline), so the callout reads as the
// tutorial talking rather than as a new piece of game state.
//
// ## Why the label is where it is
//
// The dial is a circle of radius 200 in a 440-unit box, so the only empty
// space is the four corners - and the quadrant labels are already in them,
// at radius 236 on the diagonals. The slot below threads between a
// quadrant label and the segment labels at radius 214, which leaves it
// about 14 units of margin on either side. That is not a number to arrive
// at by eye: `scripts/check-tutorial-callout.ts` measures the label box and
// both leader segments against every label the dial draws, for all 40
// cells, and it is the reason these constants are what they are. Change one
// and re-run it.
//
// ## Why a circle inside the cell, and not the cell's own outline
//
// Stroking `cellPath` would be the literal "outline the space", but an
// armed signature already dashes the outline of every empty cell as its
// ghost-target hint - so the one cell that mattered would have been
// competing with thirty-nine others in the same language. A ring at 14.5
// sits inside a cell's 15.5 units of clearance, reads as a target rather
// than as a cell, and cannot collide with the confirmation ring at 14
// because that one only ever appears on a cell with a marker already in it.

import { MarkerRing, SEGMENTS_PER_QUADRANT, centerOf } from "@/components/starmap/field";

/** Ring drawn on the target cell. Inside the 15.5 units a cell clears. */
const TARGET_R = 14.5;

// The label slot, given in the top-left corner's frame and mirrored into
// the other three. `LABEL_X` is the edge the text is anchored to - the one
// nearer the dial - so mirroring is a reflection of the numbers and not a
// second set of them.
const LABEL_X = 56;
const LABEL_Y = 86;
const LABEL_GAP = 8;
const ELBOW_X = 85;
/** The dial's own labels, so the callout reads as a peer of them. */
const LABEL_SIZE = 18;
const VIEWBOX = 440;

// Same rounding polar-geometry.ts applies, and for the same reason: the
// division below can land a ULP apart on Node and in the browser, which
// shows up as a hydration mismatch once it is baked into an attribute.
const round = (n: number) => Math.round(n * 1000) / 1000;

const LINE = "rgba(102,204,187,0.8)";
const TEAL = "var(--lcars-teal)";

/**
 * @param sector  the cell to ring, e.g. "R2S7"
 * @param label   what to write on the end of the leader; the sector id by
 *                default, which is the useful thing to read off it
 */
export function TargetCallout({ sector, label }: { sector: string; label?: string }) {
  const parsed = /^R(\d+)S(\d+)$/.exec(sector);
  if (!parsed) return null;
  const seg = Number(parsed[2]) - 1;

  const p = centerOf(sector);

  // The corner follows from the quadrant with no table of its own: quadrant
  // I is up-right, II down-right, III down-left, IV up-left, which is
  // exactly what the segment index says (grid.ts - two segments each,
  // clockwise from twelve o'clock).
  const quadrant = Math.floor(seg / SEGMENTS_PER_QUADRANT);
  const right = quadrant === 0 || quadrant === 1;
  const bottom = quadrant === 1 || quadrant === 2;
  const fx = (x: number) => (right ? VIEWBOX - x : x);
  const fy = (y: number) => (bottom ? VIEWBOX - y : y);

  const labelX = fx(LABEL_X);
  const labelY = fy(LABEL_Y);
  const runX = fx(LABEL_X + LABEL_GAP);
  const elbowX = fx(ELBOW_X);

  // The leader stops on the ring rather than at the cell centre, so it
  // points at the target instead of striking through it.
  const dx = elbowX - p.x;
  const dy = labelY - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const anchor = {
    x: round(p.x + (dx / len) * TARGET_R),
    y: round(p.y + (dy / len) * TARGET_R),
  };

  return (
    <g style={{ pointerEvents: "none" }}>
      <MarkerRing x={p.x} y={p.y} r={TARGET_R} color={TEAL} />
      {/* The horizontal run off the label's edge, then the diagonal. The
          run is what ties the line to the words; without it a bare diagonal
          arriving at a corner reads as a stray tether. */}
      <line x1={runX} y1={labelY} x2={elbowX} y2={labelY} stroke={LINE} strokeWidth={1.2} />
      <line x1={elbowX} y1={labelY} x2={anchor.x} y2={anchor.y} stroke={LINE} strokeWidth={1.2} />
      <circle cx={anchor.x} cy={anchor.y} r={2} fill={TEAL} />
      <text
        x={labelX}
        y={labelY}
        textAnchor={right ? "start" : "end"}
        dominantBaseline="middle"
        fontSize={LABEL_SIZE}
        letterSpacing="0.05em"
        fontFamily="ui-monospace, monospace"
        fontWeight={600}
        fill={TEAL}
      >
        {label ?? sector}
      </text>
    </g>
  );
}
