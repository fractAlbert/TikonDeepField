"use client";

// A flat vector elevation schematic of the station - same self-drawn, no
// external assets approach as OutpostLogo. Values are rounded so the SVG
// path strings are identical between server and client renders (see the
// same fix applied to polarPoint in polar-geometry.ts).
//
// The sensor array is fixed - same size and position throughout, matching
// the station lore's "extends well past the main structure and honestly
// dwarfs it." What actually animates is the hull: it mounts at true
// relative scale (tiny, next to a correctly-sized array), holds there with
// pointer-labeled callouts, then grows in place into the familiar
// operational proportions and relabels to match. Plays once per mount, so
// leaving this section and coming back (see StationInfoPanel's key) resets
// and replays it.

import { useEffect, useRef, useState } from "react";
import styles from "./StationSchematic.module.css";

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: round(cx + r * Math.cos(rad)), y: round(cy + r * Math.sin(rad)) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Shared coordinate system. Both SVG layers use these user units; only
// the core layer's viewport is narrower (see STRUT_CLIP_X).
const VIEW_W = 460;
const VIEW_H = 290;

const DECKS = 6;
const HULL_X = 180;
const HULL_W = 60;
const HULL_H = 200;
const DECK_H = HULL_H / DECKS;
const ARRAY_CX = 300;
const ARRAY_CY = 120;
const WEDGE: [number, number] = [-58, 58];
const ARRAY_RADII = [100, 75, 50];

// The dish's arcs bulge away from the hull, so the part of the array
// nearest the station is the pair of tips on the innermost arc. Deriving
// the strut endpoints from that arc (rather than hardcoding a point in
// front of it) is what makes the struts actually land on the array -
// they previously stopped ~66 units short and read as floating.
const ARRAY_INNER_R = ARRAY_RADII[ARRAY_RADII.length - 1];
const STRUT_TOP = polar(ARRAY_CX, ARRAY_CY, ARRAY_INNER_R, WEDGE[0]);
const STRUT_BOTTOM = polar(ARRAY_CX, ARRAY_CY, ARRAY_INNER_R, WEDGE[1]);

// The hull grows from this point - its right edge, vertically centered,
// where the mounting struts attach - rather than from its own corner, so
// it stays anchored to the (fixed) array instead of drifting as it scales.
const PIVOT_X = HULL_X + HULL_W;
const PIVOT_Y = ARRAY_CY;

const S_TRUE = 0.08;
const S_FULL = 1;

// Each strut is two members that are not rigidly joined.
//
// Part A is station hardware: it lives inside the hull group, so it scales
// with the hull. Part B is dish hardware: a fixed truss on the array,
// never touched.
//
// They line up at TRUE scale, where they are equal halves of one straight
// strut. True scale is the honest picture - a real station moored to a
// real dish - so that is the state where the structure has to make
// physical sense. The operational view is explicitly NOT TO SCALE (the
// hull is inflated 12.5x so its decks are legible), and the struts coming
// apart is what shows it.
//
// Because A rides the hull's transform, at full scale it would grow to
// 12.5x its true length and reach (780.63, -160) - clean off a 460x290
// canvas, crossing straight over the dish on the way. So the hull group is
// wrapped in a clip that ends at the joint and A's surplus length is
// simply not drawn. The visible arm therefore holds a constant 47.65 units
// at a constant -24.82 degrees and rides up with the hull, while the gap
// at the clip line opens from 0 to 27.6.
//
// Neither member ever changes slope. An earlier version drew each strut as
// a single line from the (moving) hull attachment to the (fixed) array
// tip, which pivoted through 16.66 degrees over the morph and read as the
// struts bending.
const STRUT_HULL_DY = 30;

function lerpPoint(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  return { x: round(a.x + (b.x - a.x) * t), y: round(a.y + (b.y - a.y) * t) };
}

// The joint is the midpoint of the strut AS IT IS AT TRUE SCALE. That is
// what makes A and B equal collinear halves in the connected state, and
// what keeps B short - 47.65 units, sitting 43.25 clear of the inflated
// hull's right edge, so it can never read as still being bolted to the
// core the way a joint parked next to the tiny hull did.
function strutJoint(arrayTip: { x: number; y: number }, dy: number) {
  const attachAtTrueScale = { x: PIVOT_X, y: PIVOT_Y + dy * S_TRUE };
  const world = lerpPoint(attachAtTrueScale, arrayTip, 0.5);
  return {
    world,
    // Part A in hull-local coordinates: the hull group is
    // translate(PIVOT) scale(s), so local (lx, ly) renders at
    // (PIVOT_X + s*lx, PIVOT_Y + s*ly). Dividing by S_TRUE puts A's
    // outboard end exactly on the joint at s = S_TRUE.
    local: { x: round((world.x - PIVOT_X) / S_TRUE), y: round((world.y - PIVOT_Y) / S_TRUE) },
  };
}

const STRUT_A_TOP = strutJoint(STRUT_TOP, -STRUT_HULL_DY);
const STRUT_A_BOTTOM = strutJoint(STRUT_BOTTOM, STRUT_HULL_DY);
const JOINT_TOP = STRUT_A_TOP.world;
const JOINT_BOTTOM = STRUT_A_BOTTOM.world;
const JOINT_TOP_LOCAL = STRUT_A_TOP.local;
const JOINT_BOTTOM_LOCAL = STRUT_A_BOTTOM.local;

// The "view limit on the core side" - everything hull-side is drawn only
// up to the joint. Both joints share this x by symmetry.
const STRUT_CLIP_X = JOINT_TOP.x;

const TIMING = {
  fadeIn: 60,
  hold: 7800, // tripled from an earlier 2600ms pass - not enough time to read the callouts otherwise
  fadeOut: 220,
  morph: 1400,
  gap: 260,
};

type Cancelled = { current: boolean };
type SkipRef = { current: (() => void) | null };

// One transform is now the whole of it - the struts' moving halves ride
// inside the hull group rather than being repositioned per frame.
function applyHullScale(s: number, hullGroup: SVGGElement) {
  hullGroup.setAttribute("transform", `translate(${PIVOT_X} ${PIVOT_Y}) scale(${s})`);
}

/** A pause between animation beats. */
function wait(ms: number, cancelled: Cancelled): Promise<void> {
  return new Promise((resolve) => {
    let remaining = ms;
    let last = performance.now();
    function tick(now: number) {
      if (cancelled.current) return resolve();
      remaining -= now - last;
      last = now;
      if (remaining <= 0) resolve();
      else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

/** Same as wait(), but registers itself on skipRef so a click can end it early. */
function waitSkippable(ms: number, cancelled: Cancelled, skipRef: SkipRef): Promise<void> {
  return new Promise((resolve) => {
    let remaining = ms;
    let last = performance.now();
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      skipRef.current = null;
      resolve();
    }
    skipRef.current = finish;
    function tick(now: number) {
      if (cancelled.current || done) return;
      remaining -= now - last;
      last = now;
      if (remaining <= 0) finish();
      else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

function morphHull(
  from: number,
  to: number,
  duration: number,
  cancelled: Cancelled,
  hullGroup: SVGGElement
): Promise<void> {
  return new Promise((resolve) => {
    let elapsed = 0;
    let last = performance.now();
    function frame(now: number) {
      if (cancelled.current) return resolve();
      elapsed += now - last;
      last = now;
      const t = Math.min(1, elapsed / duration);
      applyHullScale(from + (to - from) * easeInOutCubic(t), hullGroup);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

export function StationSchematic({ className = "" }: { className?: string }) {
  const hullGroupRef = useRef<SVGGElement>(null);
  const skipRef = useRef<(() => void) | null>(null);

  const [trueVisible, setTrueVisible] = useState(false);
  const [operationalVisible, setOperationalVisible] = useState(false);

  useEffect(() => {
    const hullGroup = hullGroupRef.current;
    if (!hullGroup) return;

    const cancelled: Cancelled = { current: false };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    async function run(hullGroup: SVGGElement) {
      if (reduceMotion) {
        applyHullScale(S_FULL, hullGroup);
        setOperationalVisible(true);
        return;
      }

      applyHullScale(S_TRUE, hullGroup);
      await wait(TIMING.fadeIn, cancelled);
      if (cancelled.current) return;
      setTrueVisible(true);

      await waitSkippable(TIMING.hold, cancelled, skipRef);
      if (cancelled.current) return;
      setTrueVisible(false);

      await wait(TIMING.fadeOut, cancelled);
      if (cancelled.current) return;
      await morphHull(S_TRUE, S_FULL, TIMING.morph, cancelled, hullGroup);
      if (cancelled.current) return;

      await wait(TIMING.gap, cancelled);
      if (cancelled.current) return;
      setOperationalVisible(true);
    }

    run(hullGroup);
    return () => {
      cancelled.current = true;
      skipRef.current = null;
    };
  }, []);

  function handleStageClick() {
    // Only ever set while the true-scale hold is in progress - a no-op the
    // rest of the time.
    skipRef.current?.();
  }

  return (
    // Two overlaid SVGs rather than one, so the core and the array can be
    // animated independently later. They share a single coordinate system:
    // both are pinned to the same origin at the same height, and the core
    // layer's box width is exactly STRUT_CLIP_X/VIEW_W of the stage, so its
    // viewBox aspect matches its box aspect and a given user unit lands on
    // the same pixel in both layers.
    <div
      className={`${className} ${styles.stage} ${trueVisible ? styles.clickable : ""}`}
      style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
      role="img"
      aria-label="Station schematic"
      onClick={handleStageClick}
    >
      {/* CORE LAYER - the station, and only the station. Its viewport
          deliberately stops at the joint: part A is authored long enough
          to reach (780.63, -160) at full scale, so everything past this
          edge falls outside the viewBox and is never drawn. That is the
          whole trimming mechanism - no clip path, just a narrower view. */}
      <svg
        className={styles.coreLayer}
        viewBox={`0 0 ${STRUT_CLIP_X} ${VIEW_H}`}
        style={{ width: `${(STRUT_CLIP_X / VIEW_W) * 100}%` }}
        aria-hidden="true"
      >
        <defs>
          <filter id="schematic-glow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>

        {/* hull - built once in local coordinates around PIVOT at scale 1
            (identical proportions to the original static schematic); one
            transform attribute, set imperatively via applyHullScale, grows
            it from true relative scale up to this. */}
        <g ref={hullGroupRef} transform={`translate(${PIVOT_X} ${PIVOT_Y}) scale(${S_TRUE})`}>
          {/* strut part A - the station's own mounting arms. Inside the
              group, so they scale with the hull and therefore hold a
              constant world-space angle; their outboard ends meet part B
              exactly at true scale, and the surplus length is trimmed by
              this layer's viewport as the hull inflates. Non-scaling
              stroke for the same reason as the silhouette below. */}
          <line
            x1={0}
            y1={-STRUT_HULL_DY}
            x2={JOINT_TOP_LOCAL.x}
            y2={JOINT_TOP_LOCAL.y}
            stroke="rgba(207,227,242,0.35)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={0}
            y1={STRUT_HULL_DY}
            x2={JOINT_BOTTOM_LOCAL.x}
            y2={JOINT_BOTTOM_LOCAL.y}
            stroke="rgba(207,227,242,0.35)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />

          {/* The silhouette strokes are non-scaling: SVG multiplies
              stroke-width by the group's transform, so at true scale a
              2-unit stroke would render at 2 * 0.08 = 0.16 units - well
              under a pixel, leaving the correctly-sized hull essentially
              invisible. Holding these constant keeps the miniature crisp
              and legible at every point in the growth. Interior detail
              (deck dividers, core dots) is deliberately left scaling, so
              it fades out as the hull shrinks, exactly as real detail
              would at that size. */}
          <rect
            x={-60}
            y={-100}
            width={60}
            height={200}
            rx={14}
            fill="rgba(207,227,242,0.05)"
            stroke="var(--lcars-ice)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          {Array.from({ length: DECKS - 1 }).map((_, i) => {
            const ly = -100 + (i + 1) * DECK_H;
            return <line key={i} x1={-60} y1={ly} x2={0} y2={ly} stroke="rgba(207,227,242,0.25)" strokeWidth={1} />;
          })}
          <line
            x1={-30}
            y1={-94}
            x2={-30}
            y2={94}
            stroke="var(--lcars-amber)"
            strokeWidth={3}
            opacity={0.85}
            filter="url(#schematic-glow)"
            vectorEffect="non-scaling-stroke"
          />
          {Array.from({ length: DECKS }).map((_, i) => (
            <circle key={i} cx={-30} cy={-100 + (i + 0.5) * DECK_H} r={3} fill="#fff8ec" />
          ))}
          <rect
            x={-40}
            y={100}
            width={20}
            height={14}
            rx={3}
            fill="none"
            stroke="var(--lcars-orange)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />

          <g className={`${styles.labelGroup} ${operationalVisible ? styles.visible : ""}`}>
            {Array.from({ length: DECKS }).map((_, i) => (
              <text
                key={i}
                x={-68}
                y={-100 + (i + 0.5) * DECK_H + 3}
                textAnchor="end"
                fontSize={9}
                fill="rgba(207,227,242,0.5)"
                fontFamily="ui-monospace, monospace"
              >
                D{i + 1}
              </text>
            ))}
            <text
              x={-30}
              y={-108}
              textAnchor="middle"
              fontSize={9}
              letterSpacing="0.06em"
              fill="rgba(207,227,242,0.6)"
              fontFamily="ui-monospace, monospace"
            >
              ISOLINEAR CORE
            </text>
          </g>
        </g>
      </svg>

      {/* ARRAY LAYER - the dish, its own fixed truss (part B), and every
          label layer. Full-width viewBox, so callout leaders can run from
          the left-hand label column across to anchors on either side of
          the core/array boundary. Drawn after the core layer, so leaders
          land on top of the hull rather than under it. */}
      <svg className={styles.arrayLayer} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden="true">
        {/* sensor array - fixed size and position throughout; only the hull scales */}
        {ARRAY_RADII.map((r) => (
          <path
            key={r}
            d={arcPath(ARRAY_CX, ARRAY_CY, r, WEDGE[0], WEDGE[1])}
            fill="none"
            stroke="var(--lcars-violet)"
            strokeWidth={2}
            className={styles.arrayArc}
          />
        ))}
        <text
          x={ARRAY_CX + 30}
          y={30}
          textAnchor="middle"
          fontSize={10}
          letterSpacing="0.06em"
          fill="rgba(207,227,242,0.6)"
          fontFamily="ui-monospace, monospace"
        >
          SENSOR ARRAY
        </text>

        {/* strut part B - the dish's own fixed truss. Static markup: never
            repositioned, at any scale. Part A is in the core layer above. */}
        <line
          x1={JOINT_TOP.x}
          y1={JOINT_TOP.y}
          x2={STRUT_TOP.x}
          y2={STRUT_TOP.y}
          stroke="rgba(207,227,242,0.35)"
          strokeWidth={1.5}
        />
        <line
          x1={JOINT_BOTTOM.x}
          y1={JOINT_BOTTOM.y}
          x2={STRUT_BOTTOM.x}
          y2={STRUT_BOTTOM.y}
          stroke="rgba(207,227,242,0.35)"
          strokeWidth={1.5}
        />

        {/* true-scale callouts - anchored to where the hull/struts/core/port
            sit while the hull is still tiny; computed once at S_TRUE, since
            they're only ever shown during that static hold. */}
        <g className={`${styles.labelGroup} ${trueVisible ? styles.visible : ""}`}>
          {/* Anchored to part B's midpoint. At true scale A and B are equal
              halves of one straight strut, so either would do - B is picked
              because it never moves. */}
          <Callout anchor={lerpPoint(JOINT_TOP, STRUT_TOP, 0.5)} labelY={55} lines={["MOUNTING STRUTS"]} />
          <Callout
            anchor={{ x: round(PIVOT_X - 30 * S_TRUE), y: round(PIVOT_Y - 100 * S_TRUE) }}
            labelY={120}
            lines={["HULL", "TRUE RELATIVE SCALE"]}
          />
          <Callout
            anchor={{ x: round(PIVOT_X - 30 * S_TRUE), y: PIVOT_Y }}
            labelY={175}
            lines={["ISOLINEAR CORE"]}
          />
          <Callout
            anchor={{ x: round(PIVOT_X - 30 * S_TRUE), y: round(PIVOT_Y + 100 * S_TRUE) }}
            labelY={230}
            lines={["DOCKING PORT"]}
          />
          <text x={370} y={270} textAnchor="end" fontSize={9.5} fill="rgba(207,227,242,0.4)" fontFamily="ui-monospace, monospace">
            CLICK TO CONTINUE
          </text>
        </g>

        <g className={`${styles.labelGroup} ${operationalVisible ? styles.visible : ""}`}>
          <text
            x={230}
            y={272}
            textAnchor="middle"
            fontSize={10}
            letterSpacing="0.08em"
            fill="rgba(207,227,242,0.4)"
            fontFamily="ui-monospace, monospace"
          >
            SCHEMATIC (NOT TO SCALE)
          </text>
        </g>
      </svg>
    </div>
  );
}

// Callout labels sit in a left-hand column, the diagram sits to their
// right, so every leader has to approach a label from the right and stop
// before reaching it - it must never enter the text's own x-range, or it
// reads as striking through the words rather than pointing at them.
//
// All labels are right-aligned to a shared edge (LABEL_RIGHT) so the
// column has a clean margin for the leaders to meet. Each leader is an
// elbow: a short horizontal run off the label's right edge, then a
// diagonal out to the anchor. The horizontal segment is what makes the
// association with the label unambiguous.
const LABEL_RIGHT = 150;
const ELBOW_X = 195;
const LEADER_GAP = 6;
// Nudge the leader off the text baseline to the visual middle of the
// first line's cap height, so it meets the label centrally instead of
// underlining it.
const LEADER_RISE = 4;

function Callout({
  anchor,
  labelY,
  lines,
}: {
  anchor: { x: number; y: number };
  /** Baseline of the label's first line. */
  labelY: number;
  lines: string[];
}) {
  const leaderY = labelY - LEADER_RISE;
  return (
    <g>
      <line
        x1={LABEL_RIGHT + LEADER_GAP}
        y1={leaderY}
        x2={ELBOW_X}
        y2={leaderY}
        stroke="rgba(204,230,255,0.28)"
        strokeWidth={1}
      />
      <line x1={ELBOW_X} y1={leaderY} x2={anchor.x} y2={anchor.y} stroke="rgba(204,230,255,0.28)" strokeWidth={1} />
      <circle cx={anchor.x} cy={anchor.y} r={2.5} fill="var(--lcars-violet)" />
      <text
        x={LABEL_RIGHT}
        y={labelY}
        textAnchor="end"
        fontSize={11}
        fill="rgba(204,230,255,0.55)"
        fontFamily="ui-monospace, monospace"
        letterSpacing="0.05em"
      >
        {lines.map((line, i) => (
          <tspan
            key={i}
            x={LABEL_RIGHT}
            dy={i === 0 ? 0 : 13}
            fill={i === 0 ? "var(--lcars-ice)" : undefined}
            fontWeight={i === 0 ? 600 : undefined}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}
