"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RING_COUNT } from "@/lib/grid";
import { playSweepPing } from "@/lib/sound";

/**
 * How the census is presented. The information is identical in all three -
 * how many signatures sit in each ring - so this is purely a question of
 * what it feels like to read, which is what the prototype is for.
 */
export type RingScopeMode = "sweep" | "accumulate" | "static";

// Geometry, in SVG user units. Deliberately the same shape as the Star
// Map's dial (concentric bands around a small hole) so the two read as the
// same field - but with no segment divisions at all, because the segment
// is exactly what this instrument does not measure.
const CX = 160;
const CY = 160;
const INNER_HOLE = 26;
const MAX_R = 140;
const RING_THICKNESS = (MAX_R - INNER_HOLE) / RING_COUNT;

/** Mid-radius of a ring band - where the range gate "crosses" it. */
function ringRadius(ring: number): number {
  return INNER_HOLE + (ring + 0.5) * RING_THICKNESS;
}

// How far either side of a ring's mid-radius a return is still visible. A
// little under half a band, so two adjacent rings never glow at once and a
// reading is never ambiguous.
const FADE_RADIUS = RING_THICKNESS * 0.45;

// The gate overshoots the outermost ring before wrapping, so R5 gets a
// clean fade-out instead of the sweep vanishing on top of it.
const SWEEP_END = MAX_R + FADE_RADIUS * 2;

// What a ring already crossed settles back to in `accumulate` mode: dim
// enough to read as history rather than a live return, bright enough that
// the finished census is legible at a glance.
const SETTLED_OPACITY = 0.4;

const GATE_COLOR = "rgba(210,216,224,0.55)";
const RING_LINE = "rgba(232,240,247,0.18)";
const LABEL_FILL = "rgba(198,203,211,0.45)";

/**
 * The dial itself: a range gate walking outward, lighting the rings named
 * by `counts`.
 *
 * Shared by two callers with opposite meanings, which is why it takes
 * counts rather than anything semantic. `RingScanPanel` (shipped) passes a
 * single ring and hides the numbers - a targeted return. The census
 * prototype passes a headcount per ring. Only the first survived the
 * design call on 2026-08-01: a census reads identically for every player,
 * so it lowers the loss rate for everyone and measures nothing, while two
 * metered scans leave a careful player at ~1% unsolvable and a careless
 * one at ~11%. See docs/instrument-analysis.md.
 *
 * Animation is a `requestAnimationFrame` loop writing straight to SVG
 * attributes, the same approach the Sweep Scope uses - React never
 * re-renders per frame.
 */
export function RingScope({
  /** Signatures per ring, innermost first. Length must be RING_COUNT. */
  counts,
  color,
  mode,
  visible,
  /**
   * False for a targeted scan, where the ring lighting up *is* the answer
   * and a "1" beside it would only be noise.
   */
  showCounts = true,
  /** Hidden for a targeted scan, which has its own readout. */
  showReadout = true,
}: {
  counts: number[];
  color: string;
  mode: RingScopeMode;
  visible: boolean;
  showCounts?: boolean;
  showReadout?: boolean;
}) {
  const gateRef = useRef<SVGCircleElement>(null);
  const spokeRef = useRef<SVGLineElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);
  const ringEls = useRef<(SVGCircleElement | null)[]>([]);
  const countEls = useRef<(SVGTextElement | null)[]>([]);

  const [periodMs, setPeriodMs] = useState(5000);

  const periodRef = useRef(periodMs);
  const countsRef = useRef(counts);
  const modeRef = useRef(mode);
  const visibleRef = useRef(visible);
  const pingedThisCycle = useRef<Set<number>>(new Set());
  const lastCycle = useRef(-1);

  useEffect(() => {
    periodRef.current = periodMs;
  }, [periodMs]);
  useEffect(() => {
    countsRef.current = counts;
  }, [counts]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const rings = useMemo(() => Array.from({ length: RING_COUNT }, (_, i) => i), []);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();

    function frame() {
      const animated = modeRef.current !== "static";
      // Static mode parks the gate past the outer edge, so every ring reads
      // as already crossed and nothing moves.
      const gateR = animated
        ? (((performance.now() - start) % periodRef.current) / periodRef.current) * SWEEP_END
        : SWEEP_END;

      if (animated) {
        const cycle = Math.floor((performance.now() - start) / periodRef.current);
        if (cycle !== lastCycle.current) {
          lastCycle.current = cycle;
          pingedThisCycle.current.clear();
        }
      }

      if (gateRef.current)
        gateRef.current.setAttribute("r", String(animated ? Math.max(0.1, gateR) : 0.1));
      if (spokeRef.current)
        spokeRef.current.setAttribute("y2", String(animated ? CY - gateR : CY));
      if (tipRef.current) tipRef.current.setAttribute("cy", String(animated ? CY - gateR : CY));

      for (let ring = 0; ring < RING_COUNT; ring++) {
        const occupied = (countsRef.current[ring] ?? 0) > 0;
        const live = occupied
          ? Math.max(0, 1 - Math.abs(gateR - ringRadius(ring)) / FADE_RADIUS)
          : 0;
        // Only `sweep` forgets. The other two keep what the gate has
        // already passed, so one pass leaves a readable census behind.
        const settled =
          modeRef.current !== "sweep" && occupied && gateR > ringRadius(ring) + FADE_RADIUS
            ? SETTLED_OPACITY
            : 0;
        const strength = Math.max(live, settled);

        const el = ringEls.current[ring];
        if (el) {
          el.setAttribute("opacity", String(strength));
          el.setAttribute("stroke-width", String(2 + live * 7));
        }
        const label = countEls.current[ring];
        if (label) {
          // Counts stay fully legible once settled - a census you have to
          // squint at defeats the point.
          label.setAttribute("opacity", String(Math.max(Math.min(1, live * 1.3), settled * 2.4)));
        }

        if (animated && live > 0.9 && !pingedThisCycle.current.has(ring)) {
          pingedThisCycle.current.add(ring);
          if (visibleRef.current) playSweepPing();
        }
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center">
        <svg viewBox="0 0 320 320" className="w-full max-w-[300px] h-auto">
          <defs>
            <filter id="ring-census-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          {/* The field: bands only, no segment spokes. */}
          <circle cx={CX} cy={CY} r={INNER_HOLE} fill="none" stroke={RING_LINE} />
          {rings.map((i) => (
            <circle
              key={i}
              cx={CX}
              cy={CY}
              r={INNER_HOLE + (i + 1) * RING_THICKNESS}
              fill="none"
              stroke={RING_LINE}
            />
          ))}

          {/* Labels on the left radius and counts on the right, because the
              gate's bar walks straight up the vertical axis and would sit
              on top of anything placed there. Sizes are in user units: the
              320-unit viewBox renders near 300px, so 13 paints at ~12px -
              the Star Map hit exactly this trap with a value of 10. */}
          {rings.map((i) => (
            <text
              key={`label-${i}`}
              x={CX - ringRadius(i)}
              y={CY + 4}
              textAnchor="middle"
              fontSize={13}
              fontFamily="ui-monospace, monospace"
              fill={LABEL_FILL}
            >
              R{i + 1}
            </text>
          ))}

          {rings.map((i) => (
            <circle
              key={`hit-${i}`}
              ref={(el) => {
                ringEls.current[i] = el;
              }}
              cx={CX}
              cy={CY}
              r={ringRadius(i)}
              fill="none"
              stroke={color}
              strokeWidth={2}
              opacity={0}
              filter="url(#ring-census-glow)"
            />
          ))}

          <circle
            ref={gateRef}
            cx={CX}
            cy={CY}
            r={0.1}
            fill="none"
            stroke={GATE_COLOR}
            strokeWidth={1}
            opacity={mode === "static" ? 0 : 0.4}
          />
          <line
            ref={spokeRef}
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY}
            stroke={GATE_COLOR}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={mode === "static" ? 0 : 1}
          />
          <circle
            ref={tipRef}
            cx={CX}
            cy={CY}
            r={3.5}
            fill="#e8f0f7"
            opacity={mode === "static" ? 0 : 1}
          />
          <circle cx={CX} cy={CY} r={2} fill="rgba(232,240,247,0.5)" />

          {showCounts && rings.map((i) => (
            <text
              key={`count-${i}`}
              ref={(el) => {
                countEls.current[i] = el;
              }}
              x={CX + ringRadius(i)}
              y={CY + 5}
              textAnchor="middle"
              fontSize={15}
              fontFamily="ui-monospace, monospace"
              fontWeight="bold"
              fill={color}
              opacity={0}
            >
              {counts[i] ?? 0}
            </text>
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {showReadout && (
        <div>
          <div className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50 mb-0.5">
            Census
          </div>
          {/* nowrap so the five readings stay on one line - broken across
              two they stop reading as a single census. */}
          <span className="font-mono text-sm tabular-nums whitespace-nowrap" style={{ color }}>
            {counts.map((c, i) => `R${i + 1}:${c}`).join("  ")}
          </span>
          <span className="font-mono text-sm text-lcars-ice/40 ml-2">{total} total</span>
        </div>
        )}
        {mode !== "static" && (
          <label className="flex items-center gap-2 text-xs text-lcars-ice/60">
            <span className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50">Period</span>
            <input
              type="range"
              min={2000}
              max={12000}
              step={250}
              value={periodMs}
              onChange={(e) => setPeriodMs(Number(e.target.value))}
              className="accent-lcars-teal w-24"
            />
            <span className="font-mono tabular-nums">{(periodMs / 1000).toFixed(1)}s</span>
          </label>
        )}
      </div>
    </div>
  );
}

/**
 * The same census with no dial at all - one LCARS bar per ring, length
 * proportional to the headcount.
 *
 * Here to be argued against. It is the most legible of the options and the
 * least characterful, and it throws away the one thing the dial gives for
 * free: rings *are* radial, so a reader can map a count onto the Star Map
 * without translating anything.
 */
export function RingCensusLadder({ counts, color }: { counts: number[]; color: string }) {
  const max = Math.max(1, ...counts);
  return (
    <div className="flex flex-col gap-1.5">
      {counts.map((count, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-lcars-ice/50 w-6 shrink-0">R{i + 1}</span>
          <div className="flex-1 h-5 bg-black/40 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${(count / max) * 100}%`,
                backgroundColor: color,
                opacity: count === 0 ? 0 : 1,
              }}
            />
          </div>
          <span
            className="font-mono text-sm tabular-nums w-4 shrink-0 text-right"
            style={{ color: count === 0 ? "rgba(204,230,255,0.25)" : color }}
          >
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}
