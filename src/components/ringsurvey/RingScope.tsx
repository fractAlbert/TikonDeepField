"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RING_COUNT } from "@/lib/grid";
import { playButtonClick, playSweepPing } from "@/lib/sound";

export interface RingSignature {
  id: string;
  label: string;
  color: string;
  ring: number;
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
// the reading is never ambiguous.
const FADE_RADIUS = RING_THICKNESS * 0.45;

// The gate overshoots the outermost ring before wrapping, so R5 gets a
// clean fade-out instead of the sweep vanishing on top of it.
const SWEEP_END = MAX_R + FADE_RADIUS * 2;

const GATE_COLOR = "rgba(210,216,224,0.55)";
const RING_LINE = "rgba(232,240,247,0.18)";

/**
 * Ring Survey: a range gate walks outward from the field's centre, and the
 * ring holding the selected signature lights as it passes.
 *
 * It reports a **ring and nothing else** - no segment, no bearing - which
 * is what makes it a distinct instrument rather than a second Star Map.
 * That one number turns out to be worth an enormous amount: the dominant
 * failure mode in this field is a signature that can sit one ring out and
 * one segment over with every distance reading unchanged (see
 * docs/win-conditions.md), and knowing the ring kills the ring half of
 * that move outright. It takes the share of regions that cannot be
 * resolved at all from ~19% to ~0%.
 *
 * Animation is a `requestAnimationFrame` loop writing straight to SVG
 * attributes, the same approach the Sweep Scope uses - React never
 * re-renders per frame. Unlike the Sweep Scope this one is free to restart
 * on every visit, since there is no cross-panel clock to preserve: you
 * want to catch a sweep from the beginning, not walk in halfway through.
 */
export function RingScope({
  signatures,
  visible,
}: {
  signatures: RingSignature[];
  visible: boolean;
}) {
  const gateRef = useRef<SVGCircleElement>(null);
  const spokeRef = useRef<SVGLineElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);
  const targetRef = useRef<SVGCircleElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  const [selectedId, setSelectedId] = useState(signatures[0]?.id ?? "");
  const [periodMs, setPeriodMs] = useState(5000);
  // Latched so the answer survives the fade. Watching for the flash is the
  // instrument's character; making you keep watching to remember what it
  // said would just be a memory test.
  const [lastReturn, setLastReturn] = useState<number | null>(null);

  // Recomputed each render rather than reset on region change, same as the
  // Sweep Scope's reference: if the stored id no longer matches anyone,
  // fall back to the first signature and there is no state to sync.
  const selected = signatures.find((s) => s.id === selectedId) ?? signatures[0];

  const periodRef = useRef(periodMs);
  const visibleRef = useRef(visible);
  const targetRingRef = useRef(selected?.ring ?? 0);
  const pingedThisCycle = useRef(false);
  const lastCycle = useRef(-1);

  useEffect(() => {
    periodRef.current = periodMs;
  }, [periodMs]);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);
  useEffect(() => {
    targetRingRef.current = selected?.ring ?? 0;
  }, [selected]);

  // Changing the selection invalidates the latched reading - it belonged to
  // the signature you were looking at before.
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- clearing a
       cached readout in response to a prop-derived change, not deriving
       render output. */
    setLastReturn(null);
  }, [selected]);

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
      const targetR = ringRadius(targetRingRef.current);
      const strength = Math.max(0, 1 - Math.abs(gateR - targetR) / FADE_RADIUS);

      if (gateRef.current) gateRef.current.setAttribute("r", String(Math.max(0.1, gateR)));
      if (spokeRef.current) spokeRef.current.setAttribute("y2", String(CY - gateR));
      if (tipRef.current) tipRef.current.setAttribute("cy", String(CY - gateR));
      if (targetRef.current) {
        const el = targetRef.current;
        el.setAttribute("r", String(targetR));
        el.setAttribute("opacity", String(strength));
        el.setAttribute("stroke-width", String(2 + strength * 7));
      }
      if (readoutRef.current) {
        readoutRef.current.textContent = `R${Math.min(
          RING_COUNT,
          Math.floor((gateR - INNER_HOLE) / RING_THICKNESS) + 1
        )}`.replace(/^R0$/, "--");
      }

      if (strength > 0.9 && !pingedThisCycle.current) {
        pingedThisCycle.current = true;
        if (visibleRef.current) playSweepPing();
        setLastReturn(targetRingRef.current);
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const rings = useMemo(() => Array.from({ length: RING_COUNT }, (_, i) => i), []);

  if (!selected) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {signatures.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              playButtonClick();
              setSelectedId(s.id);
            }}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs cursor-pointer transition-colors ${
              s.id === selected.id
                ? "bg-lcars-teal text-black font-semibold"
                : "bg-lcars-panel text-lcars-ice hover:bg-white/10"
            }`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center">
        <svg viewBox="0 0 320 320" className="w-full max-w-[320px] h-auto">
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
          {rings.map((i) => (
            <text
              key={`label-${i}`}
              x={CX}
              y={CY - ringRadius(i) + 4}
              textAnchor="middle"
              fontSize={10}
              fontFamily="ui-monospace, monospace"
              fill="rgba(198,203,211,0.35)"
            >
              R{i + 1}
            </text>
          ))}

          {/* The return, drawn under the gate so the gate stays readable
              as it crosses it. */}
          <circle
            ref={targetRef}
            cx={CX}
            cy={CY}
            r={ringRadius(selected.ring)}
            fill="none"
            stroke={selected.color}
            strokeWidth={2}
            opacity={0}
            filter="url(#ring-glow)"
          />
          <circle
            cx={CX}
            cy={CY}
            r={ringRadius(selected.ring)}
            fill="none"
            stroke="none"
          />

          {/* The range gate: a bar walking outward from the centre, with a
              faint circle at its current radius so the ring it is crossing
              is unambiguous all the way round rather than only under the
              bar itself. */}
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
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div>
          <div className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50 mb-1">
            Gate radius
          </div>
          <span ref={readoutRef} className="font-mono text-lg text-lcars-ice/70 tabular-nums">
            --
          </span>
        </div>
        <div>
          <div className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50 mb-1">
            Last return
          </div>
          <span
            className="font-mono text-lg tabular-nums"
            style={{ color: lastReturn === null ? "rgba(204,230,255,0.25)" : selected.color }}
          >
            {lastReturn === null ? "--" : `R${lastReturn + 1}`}
          </span>
        </div>
        <label className="flex items-center gap-2 text-xs text-lcars-ice/60">
          <span className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50">
            Sweep period
          </span>
          <input
            type="range"
            min={2000}
            max={12000}
            step={250}
            value={periodMs}
            onChange={(e) => setPeriodMs(Number(e.target.value))}
            className="accent-lcars-teal"
          />
          <span className="font-mono tabular-nums">{(periodMs / 1000).toFixed(1)}s</span>
        </label>
      </div>
    </div>
  );
}
