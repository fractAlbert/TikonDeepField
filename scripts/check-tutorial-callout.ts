// Checks the walk-through's "place it here" callout: that its target ring
// fits the cell it rings, that its label lands inside the viewBox in a
// corner that is actually empty, and that its leader line does not run
// through any of the dial's own labels - for every one of the 40 cells a
// future step might point at, not just the one the tutorial points at today.
//
// Numeric rather than visual on purpose: eyeballing this dial's geometry has
// produced wrong "fixes" before. The corners are the only empty space in the
// 440-unit box (the dial is a circle of radius 200 in it), and they are
// already occupied by the quadrant labels, so "is there room" is a real
// question with a thin answer rather than an obvious yes.
//
// Usage: npx tsx scripts/check-tutorial-callout.ts

import { polarPoint } from "../src/lib/polar-geometry";
import { QUADRANTS, RING_COUNT, SEGMENT_COUNT, buildSectors, quadrantOf } from "../src/lib/grid";
import { TUTORIAL_STEPS } from "../src/lib/tutorial";

// Must match components/starmap/field.tsx.
const CX = 220;
const CY = 220;
const VIEWBOX = 440;
const INNER_HOLE = 30;
const MAX_R = 200;
const RING_GAP = 3;
const SEG_GAP_DEG = 3;
const RING_THICKNESS = (MAX_R - INNER_HOLE) / RING_COUNT;
const SEG_SPAN = 360 / SEGMENT_COUNT;
const SEGMENTS_PER_QUADRANT = SEGMENT_COUNT / QUADRANTS.length;
const LABEL_SIZE = 18;
const QUADRANT_LABEL_R = 236;
const QUADRANT_LABEL_SIZE = 17;

// Must match components/starmap/TargetCallout.tsx.
const TARGET_R = 14.5;
const LABEL_X = 56;
const LABEL_Y = 86;
const LABEL_GAP = 8;
const ELBOW_X = 85;
const CALLOUT_LABEL_SIZE = 18;
const CALLOUT_LABEL_CHARS = 4; // "R2S7"

// ui-monospace advances at ~0.6em. Same factor the quadrant-label check
// uses, and close enough for clearances measured in tens of units.
const ADVANCE = 0.6;
const width = (chars: number, size: number, tracking = 0) =>
  chars * ADVANCE * size + Math.max(0, chars - 1) * tracking * size;

interface Box {
  name: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const opensQuadrant = (seg: number) => seg % SEGMENTS_PER_QUADRANT === 0;
const closesQuadrant = (seg: number) => seg % SEGMENTS_PER_QUADRANT === SEGMENTS_PER_QUADRANT - 1;
const cellStartAngle = (seg: number) => seg * SEG_SPAN + (opensQuadrant(seg) ? SEG_GAP_DEG / 2 : 0);
const cellEndAngle = (seg: number) =>
  (seg + 1) * SEG_SPAN - (closesQuadrant(seg) ? SEG_GAP_DEG / 2 : 0);
const ringRadii = (ring: number): [number, number] => [
  INNER_HOLE + ring * RING_THICKNESS + RING_GAP / 2,
  INNER_HOLE + (ring + 1) * RING_THICKNESS - RING_GAP / 2,
];

/** Every label the dial already draws, as a box. */
function existingLabels(): Box[] {
  const boxes: Box[] = [];

  for (let ring = 0; ring < RING_COUNT; ring++) {
    if (ring % 2 !== 0) continue; // only even rings are labelled
    const [r0, r1] = ringRadii(ring);
    const p = polarPoint(CX, CY, (r0 + r1) / 2, -SEG_GAP_DEG);
    const w = width(2, LABEL_SIZE);
    boxes.push({ name: `R${ring + 1}`, x0: p.x - w, y0: p.y - 13, x1: p.x, y1: p.y + 4 });
  }

  for (let seg = 0; seg < SEGMENT_COUNT; seg++) {
    const mid = seg * SEG_SPAN + SEG_SPAN / 2;
    const p = polarPoint(CX, CY, MAX_R + 14, mid);
    const w = width(2, LABEL_SIZE);
    // textAnchor: end past 185 degrees, start before 175, middle between.
    const x0 = mid > 185 ? p.x - w : mid < 175 ? p.x : p.x - w / 2;
    boxes.push({ name: `S${seg + 1}`, x0, y0: p.y - 13, x1: x0 + w, y1: p.y + 4 });
  }

  QUADRANTS.forEach((quadrant, q) => {
    const p = polarPoint(CX, CY, QUADRANT_LABEL_R, q * 90 + 45);
    const w = width(`QUAD ${quadrant}`.length, QUADRANT_LABEL_SIZE, 0.12);
    boxes.push({
      name: `QUAD ${quadrant}`,
      x0: p.x - w / 2,
      y0: p.y - 9,
      x1: p.x + w / 2,
      y1: p.y + 9,
    });
  });

  return boxes;
}

/**
 * The callout, mirrored into the corner of the target's own quadrant.
 * Quadrant I is up-right, II down-right, III down-left, IV up-left, so the
 * corner follows from the quadrant with no extra table.
 */
function callout(ring: number, seg: number) {
  const [r0, r1] = ringRadii(ring);
  const mid = (cellStartAngle(seg) + cellEndAngle(seg)) / 2;
  const p = polarPoint(CX, CY, (r0 + r1) / 2, mid);

  const q = Math.floor(seg / SEGMENTS_PER_QUADRANT);
  const right = q === 0 || q === 1; // quadrants I and II sit on the right
  const bottom = q === 1 || q === 2;
  const fx = (x: number) => (right ? VIEWBOX - x : x);
  const fy = (y: number) => (bottom ? VIEWBOX - y : y);

  const labelEdge = { x: fx(LABEL_X), y: fy(LABEL_Y) };
  const elbow = { x: fx(ELBOW_X), y: fy(LABEL_Y) };
  const runStart = { x: fx(LABEL_X + LABEL_GAP), y: fy(LABEL_Y) };

  // The leader stops on the target ring rather than at the cell centre, so
  // it points at the ring instead of striking through it.
  const dx = elbow.x - p.x;
  const dy = elbow.y - p.y;
  const len = Math.hypot(dx, dy);
  const anchor = { x: p.x + (dx / len) * TARGET_R, y: p.y + (dy / len) * TARGET_R };

  const w = width(CALLOUT_LABEL_CHARS, CALLOUT_LABEL_SIZE, 0.05);
  const labelBox: Box = {
    name: "callout label",
    x0: right ? labelEdge.x : labelEdge.x - w,
    y0: labelEdge.y - CALLOUT_LABEL_SIZE * 0.6,
    x1: right ? labelEdge.x + w : labelEdge.x,
    y1: labelEdge.y + CALLOUT_LABEL_SIZE * 0.6,
  };

  return { p, labelBox, runStart, elbow, anchor };
}

/** Shortest distance from a segment to a box, 0 if it enters. */
function segmentToBox(
  a: { x: number; y: number },
  b: { x: number; y: number },
  box: Box
): number {
  const STEPS = 200;
  let best = Infinity;
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const dx = Math.max(box.x0 - x, 0, x - box.x1);
    const dy = Math.max(box.y0 - y, 0, y - box.y1);
    best = Math.min(best, Math.hypot(dx, dy));
  }
  return best;
}

function boxGap(a: Box, b: Box): number {
  const dx = Math.max(a.x0 - b.x1, b.x0 - a.x1, 0);
  const dy = Math.max(a.y0 - b.y1, b.y0 - a.y1, 0);
  return dx === 0 && dy === 0 ? 0 : Math.hypot(dx, dy);
}

const MIN_LABEL_GAP = 8;
const MIN_LEADER_GAP = 5;

let failures = 0;
const labels = existingLabels();

// 1. The ring has to fit the cell it rings. Ring 1 is the tight one - its
//    cells are the narrowest radially, and radial is the binding direction
//    everywhere (the angular half-width is never below 18.5).
const radialClearance = (RING_THICKNESS - RING_GAP) / 2;
console.log(`Target ring r=${TARGET_R} against a cell's ${radialClearance} units of radial clearance`);
if (TARGET_R >= radialClearance) {
  console.log("  FAIL - the ring reaches past the cell edge");
  failures++;
} else {
  console.log(`  ok - ${(radialClearance - TARGET_R).toFixed(2)} units to spare\n`);
}

// 2. The label lands in the box, clear of the dial's own labels. Only four
//    distinct positions, one per corner, so this is checked per quadrant.
console.log("Label placement, one corner per quadrant:\n");
for (let q = 0; q < QUADRANTS.length; q++) {
  const seg = q * SEGMENTS_PER_QUADRANT;
  const { labelBox } = callout(0, seg);
  const inBox =
    labelBox.x0 > 0 && labelBox.x1 < VIEWBOX && labelBox.y0 > 0 && labelBox.y1 < VIEWBOX;
  let worst = { name: "-", gap: Infinity };
  for (const other of labels) {
    const gap = boxGap(labelBox, other);
    if (gap < worst.gap) worst = { name: other.name, gap };
  }
  // The label must also sit off the dial itself. The corners are the only
  // part of the box the circle of radius 200 doesn't reach, and the label
  // is wide enough to slide back onto it if the slot creeps inward.
  const nearest = [
    [labelBox.x0, labelBox.y0],
    [labelBox.x1, labelBox.y0],
    [labelBox.x0, labelBox.y1],
    [labelBox.x1, labelBox.y1],
  ].reduce((best, [x, y]) => Math.min(best, Math.hypot(x - CX, y - CY)), Infinity);
  const offDial = nearest > MAX_R;
  const ok = inBox && offDial && worst.gap >= MIN_LABEL_GAP;
  if (!ok) failures++;
  console.log(
    `  QUAD ${QUADRANTS[q].padEnd(4)} x ${labelBox.x0.toFixed(0).padStart(4)}..${labelBox.x1
      .toFixed(0)
      .padStart(4)}  y ${labelBox.y0.toFixed(0).padStart(4)}..${labelBox.y1
      .toFixed(0)
      .padStart(4)}  nearest label ${worst.name.padEnd(8)} ${worst.gap
      .toFixed(1)
      .padStart(6)}  dial edge +${(nearest - MAX_R).toFixed(1).padStart(5)}  ${
      ok ? "ok" : !inBox ? "OUT OF BOX" : !offDial ? "ON THE DIAL" : "TOO CLOSE"
    }`
  );
}

// 3. The leader must not run through a label.
//
// Only enforced for the cells the walk-through actually points at, read
// from the step list rather than hard-coded here. The label slot is one
// fixed position per corner, so a leader to a cell at the far edge of that
// corner's quadrant comes in at a much shallower angle and can graze a
// segment label - which is a real constraint on *where a hint may point*,
// not a bug in the slot. Every cell is measured and printed; add a hint
// somewhere new and this tells you straight away whether the corner works
// for it.
const hinted = new Set(
  TUTORIAL_STEPS.map((s) => s.hint?.sector).filter((s): s is string => !!s)
);
console.log(`\nLeader clearance (enforced for: ${[...hinted].join(", ") || "nothing"}):\n`);
const results = buildSectors().map((s) => {
  const c = callout(s.ring, s.seg);
  let worst = { name: "-", gap: Infinity };
  for (const other of labels) {
    const gap = Math.min(
      segmentToBox(c.runStart, c.elbow, other),
      segmentToBox(c.elbow, c.anchor, other)
    );
    if (gap < worst.gap) worst = { name: other.name, gap };
  }
  return { id: s.id, quadrant: quadrantOf(s), worst, callout: c };
});
for (const r of [...results].sort((a, b) => a.worst.gap - b.worst.gap)) {
  const enforced = hinted.has(r.id);
  const ok = r.worst.gap >= MIN_LEADER_GAP;
  if (enforced && !ok) failures++;
  if (!enforced && ok) continue; // only the interesting rows
  console.log(
    `  ${enforced ? "*" : " "} ${r.id.padEnd(5)} (QUAD ${r.quadrant.padEnd(4)}) nearest ${r.worst.name.padEnd(
      8
    )} ${r.worst.gap.toFixed(1).padStart(6)}  ${ok ? "ok" : enforced ? "TOO CLOSE" : "unusable"}`
  );
}

// 4. Where the walk-through's own callouts land, so the numbers in the
//    component can be checked against something.
for (const id of hinted) {
  const r = results.find((x) => x.id === id)!;
  const c = r.callout;
  console.log(
    `\n${id}: cell centre (${c.p.x.toFixed(1)}, ${c.p.y.toFixed(1)})` +
      `  ring anchor (${c.anchor.x.toFixed(1)}, ${c.anchor.y.toFixed(1)})` +
      `  elbow (${c.elbow.x.toFixed(1)}, ${c.elbow.y.toFixed(1)})` +
      `  label edge (${c.labelBox.x1.toFixed(1)}, ${LABEL_Y})`
  );
}

console.log(failures === 0 ? "\nAll clear." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
