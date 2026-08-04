"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { orthogonalDistanceSigned } from "@/lib/grid";
import { playButtonClick, playSweepPing } from "@/lib/sound";
import { QuasarStar } from "@/components/QuasarStar";
import { QuasarGlyph } from "@/lib/quasar-glyph";
import styles from "./RelativeDistanceScope.module.css";

export interface ScopeSignature {
  id: string;
  label: string;
  color: string;
  /** Shape, the identity channel that survives two adjacent palette hues. */
  glyph: QuasarGlyph;
  ring: number;
  seg: number;
  /**
   * Already placed on the Star Map, which dims it in the reference palette
   * and the legend. Only ever a note about the board - it changes nothing
   * about what the scope will read for you.
   */
  placed?: boolean;
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

// Absolute distance means ties are routine, not exceptional: anything 2
// clockwise and anything 2 counterclockwise are both simply "2 away", so
// they share an axis position exactly. Stacked at the same height they
// rendered as one blip with overlapping labels, so a tie is fanned out
// vertically instead. The scope has room to give - and grows if a
// particular tie needs more than the default height allows.
const BLIP_ROW_GAP = 42;
// Sized so a 4-deep tie - which needs 3*42 + 80 = 206 - fits without the
// panel resizing at all. Regions run 6-8 signatures, so 4 sharing a single
// distance is already an unusual reading; anything deeper still grows, it
// just stops being the common case.
const SCOPE_MIN_HEIGHT = 210;
// Enough headroom for the topmost label (18px above its core, plus the
// text itself) and the bottom-most core, so a fanned stack never clips
// against the scope's edges.
const SCOPE_PADDING = 80;

interface PositionedBlip {
  id: string;
  label: string;
  color: string;
  glyph: QuasarGlyph;
  pos: number; // percentage, REF_POS..AXIS_END
  dy: number; // px offset from the baseline, to separate equal distances
}

export function RelativeDistanceScope({
  signatures,
  visible,
  onReference,
}: {
  signatures: ScopeSignature[];
  /** Whether this scope is actually on screen right now - the sweep clock
      keeps running while hidden (background panel), but sound should not. */
  visible: boolean;
  /**
   * Fired for whichever signature is the current reference, including the
   * one picked by default - every distance from it is on screen, so it
   * counts as observed whether or not the player clicked to get there.
   */
  onReference?: (id: string) => void;
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

  // Held in a ref because callers pass an inline arrow, so its identity
  // changes every render - depending on it directly would fire the effect
  // below on every render rather than on an actual reference change.
  const onReferenceRef = useRef(onReference);
  useEffect(() => {
    onReferenceRef.current = onReference;
  }, [onReference]);

  const refId2 = ref?.id;
  useEffect(() => {
    if (!refId2) return;
    onReferenceRef.current?.(refId2);
    // Restart the sweep from the left on every new reference. Picking a
    // reference is asking for a reading, and walking in halfway through one
    // means waiting out the rest of a pass that was measuring something
    // else. This is the same reasoning AppShell already applies by deferring
    // the scope's first mount until you actually visit the panel.
    startTime.current = performance.now();
    lastCycle.current = -1;
    pingedThisCycle.current.clear();
  }, [refId2]);

  const blips: PositionedBlip[] = useMemo(() => {
    if (!ref) return [];
    const inRange = signatures
      .filter((s) => s.id !== ref.id)
      .map((s) => ({ s, dist: Math.abs(orthogonalDistanceSigned(ref, s)) }))
      .filter(({ dist }) => dist <= VISIBILITY_RANGE);

    // Bucket by distance, then centre each bucket on the baseline: a lone
    // blip stays exactly where it always sat, a pair straddles it, three
    // put one back in the middle. Keeping the fan symmetrical means the
    // common case is visually unchanged.
    const byDistance = new Map<number, typeof inRange>();
    for (const entry of inRange) {
      const bucket = byDistance.get(entry.dist);
      if (bucket) bucket.push(entry);
      else byDistance.set(entry.dist, [entry]);
    }

    const positioned: PositionedBlip[] = [];
    for (const [dist, bucket] of byDistance) {
      bucket.forEach(({ s }, i) => {
        positioned.push({
          id: s.id,
          label: s.label,
          color: s.color,
          glyph: s.glyph,
          pos: REF_POS + (dist / VISIBILITY_RANGE) * AXIS_SPAN,
          dy: (i - (bucket.length - 1) / 2) * BLIP_ROW_GAP,
        });
      });
    }
    return positioned;
  }, [signatures, ref]);

  // Only grows past the default when some tie is big enough to need it, so
  // the panel doesn't jump height every time the reference changes.
  const scopeHeight = useMemo(() => {
    const perPosition = new Map<number, number>();
    for (const b of blips) perPosition.set(b.pos, (perPosition.get(b.pos) ?? 0) + 1);
    const deepestStack = Math.max(1, ...perPosition.values());
    return Math.max(SCOPE_MIN_HEIGHT, (deepestStack - 1) * BLIP_ROW_GAP + SCOPE_PADDING);
  }, [blips]);

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
          // Opacity and scale only. The glow is part of the star now, so
          // it brightens and blooms with the element rather than being
          // grown as a separate box-shadow each frame.
          core.style.opacity = String(opacity);
          core.style.transform = `scale(${0.7 + opacity * 0.9})`;
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
            className={`${styles.refBtn} ${s.id === ref.id ? styles.active : ""} ${
              s.placed ? styles.placed : ""
            }`}
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

      <div className={styles.scope} ref={scopeRef} style={{ height: scopeHeight }}>
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
          const style = {
            left: `${b.pos}%`,
            "--q-color": b.color,
            "--blip-dy": `${b.dy}px`,
          } as CSSProperties;
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
              >
                <QuasarStar color={b.color} glyph={b.glyph} size={22} />
              </div>
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
          <div
            key={s.id}
            className={`${styles.legendItem} ${s.placed ? styles.placed : ""}`}
          >
            <span className={styles.legendDot}>
              <QuasarStar color={s.color} glyph={s.glyph} size={14} />
            </span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
