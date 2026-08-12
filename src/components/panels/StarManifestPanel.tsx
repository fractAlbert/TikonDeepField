"use client";

import { useState, useSyncExternalStore } from "react";
import { Region } from "@/lib/puzzle-types";
import { buildSectors, orthogonalDistanceSigned } from "@/lib/grid";
import { QUASAR_PALETTE, setQuasarColor } from "@/lib/quasar-colors";
import { useQuasarColor } from "@/lib/use-quasar-colors";
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
import { QuasarStar } from "@/components/QuasarStar";
import { quasarGlyph } from "@/lib/quasar-glyph";
import { VISIBILITY_RANGE } from "@/lib/experiments";

const sectorLookup = new Map(buildSectors().map((s) => [s.id, s]));

// Must match RelativeDistanceScope, or the manifest would report readings
// the scope never showed.

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
      // The region's own range, not the module default - the manifest must
      // report exactly what the Sweep Scope would show for this field.
      return { from: ref, distance: d <= (region.sweepRange ?? VISIBILITY_RANGE) ? d : null };
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
  const colorOf = useQuasarColor(region.id);
  const [editing, setEditing] = useState<string | null>(null);
  const [recolouring, setRecolouring] = useState<string | null>(null);
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

        <ul id="manifest-list" className="flex flex-col gap-2">
          {region.quasars.map((q, i) => {
            const color = colorOf(q.id, i);
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
                <div className="flex-1 min-w-0 bg-lcars-panel px-3 py-2.5 flex gap-4 flex-wrap">
                  <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* The star *is* the colour control. It used to be an
                        inert dot with a separate swatch button further
                        along the row, which is two things standing for one
                        signature - and the swatch was the only place the
                        colour appeared at a size worth clicking. Clicking
                        the thing whose colour you want to change is the
                        shorter route, and it gives the row back the space
                        the swatch was using. */}
                    <button
                      type="button"
                      onClick={() => {
                        playButtonClick();
                        setRecolouring(recolouring === q.id ? null : q.id);
                      }}
                      title={`Change the colour of ${q.designation}`}
                      /* Open state is a lamp under the star rather than a
                         ring around it. A ring is a drawn stroke, and it
                         needed a black offset to survive against a pale
                         entry; a solid bar underneath works against any
                         colour and is the same device the rank strip and
                         the picker use. */
                      className="shrink-0 flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-110"
                    >
                      <QuasarStar color={color} glyph={quasarGlyph(i)} size={22} />
                      <span
                        aria-hidden
                        className={`h-1 w-full ${
                          recolouring === q.id ? "bg-lcars-ice" : "bg-transparent"
                        }`}
                      />
                    </button>
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
                    {/* Sits with the rest of the row rather than pushed to
                        the far right by `ml-auto`. It was the only thing
                        over there, so it read as belonging to a different
                        control group than the signature it edits - and it
                        was holding the whole right-hand column hostage for
                        one small button. The note itself gets that column
                        now. */}
                    <button
                      type="button"
                      onClick={() => {
                        playButtonClick();
                        setDraft(note);
                        setEditing(isEditing ? null : q.id);
                      }}
                      className="lcars-caps text-[10px] font-semibold tracking-wide text-lcars-ice bg-white/15 hover:bg-white/25 rounded-full px-2.5 py-0.5 cursor-pointer transition-colors"
                    >
                      {note ? "Edit note" : "Note"}
                    </button>
                  </div>

                  {recolouring === q.id && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {QUASAR_PALETTE.map((hex) => {
                        // Taken by another signature in this region - still
                        // offered, since two greens the player chose on
                        // purpose is their business, but marked so the
                        // clash is not a surprise.
                        const clash = region.quasars.some(
                          (other, j) => other.id !== q.id && colorOf(other.id, j) === hex
                        );
                        return (
                          <button
                            key={hex}
                            type="button"
                            title={clash ? "Already used in this region" : undefined}
                            onClick={() => {
                              playButtonClick();
                              setQuasarColor(region.id, q.id, hex);
                              setRecolouring(null);
                            }}
                            /* Stars, not swatches. You are choosing how the
                               signature will look, so the picker should
                               show you that - a flat disc made you infer
                               it. The current colour is marked by a lamp
                               beneath rather than a ring around: ice-on-ice
                               was why the ring needed a black offset in the
                               first place, and a bar underneath never has
                               to contrast with the thing it marks. */
                            className={`flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-110 ${
                              clash ? "opacity-40" : ""
                            }`}
                          >
                            {/* The signature's own glyph, not a generic
                                dot: the picker is showing how *this*
                                signature will look in that colour. */}
                            <QuasarStar color={hex} glyph={quasarGlyph(i)} size={22} />
                            <span
                              aria-hidden
                              className={`h-1 w-full ${
                                hex === color ? "bg-lcars-ice" : "bg-transparent"
                              }`}
                            />
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          playButtonClick();
                          setQuasarColor(region.id, q.id, null);
                          setRecolouring(null);
                        }}
                        className="lcars-caps text-[10px] font-semibold tracking-wide text-lcars-ice bg-white/15 hover:bg-white/25 rounded-full px-2.5 py-0.5 cursor-pointer transition-colors"
                      >
                        Default
                      </button>
                    </div>
                  )}

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

                  </div>

                  {/* The note gets the right-hand column the Note button
                      used to occupy on its own, and gets to be readable
                      there: this is the player's own reasoning, which is
                      the most valuable text on the row and was previously
                      the smallest. Full width below `sm`, where two
                      columns would leave neither usable. */}
                  <div className="w-full sm:w-[38%] sm:max-w-[280px] min-w-0">
                    {isEditing ? (
                      <div className="flex flex-col gap-1.5">
                        <textarea
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            // Enter saves, shift-Enter breaks the line -
                            // the box is now big enough for that to be a
                            // distinction worth having.
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              commitNote(q.id);
                            }
                            if (e.key === "Escape") setEditing(null);
                          }}
                          rows={3}
                          maxLength={400}
                          placeholder="e.g. ring 3 or 4, not quadrant II"
                          aria-label={`Note for ${q.designation}`}
                          className="w-full bg-black/40 rounded px-2 py-1.5 text-xs text-lcars-ice outline outline-1 outline-lcars-lilac/50 focus:outline-lcars-amber resize-y"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            playButtonClick();
                            commitNote(q.id);
                          }}
                          className="lcars-caps text-[10px] font-semibold rounded-full px-2.5 py-0.5 bg-lcars-teal text-black cursor-pointer hover:bg-lcars-ice transition-colors self-start"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      note && (
                        <p className="text-sm text-lcars-amber/85 leading-relaxed break-words whitespace-pre-wrap">
                          {note}
                        </p>
                      )
                    )}
                  </div>
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
