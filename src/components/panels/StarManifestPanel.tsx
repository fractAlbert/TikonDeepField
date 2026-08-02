"use client";

import { useState, useSyncExternalStore } from "react";
import { Region } from "@/lib/puzzle-types";
import { buildSectors, orthogonalDistanceSigned } from "@/lib/grid";
import { quasarColorHex } from "@/lib/quasar-colors";
import { PANEL_LABELS } from "@/lib/copy";
import {
  getObservations,
  getServerObservations,
  setNote,
  subscribeObservations,
} from "@/lib/observations";
import { playButtonClick } from "@/lib/sound";
import {
  EMPTY_LOG,
  getSurveyLog,
  ringScansUsed,
  subscribeSurveyLog,
} from "@/lib/survey-log";
import { LcarsPanel } from "@/components/LcarsShell";

const sectorLookup = new Map(buildSectors().map((s) => [s.id, s]));

// Must match RelativeDistanceScope, or the manifest would report readings
// the scope never showed.
const VISIBILITY_RANGE = 5;

interface KnownFact {
  label: string;
  /** Tailwind background for the chip. */
  chip: string;
}

/**
 * What the briefing already tells you about one signature.
 *
 * This used to ask only "is there a direct type clue?", which was quietly
 * meaningless: no region emits `quasar-type` at all - not
 * `generateRegion`, not the hand-authored `region-2` - so every signature
 * in every region was marked "Deduce" and the badge distinguished nothing.
 * Meanwhile the two exact-sector anchors and two quadrant clues that every
 * briefing *does* carry went unreported here, which is the more useful
 * half.
 *
 * Type clues are still handled, so a hand-authored region that uses them
 * shows them without needing this touched again.
 */
function knownFacts(region: Region, quasarId: string): KnownFact[] {
  const facts: KnownFact[] = [];
  for (const clue of region.clues) {
    if (clue.negate) continue;
    if (clue.kind === "quasar-sector" && clue.quasar === quasarId)
      facts.push({ label: clue.sector, chip: "bg-lcars-teal" });
    if (clue.kind === "quasar-quadrant" && clue.quasar === quasarId)
      facts.push({ label: `Quad ${clue.quadrant}`, chip: "bg-lcars-violet" });
    if (clue.kind === "quasar-type" && clue.quasar === quasarId)
      facts.push({ label: clue.type, chip: "bg-lcars-lilac" });
  }
  return facts;
}


/**
 * Every distance the player has actually seen for one signature.
 *
 * Derived rather than stored: the observation store only remembers which
 * signatures have been used as a Sweep Scope reference, and the readings
 * are recomputed from the field here. That is legitimate - each of these
 * was on screen when that reference was selected - and it means a recorded
 * reading can never disagree with the region it describes.
 *
 * Out-of-range pairs are reported as such rather than dropped. "Further
 * than the scope reaches" is an observation, and one the solver relies on.
 */
function observedDistances(
  region: Region,
  quasarId: string,
  references: string[]
): { from: string; distance: number | null }[] {
  const own = sectorLookup.get(region.solution[quasarId]?.sector ?? "");
  if (!own) return [];
  return references
    .filter((ref) => ref !== quasarId)
    .map((ref) => {
      const refSector = sectorLookup.get(region.solution[ref]?.sector ?? "");
      if (!refSector) return null;
      const d = Math.abs(orthogonalDistanceSigned(own, refSector));
      return { from: ref, distance: d <= VISIBILITY_RANGE ? d : null };
    })
    .filter((x): x is { from: string; distance: number | null } => x !== null);
}

export function StarManifestPanel({ region }: { region: Region }) {
  // Ring scans are recorded against the survey log rather than the
  // observation store, because spending one is a budgeted action and the
  // budget lives with the filings. Read from there rather than duplicating.
  const log = useSyncExternalStore(subscribeSurveyLog, getSurveyLog, () => EMPTY_LOG);
  const scannedRings = log.find((e) => e.regionId === region.id);
  const scanned = scannedRings ? ringScansUsed(scannedRings) : [];

  const observations = useSyncExternalStore(
    subscribeObservations,
    () => getObservations(region.id),
    getServerObservations
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const designationOf = (id: string) =>
    region.quasars.find((q) => q.id === id)?.designation ?? id;

  function commitNote(quasarId: string) {
    setNote(region.id, quasarId, draft);
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <LcarsPanel title={`${PANEL_LABELS.manifest} — ${region.name}`} accent="bg-lcars-lilac">
        <p className="text-sm text-lcars-ice/70 leading-relaxed mb-2">
          Your working record for this region. Each signature carries what the
          briefing pins down, every Sweep Scope reading you have taken against
          it, and whatever you want to write down.
        </p>
        <p className="text-xs text-lcars-ice/50 leading-relaxed mb-4">
          Readings appear as you take them &mdash; point the Sweep Scope at a
          signature and its distances to everything in range are recorded here.
          Nothing is filled in that you have not looked at.
        </p>

        <ul className="flex flex-col gap-2">
          {region.quasars.map((q, i) => {
            const color = quasarColorHex(i);
            const facts = knownFacts(region, q.id);
            // A ring scan is an answer the player paid for, so it sits with
            // the briefing facts rather than with the sweep readings. Only
            // for signatures actually scanned - same rule as everywhere
            // else here.
            if (scanned.includes(q.id)) {
              const ring = sectorLookup.get(region.solution[q.id]?.sector ?? "")?.ring;
              if (ring !== undefined) {
                facts.push({ label: `Ring ${ring + 1}`, chip: "bg-lcars-salmon" });
              }
            }
            const readings = observedDistances(region, q.id, observations.references);
            const note = observations.notes[q.id] ?? "";
            const isEditing = editing === q.id;
            const isReference = observations.references.includes(q.id);

            return (
              <li key={q.id} className="flex rounded-lg overflow-hidden">
                <span className="w-2 shrink-0" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0 bg-lcars-panel px-3 py-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color, boxShadow: `0 0 10px 2px ${color}66` }}
                    />
                    <span className="text-sm font-mono text-lcars-ice">{q.designation}</span>
                    {/* Only signatures the briefing says something about get a
                        chip. The rest are left blank rather than tagged: an
                        absent chip already says "nothing on file". */}
                    {facts.map((fact) => (
                      <span
                        key={fact.label}
                        className={`lcars-caps text-[10px] font-semibold tracking-wide text-black rounded-full px-2 py-0.5 ${fact.chip}`}
                      >
                        {fact.label}
                      </span>
                    ))}
                    {isReference && (
                      <span
                        className="lcars-caps text-[10px] tracking-wide text-lcars-ice/40"
                        title="Used as a Sweep Scope reference"
                      >
                        swept
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        playButtonClick();
                        setDraft(note);
                        setEditing(isEditing ? null : q.id);
                      }}
                      className="ml-auto lcars-caps text-[10px] font-semibold tracking-wide text-lcars-ice bg-white/15 hover:bg-white/25 rounded-full px-2.5 py-0.5 cursor-pointer transition-colors"
                    >
                      {note ? "Edit note" : "Note"}
                    </button>
                  </div>

                  {readings.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {readings.map((r) => (
                        <span
                          key={r.from}
                          className="font-mono text-[10px] rounded bg-black/35 px-1.5 py-0.5 text-lcars-ice/70"
                        >
                          {designationOf(r.from)}
                          <span
                            className={
                              r.distance === null
                                ? "ml-1 text-lcars-ice/30"
                                : "ml-1 text-lcars-violet"
                            }
                          >
                            {r.distance === null ? "far" : r.distance}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitNote(q.id);
                          if (e.key === "Escape") setEditing(null);
                        }}
                        maxLength={120}
                        placeholder="e.g. ring 3 or 4, not quadrant II"
                        aria-label={`Note for ${q.designation}`}
                        className="flex-1 min-w-0 bg-black/40 rounded px-2 py-1 text-xs text-lcars-ice outline-none ring-1 ring-lcars-lilac/50 focus:ring-lcars-amber"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          playButtonClick();
                          commitNote(q.id);
                        }}
                        className="lcars-caps text-[10px] font-semibold rounded-full px-2.5 py-0.5 bg-lcars-teal text-black cursor-pointer hover:bg-lcars-ice transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    note && (
                      <p className="text-xs text-lcars-amber/80 mt-2 leading-relaxed break-words">
                        {note}
                      </p>
                    )
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {observations.references.length === 0 && (
          <p className="text-xs text-lcars-ice/40 mt-4 leading-relaxed">
            No readings recorded yet. Open the Sweep Scope and pick a reference
            &mdash; every distance it shows lands here.
          </p>
        )}
      </LcarsPanel>
    </div>
  );
}
