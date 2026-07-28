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

const DECKS = 6;
const HULL_X = 180;
const HULL_W = 60;
const HULL_H = 200;
const DECK_H = HULL_H / DECKS;
const ARRAY_CX = 300;
const ARRAY_CY = 120;
const WEDGE: [number, number] = [-58, 58];

// The hull grows from this point - its right edge, vertically centered,
// where the mounting struts attach - rather than from its own corner, so
// it stays anchored to the (fixed) array instead of drifting as it scales.
const PIVOT_X = HULL_X + HULL_W;
const PIVOT_Y = ARRAY_CY;

// Small enough to read as "dwarfed," but not so small that the hull's own
// top/center/bottom callout anchors (HULL, ISOLINEAR CORE, DOCKING PORT)
// collapse into an indistinguishable cluster - at 200 units tall, S_TRUE
// needs to keep at least a few dozen units between them to read as three
// separate points once rendered, rather than one tangled knot of leader
// lines.
const S_TRUE = 0.2;
const S_FULL = 1;

const TIMING = {
  fadeIn: 60,
  hold: 7800, // tripled from an earlier 2600ms pass - not enough time to read the callouts otherwise
  fadeOut: 220,
  morph: 1400,
  gap: 260,
};

type Cancelled = { current: boolean };
type SkipRef = { current: (() => void) | null };

function applyHullScale(s: number, hullGroup: SVGGElement, strut1: SVGLineElement, strut2: SVGLineElement) {
  hullGroup.setAttribute("transform", `translate(${PIVOT_X} ${PIVOT_Y}) scale(${s})`);
  strut1.setAttribute("x1", String(PIVOT_X));
  strut1.setAttribute("y1", String(round(PIVOT_Y - 30 * s)));
  strut2.setAttribute("x1", String(PIVOT_X));
  strut2.setAttribute("y1", String(round(PIVOT_Y + 30 * s)));
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
  hullGroup: SVGGElement,
  strut1: SVGLineElement,
  strut2: SVGLineElement
): Promise<void> {
  return new Promise((resolve) => {
    let elapsed = 0;
    let last = performance.now();
    function frame(now: number) {
      if (cancelled.current) return resolve();
      elapsed += now - last;
      last = now;
      const t = Math.min(1, elapsed / duration);
      applyHullScale(from + (to - from) * easeInOutCubic(t), hullGroup, strut1, strut2);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

export function StationSchematic({ className = "" }: { className?: string }) {
  const hullGroupRef = useRef<SVGGElement>(null);
  const strut1Ref = useRef<SVGLineElement>(null);
  const strut2Ref = useRef<SVGLineElement>(null);
  const skipRef = useRef<(() => void) | null>(null);

  const [trueVisible, setTrueVisible] = useState(false);
  const [operationalVisible, setOperationalVisible] = useState(false);

  useEffect(() => {
    const hullGroup = hullGroupRef.current;
    const strut1 = strut1Ref.current;
    const strut2 = strut2Ref.current;
    if (!hullGroup || !strut1 || !strut2) return;

    const cancelled: Cancelled = { current: false };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    async function run(hullGroup: SVGGElement, strut1: SVGLineElement, strut2: SVGLineElement) {
      if (reduceMotion) {
        applyHullScale(S_FULL, hullGroup, strut1, strut2);
        setOperationalVisible(true);
        return;
      }

      applyHullScale(S_TRUE, hullGroup, strut1, strut2);
      await wait(TIMING.fadeIn, cancelled);
      if (cancelled.current) return;
      setTrueVisible(true);

      await waitSkippable(TIMING.hold, cancelled, skipRef);
      if (cancelled.current) return;
      setTrueVisible(false);

      await wait(TIMING.fadeOut, cancelled);
      if (cancelled.current) return;
      await morphHull(S_TRUE, S_FULL, TIMING.morph, cancelled, hullGroup, strut1, strut2);
      if (cancelled.current) return;

      await wait(TIMING.gap, cancelled);
      if (cancelled.current) return;
      setOperationalVisible(true);
    }

    run(hullGroup, strut1, strut2);
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
    <svg
      viewBox="0 0 460 290"
      className={`${className} ${trueVisible ? styles.clickable : ""}`}
      role="img"
      aria-label="Station schematic"
      onClick={handleStageClick}
    >
      <defs>
        <filter id="schematic-glow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      {/* sensor array - fixed size and position throughout; only the hull scales */}
      {[100, 75, 50].map((r) => (
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

      {/* struts - the array-side end is fixed; the hull-side end scales
          with the hull group, so they're updated imperatively instead of
          living inside it */}
      <line ref={strut1Ref} x2={ARRAY_CX - 40} y2={ARRAY_CY - 50} stroke="rgba(207,227,242,0.35)" strokeWidth={1.5} />
      <line ref={strut2Ref} x2={ARRAY_CX - 40} y2={ARRAY_CY + 50} stroke="rgba(207,227,242,0.35)" strokeWidth={1.5} />

      {/* hull - built once in local coordinates around PIVOT at scale 1
          (identical proportions to the original static schematic); one
          transform attribute, set imperatively via applyHullScale, grows
          it from true relative scale up to this. */}
      <g ref={hullGroupRef} transform={`translate(${PIVOT_X} ${PIVOT_Y}) scale(${S_TRUE})`}>
        <rect x={-60} y={-100} width={60} height={200} rx={14} fill="rgba(207,227,242,0.05)" stroke="var(--lcars-ice)" strokeWidth={2} />
        {Array.from({ length: DECKS - 1 }).map((_, i) => {
          const ly = -100 + (i + 1) * DECK_H;
          return <line key={i} x1={-60} y1={ly} x2={0} y2={ly} stroke="rgba(207,227,242,0.25)" strokeWidth={1} />;
        })}
        <line x1={-30} y1={-94} x2={-30} y2={94} stroke="var(--lcars-amber)" strokeWidth={3} opacity={0.85} filter="url(#schematic-glow)" />
        {Array.from({ length: DECKS }).map((_, i) => (
          <circle key={i} cx={-30} cy={-100 + (i + 0.5) * DECK_H} r={3} fill="#fff8ec" />
        ))}
        <rect x={-40} y={100} width={20} height={14} rx={3} fill="none" stroke="var(--lcars-orange)" strokeWidth={2} />

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

      {/* true-scale callouts - anchored to where the hull/struts/core/port
          sit while the hull is still tiny; computed once at S_TRUE, since
          they're only ever shown during that static hold. */}
      <g className={`${styles.labelGroup} ${trueVisible ? styles.visible : ""}`}>
        <Callout
          anchor={{
            x: round((PIVOT_X + (ARRAY_CX - 40)) / 2),
            y: round((PIVOT_Y - 30 * S_TRUE + (ARRAY_CY - 50)) / 2),
          }}
          textPos={{ x: 10, y: 55 }}
          lines={["MOUNTING STRUTS"]}
        />
        <Callout
          anchor={{ x: round(PIVOT_X - 30 * S_TRUE), y: round(PIVOT_Y - 100 * S_TRUE) }}
          textPos={{ x: 10, y: 120 }}
          lines={["HULL", "TRUE RELATIVE SCALE"]}
        />
        <Callout
          anchor={{ x: round(PIVOT_X - 30 * S_TRUE), y: PIVOT_Y }}
          textPos={{ x: 10, y: 175 }}
          lines={["ISOLINEAR CORE"]}
        />
        <Callout
          anchor={{ x: round(PIVOT_X - 30 * S_TRUE), y: round(PIVOT_Y + 100 * S_TRUE) }}
          textPos={{ x: 10, y: 230 }}
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
  );
}

function Callout({
  anchor,
  textPos,
  lines,
}: {
  anchor: { x: number; y: number };
  textPos: { x: number; y: number };
  lines: string[];
}) {
  return (
    <g>
      <line x1={anchor.x} y1={anchor.y} x2={textPos.x} y2={textPos.y} stroke="rgba(204,230,255,0.28)" strokeWidth={1} />
      <circle cx={anchor.x} cy={anchor.y} r={2.5} fill="var(--lcars-violet)" />
      <text
        x={textPos.x + 8}
        y={textPos.y - 6}
        fontSize={11}
        fill="rgba(204,230,255,0.55)"
        fontFamily="ui-monospace, monospace"
        letterSpacing="0.05em"
      >
        {lines.map((line, i) => (
          <tspan
            key={i}
            x={textPos.x + 8}
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
