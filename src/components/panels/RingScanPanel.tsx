"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Region } from "@/lib/puzzle-types";
import { RING_COUNT, buildSectors } from "@/lib/grid";
import { useQuasarColor } from "@/lib/use-quasar-colors";
import { PANEL_LABELS } from "@/lib/copy";
import {
  EMPTY_LOG,
  RING_SCAN_LIMIT,
  getSurveyLog,
  isClosed,
  recordRingScan,
  ringScansUsed,
  subscribeSurveyLog,
} from "@/lib/survey-log";
import { playButtonClick } from "@/lib/sound";
import { LcarsPanel } from "@/components/LcarsShell";
import { QuasarStar } from "@/components/QuasarStar";
import { RingScope } from "@/components/ringsurvey/RingScope";
import { quasarGlyph } from "@/lib/quasar-glyph";

const sectorLookup = new Map(buildSectors().map((s) => [s.id, s]));

/**
 * Ring Scan: aim it at one signature, learn which ring it sits in.
 *
 * Replaces the Quadrant Survey, which sliced the wrong axis - a quadrant
 * spans all five rings, so a per-quadrant headcount said almost nothing
 * about how far out anything was, and that is the half of the dominant
 * ambiguity that matters (docs/instrument-analysis.md).
 *
 * Metered rather than published as a census, and that choice is the design.
 * A ring census reads identically for every player, so it lowers the loss
 * rate for everyone and measures nothing. Two targeted scans instead leave
 * a careful player at ~1% unsolvable and a careless one at ~11% - a
 * ten-point spread that is entirely player judgment, which is what gives
 * the rank ladder something to grade. Working out *which* signature you are
 * stuck on is itself the deduction step.
 */
export function RingScanPanel({
  region,
  placedQuasarIds,
}: {
  region: Region;
  /**
   * Signatures already on the Star Map, dimmed here the way the map's own
   * chips are. Deliberately *not* a lock: a placed signature is still a
   * legitimate target, since you may have placed it on a guess and a scan
   * is exactly how you settle that.
   */
  placedQuasarIds: Set<string>;
}) {
  const colorOf = useQuasarColor(region.id);
  const log = useSyncExternalStore(subscribeSurveyLog, getSurveyLog, () => EMPTY_LOG);
  const entry = log.find((e) => e.regionId === region.id);
  const scanned = entry ? ringScansUsed(entry) : [];
  const closed = entry ? isClosed(entry) : false;
  const remaining = Math.max(0, RING_SCAN_LIMIT - scanned.length);

  const signatures = useMemo(
    () =>
      region.quasars.map((q, i) => ({
        id: q.id,
        label: q.designation,
        color: colorOf(q.id, i),
        glyph: quasarGlyph(i),
        ring: sectorLookup.get(region.solution[q.id].sector)!.ring,
      })),
    [region, colorOf]
  );

  // Which return is on the dial right now. Never persisted - it is a view
  // of an already-paid-for result, not a spend.
  const [shownId, setShownId] = useState<string | null>(null);
  const shown = signatures.find((s) => s.id === shownId && scanned.includes(s.id)) ?? null;

  // Not memoized: it is a five-element array built from one number, and
  // memoizing on `shown` (an object from .find) is exactly the pattern the
  // React Compiler refuses to preserve.
  const counts = new Array(RING_COUNT).fill(0) as number[];
  if (shown) counts[shown.ring] = 1;

  return (
    <div className="flex flex-col gap-4">
      <LcarsPanel title={`${PANEL_LABELS.ringScan} — ${region.name}`} accent="bg-lcars-salmon">
        <p className="text-sm text-lcars-ice/70 leading-relaxed mb-4">
          A range gate walks outward from the centre of the field. Aim it at one
          signature and the ring holding it lights as the gate crosses &mdash;
          which ring, and nothing else. No bearing, no segment, and nothing
          about any other signature.
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50">
            Scans remaining
          </span>
          <span className="flex gap-1">
            {Array.from({ length: RING_SCAN_LIMIT }, (_, i) => (
              <span
                key={i}
                className={`w-3.5 h-3.5 rounded-full ${
                  i < remaining ? "bg-lcars-salmon" : "bg-white/15"
                }`}
              />
            ))}
          </span>
          <span className="font-mono text-[11px] text-lcars-ice/40">
            {remaining} of {RING_SCAN_LIMIT}
          </span>
        </div>

        <p className="text-xs text-lcars-ice/50 leading-relaxed mb-4">
          The array can only hold a fine-resolution lock this long per region.
          Spend them on the signatures you cannot place by cross-referencing
          &mdash; a scan aimed at one you would have worked out anyway is a scan
          wasted.
        </p>

        {/* An already-scanned signature stays clickable: re-reading a result
            you have paid for is free, since the cost is the decision about
            where to aim rather than the act of looking. */}
        <div id="ringscan-signatures" className="flex flex-wrap gap-1.5">
          {signatures.map((s) => {
            const used = scanned.includes(s.id);
            const locked = !used && (remaining === 0 || closed);
            // Never on the one whose return is currently up: that button is
            // filled salmon and is the thing you are looking at, so fading
            // it would read as the readout going stale.
            const placed = placedQuasarIds.has(s.id) && !locked && s.id !== shownId;
            return (
              <button
                key={s.id}
                type="button"
                disabled={locked}
                onClick={() => {
                  playButtonClick();
                  if (!used) recordRingScan(region.id, s.id);
                  setShownId(s.id);
                }}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
                  locked ? "cursor-not-allowed opacity-35" : "cursor-pointer"
                } ${placed ? "opacity-60" : ""} ${
                  s.id === shown?.id
                    ? "bg-lcars-salmon text-black font-semibold"
                    : used
                    ? "bg-lcars-panel text-lcars-ice/80 ring-1 ring-lcars-salmon/50"
                    : "bg-lcars-panel text-lcars-ice hover:bg-white/10"
                }`}
              >
                <QuasarStar color={s.color} glyph={s.glyph} size={16} />
                {s.label}
                {used && (
                  <span className="font-mono text-[9px] text-lcars-salmon">R{s.ring + 1}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Only once there is something dimmed to explain. The dim is a
            reminder, not a rule, and saying so matters here more than on
            the Star Map: there the faded chip is finished business, here it
            is still a target. */}
        {placedQuasarIds.size > 0 && !closed && (
          <p className="text-[11px] text-lcars-ice/40 leading-relaxed mt-2">
            Dimmed signatures are already placed on the Star Map. Scanning one
            is still allowed &mdash; a placement can be a guess.
          </p>
        )}

        {closed && scanned.length === 0 && (
          <p className="text-xs text-lcars-ice/45 mt-3">
            This survey is closed. Nothing left to scan for.
          </p>
        )}
      </LcarsPanel>

      {shown ? (
        <LcarsPanel title={`Return — ${shown.label}`} accent="bg-lcars-violet">
          <RingScope
            counts={counts}
            color={shown.color}
            mode="accumulate"
            showCounts={false}
            showReadout={false}
            visible
          />
          <p className="font-mono text-sm mt-2" style={{ color: shown.color }}>
            {shown.label} &rarr; ring {shown.ring + 1}
          </p>
        </LcarsPanel>
      ) : (
        <LcarsPanel title="Return" accent="bg-lcars-violet">
          <p className="text-sm text-lcars-ice/50">
            {remaining > 0 || scanned.length > 0
              ? "Select a signature above to see its return."
              : "No scans left on this region."}
          </p>
        </LcarsPanel>
      )}
    </div>
  );
}
