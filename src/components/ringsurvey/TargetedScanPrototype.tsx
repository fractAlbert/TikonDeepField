"use client";

import { useEffect, useMemo, useState } from "react";
import { Region } from "@/lib/puzzle-types";
import { RING_COUNT, buildSectors } from "@/lib/grid";
import { generateRegion } from "@/lib/generate-region";
import { quasarColorHex } from "@/lib/quasar-colors";
import { playButtonClick } from "@/lib/sound";
import { LcarsPanel } from "@/components/LcarsShell";
import { RingScope } from "@/components/ringsurvey/RingScope";

const sectorLookup = new Map(buildSectors().map((s) => [s.id, s]));

// Prototype value only. A real budget would live in the survey log beside
// the filing allowance, so it survives a reload.
const SCAN_BUDGET = 2;

/**
 * The other ring instrument: aim it at one signature, learn its ring.
 *
 * Kept separate from the census on purpose, because they are different
 * things and want different rules. The census is always available and
 * unlimited, so it has to be anonymous or it hands over the puzzle. This
 * one names a signature, so it has to be scarce.
 *
 * Measured (docs/instrument-analysis.md, measure-deduction-depth.ts),
 * against 18.6% unsolvable and 134 candidate eliminations per region with
 * no lifeline at all:
 *
 *   1 scan, aimed well     1.6% unsolvable, 113 eliminations
 *   2 scans, aimed well    0.2% unsolvable,  90 eliminations
 *   unlimited              0.1% unsolvable,  23 eliminations
 *
 * One or two is a real instrument. Unlimited is the thing to avoid: 90% of
 * signatures then fall straight out of the two anchors with nothing
 * chaining.
 *
 * The skill in it is the aiming. Aimed blind, one scan only reaches 11.7%
 * rather than 1.6%, so picking the right target is worth about 7x - and
 * working out which signature you are actually stuck on is itself a
 * deduction step.
 */
export function TargetedScanPrototype({ region }: { region: Region | null }) {
  const [demo, setDemo] = useState<Region | null>(null);
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-time
       seed of sample data, same shape as the localStorage syncs elsewhere. */
    if (!region) setDemo((d) => d ?? generateRegion());
  }, [region]);

  const active = region ?? demo;

  const signatures = useMemo(
    () =>
      active
        ? active.quasars.map((q, i) => ({
            id: q.designation,
            label: q.designation,
            color: quasarColorHex(i),
            ring: sectorLookup.get(active.solution[q.id].sector)!.ring,
          }))
        : [],
    [active]
  );

  const [spent, setSpent] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // The spent list is keyed by designation, and designations are
  // regenerated per region - so it has to be cleared when the region
  // changes or it would carry stale entries that match nothing.
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- clearing
       state that belongs to the region being left. */
    setSpent([]);
    setSelectedId(null);
  }, [active]);

  const selected = signatures.find((s) => s.id === selectedId) ?? null;
  const remaining = SCAN_BUDGET - spent.length;

  // Only the scanned signature's ring lights, and with no count beside it:
  // a "1" would be noise, since a targeted scan returns a position rather
  // than a headcount.
  const counts = useMemo(() => {
    const perRing = new Array(RING_COUNT).fill(0) as number[];
    if (selected) perRing[selected.ring] = 1;
    return perRing;
  }, [selected]);

  if (!active) {
    return (
      <LcarsPanel title="Prototype &mdash; Targeted Ring Scan" accent="bg-lcars-violet">
        <p className="text-sm text-lcars-ice/50">Preparing sample field&hellip;</p>
      </LcarsPanel>
    );
  }

  return (
    <LcarsPanel title="Prototype &mdash; Targeted Ring Scan" accent="bg-lcars-violet">
      <p className="text-sm text-lcars-ice/70 leading-relaxed mb-2">
        Aim it at one signature and it returns that signature&apos;s ring
        &mdash; nothing else, and nothing about anyone else. Expensive, so you
        get {SCAN_BUDGET} per region.
      </p>
      <p className="text-xs text-lcars-ice/50 leading-relaxed mb-4">
        <span className="text-lcars-violet font-semibold">
          How this differs from the census above:
        </span>{" "}
        it names a signature, so it has to be scarce. Unlimited use drops the
        work from <span className="font-mono">134</span> candidate
        eliminations per region to <span className="font-mono">23</span>. At a
        budget of one it costs <span className="font-mono">113</span> &mdash; a
        real but modest price for taking unsolvable regions from{" "}
        <span className="font-mono">18.6%</span> to{" "}
        <span className="font-mono">1.6%</span>. The skill is the aiming:
        aimed blind the same scan only reaches{" "}
        <span className="font-mono">11.7%</span>, so choosing the right target
        is worth about 7&times; and is itself a deduction step.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50">
          Scans remaining
        </span>
        <span className="flex gap-1">
          {Array.from({ length: SCAN_BUDGET }, (_, i) => (
            <span
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < remaining ? "bg-lcars-violet" : "bg-white/15"
              }`}
            />
          ))}
        </span>
        {spent.length > 0 && (
          <button
            type="button"
            onClick={() => {
              playButtonClick();
              setSpent([]);
              setSelectedId(null);
            }}
            className="lcars-caps text-[10px] font-semibold tracking-wide rounded-full px-2.5 py-0.5 bg-white/15 text-lcars-ice cursor-pointer hover:bg-white/25 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* A spent signature stays clickable so you can look at its return
          again - re-reading a result you already paid for should not cost
          a second scan. */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {signatures.map((s) => {
          const used = spent.includes(s.id);
          const locked = !used && remaining === 0;
          return (
            <button
              key={s.id}
              type="button"
              disabled={locked}
              onClick={() => {
                playButtonClick();
                if (!used) setSpent((prev) => [...prev, s.id]);
                setSelectedId(s.id);
              }}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
                locked ? "cursor-not-allowed opacity-35" : "cursor-pointer"
              } ${
                s.id === selectedId
                  ? "bg-lcars-violet text-black font-semibold"
                  : used
                  ? "bg-lcars-panel text-lcars-violet/90"
                  : "bg-lcars-panel text-lcars-ice hover:bg-white/10"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
              {used && (
                <span className="text-[9px] font-mono text-lcars-violet">R{s.ring + 1}</span>
              )}
            </button>
          );
        })}
      </div>

      {selected ? (
        <>
          <RingScope
            counts={counts}
            color={selected.color}
            mode="accumulate"
            showCounts={false}
            showReadout={false}
            visible
          />
          <p className="font-mono text-sm mt-2" style={{ color: selected.color }}>
            {selected.label} &rarr; ring {selected.ring + 1}
          </p>
        </>
      ) : (
        <p className="text-sm text-lcars-ice/50">
          {remaining > 0
            ? "Pick a signature to spend a scan on it."
            : "No scans left. Reset to try aiming them differently."}
        </p>
      )}
    </LcarsPanel>
  );
}
