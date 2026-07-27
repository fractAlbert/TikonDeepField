"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { orthogonalDistanceSigned } from "@/lib/grid";
import { playButtonClick, playSweepPing } from "@/lib/sound";
import styles from "./RelativeDistanceScope.module.css";

export interface ScopeSignature {
  id: string;
  label: string;
  color: string;
  ring: number;
  seg: number;
}

const VISIBILITY_RANGE = 5;
// The glow falloff reaches half a distance-tick's spacing on either side of
// a blip's true position, so a blip at value 2 is fully faded by 1.5 and
// fully gone again by 2.5 - never bleeding into a neighboring tick.
const FADE_WIDTH_TICKS = 0.5;

// Single-sided readout: REF sits right on the left edge, and the axis runs
// outward from there in *absolute* distance only - no clockwise/
// counterclockwise side to it at all, so a signature 2 clockwise and one 2
// counterclockwise land in the exact same spot.
const REF_POS = 0;
const AXIS_END = 95;
const AXIS_SPAN = AXIS_END - REF_POS;

interface PositionedBlip {
  id: string;
  label: string;
  color: string;
  pos: number; // percentage, REF_POS..AXIS_END
}

export function RelativeDistanceScope({
  signatures,
  visible,
}: {
  signatures: ScopeSignature[];
  /** Whether this scope is actually on screen right now - the sweep clock
      keeps running while hidden (background panel), but sound should not. */
  visible: boolean;
}) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const sweepLineRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const coreEls = useRef<Record<string, HTMLDivElement | null>>({});
  const labelEls = useRef<Record<string, HTMLDivElement | null>>({});
  const startTime = useRef(0);
  const rafId = useRef(0);
  const pingedThisCycle = useRef<Set<string>>(new Set());
  const lastCycle = useRef(-1);

  const [refId, setRefId] = useState(signatures[0]?.id ?? "");
  const [periodMs, setPeriodMs] = useState(6000);

  const periodRef = useRef(periodMs);
  useEffect(() => {
    periodRef.current = periodMs;
  }, [periodMs]);

  const visibleRef = useRef(visible);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  // If the signature list changes (region switch) and the stored refId no
  // longer matches anyone, fall back to the first signature - computed
  // fresh each render, so there's no state to keep in sync and no need to
  // "reset" anything when the region changes.
  const ref = signatures.find((s) => s.id === refId) ?? signatures[0];

  const blips: PositionedBlip[] = useMemo(() => {
    if (!ref) return [];
    return signatures
      .filter((s) => s.id !== ref.id)
      .map((s) => ({ s, dist: Math.abs(orthogonalDistanceSigned(ref, s)) }))
      .filter(({ dist }) => dist <= VISIBILITY_RANGE)
      .map(({ s, dist }) => ({
        id: s.id,
        label: s.label,
        color: s.color,
        pos: REF_POS + (dist / VISIBILITY_RANGE) * AXIS_SPAN,
      }));
  }, [signatures, ref]);

  const blipsRef = useRef(blips);
  useEffect(() => {
    blipsRef.current = blips;
  }, [blips]);

  const ticks = useMemo(() => {
    const arr: number[] = [];
    for (let n = 0; n <= VISIBILITY_RANGE; n++) arr.push(n);
    return arr;
  }, []);

  // Runs once for the component's lifetime - stays mounted (just hidden)
  // when you switch panels, so the clock keeps advancing in the background.
  useEffect(() => {
    startTime.current = performance.now();

    function frame() {
      const elapsed = performance.now() - startTime.current;
      const period = periodRef.current;
      const cycle = Math.floor(elapsed / period);
      const within = elapsed - cycle * period;
      const t = within / period; // 0..1

      if (cycle !== lastCycle.current) {
        lastCycle.current = cycle;
        pingedThisCycle.current.clear();
      }

      const fadeWidth = (AXIS_SPAN / VISIBILITY_RANGE) * FADE_WIDTH_TICKS;

      // One line, and it's the actual detector - what you see is what's
      // revealing blips, nothing decorative running separately from it.
      // It crosses the baseline once per cycle, alternating direction cycle
      // to cycle (left-to-right, then right-to-left) - overshooting the
      // last real tick by the same half-tick margin the fade uses, so it
      // doesn't look like it's slamming to a stop right on top of the
      // farthest possible blip. Clamped so that overshoot can never push it
      // past the container's own right edge, where it'd get clipped and
      // vanish instead of just sitting past the last tick.
      const sweepEnd = Math.min(AXIS_END + fadeWidth, 99);
      const sweepingRight = cycle % 2 === 0;
      const detectorPos = sweepingRight
        ? REF_POS + t * (sweepEnd - REF_POS)
        : sweepEnd - t * (sweepEnd - REF_POS);

      if (sweepLineRef.current) sweepLineRef.current.style.left = `${detectorPos}%`;
      if (trailRef.current) {
        const trail = trailRef.current;
        if (sweepingRight) {
          trail.style.left = `${REF_POS}%`;
          trail.style.width = `${detectorPos - REF_POS}%`;
          trail.style.background = "linear-gradient(90deg, transparent, rgba(255,207,122,0.14))";
        } else {
          trail.style.left = `${detectorPos}%`;
          trail.style.width = `${sweepEnd - detectorPos}%`;
          trail.style.background = "linear-gradient(270deg, transparent, rgba(255,207,122,0.14))";
        }
      }

      blipsRef.current.forEach((b) => {
        const dist = Math.abs(b.pos - detectorPos);
        const opacity = Math.max(0, 1 - dist / fadeWidth);
        const core = coreEls.current[b.id];
        const label = labelEls.current[b.id];
        if (core) {
          core.style.opacity = String(opacity);
          core.style.transform = `scale(${0.7 + opacity * 0.9})`;
          core.style.boxShadow =
            opacity > 0.03
              ? `0 0 ${opacity * 16}px ${opacity * 4}px ${b.color}`
              : "none";
        }
        if (label) label.style.opacity = String(Math.min(1, opacity * 1.4));

        if (opacity > 0.92 && !pingedThisCycle.current.has(b.id)) {
          pingedThisCycle.current.add(b.id);
          if (visibleRef.current) playSweepPing();
        }
      });

      if (readoutRef.current) {
        readoutRef.current.textContent = "CYCLE " + String(cycle).padStart(4, "0");
      }

      rafId.current = requestAnimationFrame(frame);
    }

    rafId.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  if (!ref) return null;

  return (
    <div>
      <div className={styles.refPalette}>
        {signatures.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`${styles.refBtn} ${s.id === ref.id ? styles.active : ""}`}
            onClick={() => {
              playButtonClick();
              setRefId(s.id);
            }}
          >
            <span className={styles.refDot} style={{ background: s.color }} />
            {s.label}
          </button>
        ))}
      </div>

      <div className={styles.scope} ref={scopeRef}>
        <div className={styles.baseline} />
        <div className={styles.distGuides}>
          {ticks
            .filter((n) => n !== 0)
            .map((n) => (
              <div
                key={n}
                className={styles.distLine}
                style={{ left: `${REF_POS + (n / VISIBILITY_RANGE) * AXIS_SPAN}%` }}
              />
            ))}
        </div>
        <div className={styles.centerLine} style={{ left: `${REF_POS}%` }} />
        <div className={styles.trail} ref={trailRef} />
        <div className={styles.sweepLine} ref={sweepLineRef} />

        {blips.map((b) => {
          const style = { left: `${b.pos}%`, "--q-color": b.color } as CSSProperties;
          return (
            <div key={b.id} className={styles.blip} style={style}>
              <div
                className={styles.label}
                ref={(el) => {
                  labelEls.current[b.id] = el;
                }}
              >
                {b.label}
              </div>
              <div
                className={styles.core}
                ref={(el) => {
                  coreEls.current[b.id] = el;
                }}
              />
            </div>
          );
        })}
      </div>

      <div className={styles.distAxis}>
        {ticks.map((n) => (
          <div
            key={n}
            className={`${styles.tick} ${n === 0 ? styles.ref : ""}`}
            style={{ left: `${REF_POS + (n / VISIBILITY_RANGE) * AXIS_SPAN}%` }}
          >
            {n === 0 ? "REF" : n}
          </div>
        ))}
      </div>

      <div className={styles.controls}>
        <div className={styles.control}>
          <span>Sweep period</span>
          <input
            type="range"
            min={2500}
            max={14000}
            step={250}
            value={periodMs}
            onChange={(e) => setPeriodMs(Number(e.target.value))}
          />
          <span className={styles.readout}>{(periodMs / 1000).toFixed(1)}s</span>
        </div>
        <span ref={readoutRef} className={styles.readout}>
          CYCLE 0000
        </span>
        <span className={styles.readout}>
          {blips.length} / {signatures.length - 1} in range
        </span>
      </div>

      <div className={styles.legend}>
        {signatures.map((s) => (
          <div key={s.id} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
