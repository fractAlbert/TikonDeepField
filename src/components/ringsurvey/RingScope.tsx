"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RING_COUNT } from "@/lib/grid";
import { playSweepPing } from "@/lib/sound";

/** A ring the gate will light, and how many signatures it holds there. */
export interface RingTarget {
  ring: number;
  count: number;
}

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

// How far either side of a ring's mid-radius the return is still visible.
// A little under half a band, so two adjacent rings never glow at once and
// a reading is never ambiguous.
const FADE_RADIUS = RING_THICKNESS * 0.45;

// The gate overshoots the outermost ring before wrapping, so R5 gets a
// clean fade-out instead of the sweep vanishing on top of it.
const SWEEP_END = MAX_R + FADE_RADIUS * 2;

const GATE_COLOR = "rgba(210,216,224,0.55)";
const RING_LINE = "rgba(232,240,247,0.18)";

/**
 * A range gate walks outward from the field's centre; the rings named by
 * `targets` light as it crosses them, then fade.
 *
 * Deliberately agnostic about *what* was selected. The caller decides
 * whether a target means "the ring holding this signature" or "a ring
 * holding one of this type" - which is the whole comparison the prototype
 * exists to make, and the two variants are far apart in what they cost the
 * puzzle (see docs/backlog.md).
 *
 * Animation is a `requestAnimationFrame` loop writing straight to SVG
 * attributes, the same approach the Sweep Scope uses - React never
 * re-renders per frame.
 */
export function RingScope({
  targets,
  color,
  /** Changing this clears the latched readout - it belonged to the old selection. */
  selectionKey,
  showCounts = false,
  visible,
}: {
  targets: RingTarget[];
  color: string;
  selectionKey: string;
  showCounts?: boolean;
  visible: boolean;
}) {
  const gateRef = useRef<SVGCircleElement>(null);
  const spokeRef = useRef<SVGLineElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);
  const ringEls = useRef<(SVGCircleElement | null)[]>([]);
  const countEls = useRef<(SVGTextElement | null)[]>([]);

  const [periodMs, setPeriodMs] = useState(5000);
  // Latched so the answer survives the fade. Watching for the flash is the
  // instrument's character; making you keep watching to remember what it
  // said would just be a memory test.
  const [lastReturn, setLastReturn] = useState<RingTarget[] | null>(null);

  const periodRef = useRef(periodMs);
  const visibleRef = useRef(visible);
  const targetsRef = useRef(targets);
  const pingedThisCycle = useRef(false);
  const lastCycle = useRef(-1);

  useEffect(() => {
    periodRef.current = periodMs;
  }, [periodMs]);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);
  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- clearing a
       cached readout in response to a changed selection, not deriving
       render output from props. */
    setLastReturn(null);
  }, [selectionKey]);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;

    function frame() {
      const elapsed = performance.now() - start;
      const period = periodRef.current;
      const cycle = Math.floor(elapsed / period);
      const t = (elapsed - cycle * period) / period; // 0..1

      if (cycle !== lastCycle.current) {
        lastCycle.current = cycle;
        pingedThisCycle.current = false;
      }

      const gateR = t * SWEEP_END;
      if (gateRef.current) gateRef.current.setAttribute("r", String(Math.max(0.1, gateR)));
      if (spokeRef.current) spokeRef.current.setAttribute("y2", String(CY - gateR));
      if (tipRef.current) tipRef.current.setAttribute("cy", String(CY - gateR));

      let peak = 0;
      for (let ring = 0; ring < RING_COUNT; ring++) {
        const hit = targetsRef.current.find((tgt) => tgt.ring === ring);
        const strength = hit
          ? Math.max(0, 1 - Math.abs(gateR - ringRadius(ring)) / FADE_RADIUS)
          : 0;
        peak = Math.max(peak, strength);
        const el = ringEls.current[ring];
        if (el) {
          el.setAttribute("opacity", String(strength));
          el.setAttribute("stroke-width", String(2 + strength * 7));
        }
        const label = countEls.current[ring];
        if (label) label.setAttribute("opacity", String(Math.min(1, strength * 1.3)));
      }

      if (peak > 0.9 && !pingedThisCycle.current) {
        pingedThisCycle.current = true;
        if (visibleRef.current) playSweepPing();
      }
      // Latch once the gate has run past everything, so a multi-ring return
      // is recorded whole rather than one ring at a time.
      if (t > 0.97 && targetsRef.current.length > 0) setLastReturn(targetsRef.current);

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const rings = useMemo(() => Array.from({ length: RING_COUNT }, (_, i) => i), []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center">
        <svg viewBox="0 0 320 320" className="w-full max-w-[300px] h-auto">
          <defs>
            <filter id="ring-glow" x="-50%" y="-50%" width="200%" height="200%">
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
              on top of anything placed there. */}
          {rings.map((i) => (
            <text
              key={`label-${i}`}
              x={CX - ringRadius(i)}
              y={CY + 4}
              textAnchor="middle"
              /* User units, not pixels: the 320-unit viewBox renders around
                 300px here, so this paints at roughly 12px. The Star Map
                 hit the same trap with a value of 10 - see the label-size
                 trial in this panel. */
              fontSize={13}
              fontFamily="ui-monospace, monospace"
              fill="rgba(198,203,211,0.45)"
            >
              R{i + 1}
            </text>
          ))}

          {/* One highlight per ring, all present and all at zero opacity -
              the loop just turns them up. Keeping them mounted means the
              rAF loop never touches the DOM structure, only attributes. */}
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
              filter="url(#ring-glow)"
            />
          ))}

          {/* The range gate: a bar walking outward from the centre, plus a
              faint circle at its current radius so the ring it is crossing
              is unambiguous all the way round, not just under the bar. */}
          <circle
            ref={gateRef}
            cx={CX}
            cy={CY}
            r={0.1}
            fill="none"
            stroke={GATE_COLOR}
            strokeWidth={1}
            opacity={0.4}
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
          />
          <circle ref={tipRef} cx={CX} cy={CY} r={3.5} fill="#e8f0f7" />
          <circle cx={CX} cy={CY} r={2} fill="rgba(232,240,247,0.5)" />

          {/* Return counts, only meaningful when a ring can hold more than
              one of what was selected. */}
          {showCounts &&
            rings.map((i) => {
              const hit = targets.find((t) => t.ring === i);
              return (
                <text
                  key={`count-${i}`}
                  ref={(el) => {
                    countEls.current[i] = el;
                  }}
                  x={CX + ringRadius(i)}
                  y={CY + 4}
                  textAnchor="middle"
                  fontSize={13}
                  fontFamily="ui-monospace, monospace"
                  fontWeight="bold"
                  fill={color}
                  opacity={0}
                >
                  {hit ? `x${hit.count}` : ""}
                </text>
              );
            })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div>
          <div className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50 mb-0.5">
            Last return
          </div>
          <span
            className="font-mono text-sm tabular-nums"
            style={{ color: lastReturn === null ? "rgba(204,230,255,0.25)" : color }}
          >
            {lastReturn === null || lastReturn.length === 0
              ? "--"
              : lastReturn
                  .slice()
                  .sort((a, b) => a.ring - b.ring)
                  .map((t) => `R${t.ring + 1}${showCounts && t.count > 1 ? `x${t.count}` : ""}`)
                  .join("  ")}
          </span>
        </div>
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
      </div>
    </div>
  );
}
