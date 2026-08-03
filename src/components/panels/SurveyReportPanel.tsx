"use client";

// What a survey looks like once it is over.
//
// Closing a region now archives it (see `closeEntry`), and `archived` is
// the flag `noActiveAssignment` keys off - so without this panel the moment
// you filed your last classification the app cut to the station logo, and
// the board, the catalog reveal and any rank change all vanished in the
// same frame that produced them. This is where they go instead.
//
// Two properties are load-bearing:
//
//  1. **It sits outside the `noActiveAssignment` gate.** Every other panel
//     that renders real content is behind it, and a report rendered the
//     usual way would be replaced by the placeholder the instant the
//     archive landed. AppShell resolves the region straight from the log.
//
//  2. **It is a view of a closed log entry, not a one-shot modal.** The Log
//     re-opens it, so a player who clicks past it too fast has lost
//     nothing - and everything it shows has to live on the entry, which is
//     why the rank event is persisted there rather than passed in.
//
// Return goes to the Log, never to the blank page: that page is the thing
// this panel exists to stop you landing on.

import { Region } from "@/lib/puzzle-types";
import { SurveyLogEntry, entryOutcome, filingsUsed, ringScansUsed, RING_SCAN_LIMIT } from "@/lib/survey-log";
import { SurveyOutcome, RELIEVED, REVIEW_WINDOW, rankHex, rankTitle } from "@/lib/ranks";
import { loadStarMapSave } from "@/lib/starmap-storage";
import { resolveQuasarColor, getQuasarColors } from "@/lib/quasar-colors";
import { quasarGlyph } from "@/lib/quasar-glyph";
import { PANEL_LABELS } from "@/lib/copy";
import { LcarsPanel } from "@/components/LcarsShell";
import { LcarsButton } from "@/components/LcarsButton";
import { QuasarStar } from "@/components/QuasarStar";
import { RankInsignia } from "@/components/RankInsignia";
import { ResultField } from "@/components/starmap/ResultField";
import { TUTORIAL_REGION_ID } from "@/data/regions/tutorial";

/**
 * The verdict, in the station's voice. Same three endings the Star Map
 * announces, said at the length a report can afford - the board's version
 * has to fit under a 260px dial.
 */
const OUTCOME: Record<
  SurveyOutcome,
  { label: string; accent: string; hex: string; detail: string }
> = {
  confirmed: {
    label: "Classification Confirmed",
    accent: "bg-lcars-teal",
    hex: "var(--lcars-teal)",
    detail:
      "Every signature matched the catalog. The census has been filed to the regional record and the region is closed.",
  },
  retracted: {
    label: "Classification Retracted",
    accent: "bg-lcars-red",
    hex: "var(--lcars-red)",
    detail:
      "The filing allocation was spent without a match, so the entry was pulled before it went out. Nothing wrong reached the charts — but nothing right did either.",
  },
  withdrawn: {
    label: "Survey Withdrawn",
    accent: "bg-lcars-ice",
    hex: "rgba(204,230,255,0.75)",
    detail:
      "Released unresolved. Nothing was filed, and nothing stands against your record — the catalog below is what was out there.",
  },
};

/** Fixed-width readouts, never trimmed - see docs/lcars-style-notes.md. */
const pad = (n: number) => String(n).padStart(2, "0");

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SurveyReportPanel({
  region,
  entry,
  onReturnToLog,
  onSurveyNewRegion,
  atSurveyCap,
}: {
  region: Region;
  entry: SurveyLogEntry;
  onReturnToLog: () => void;
  onSurveyNewRegion: () => void;
  /** Nothing to open into, so the forward action is offered but refused. */
  atSurveyCap: boolean;
}) {
  const outcome = entryOutcome(entry);
  // Only ever rendered for a closed entry; AppShell filters on that. The
  // fallback keeps this total rather than throwing on a hand-edited save.
  const style = OUTCOME[outcome ?? "withdrawn"];

  const placements = loadStarMapSave(entry.regionId)?.placements ?? {};
  const colors = getQuasarColors();
  const isTutorial = entry.regionId === TUTORIAL_REGION_ID;

  const matched = region.quasars.filter(
    (q) => placements[q.id] && placements[q.id] === region.solution[q.id]?.sector
  ).length;
  const scans = ringScansUsed(entry);

  return (
    <div className="flex flex-col gap-4">
      <LcarsPanel title={`Survey Result — ${region.name}`} accent={style.accent}>
        {/* The verdict first and at size. Everything below it is evidence
            for this line. */}
        <div className="flex mb-4 rounded-lg overflow-hidden">
          <div className="w-2 shrink-0" style={{ backgroundColor: style.hex }} />
          <div className="flex-1 min-w-0 bg-black/30 px-4 py-3">
            <div
              className="lcars-caps text-lg md:text-xl font-bold leading-none"
              style={{ color: style.hex }}
            >
              {style.label}
            </div>
            <p className="text-xs text-lcars-ice/60 leading-relaxed mt-2">{style.detail}</p>
            {/* The tutorial's retraction is rank-neutral (see
                `careerOutcome` in survey-log.ts), and without saying so the
                report reads as a real mark on the record - which is the one
                thing a training region must never do. Only shown where it
                is true: a tutorial *win* is an ordinary confirmation and
                counts like any other, so it gets no note. */}
            {isTutorial && outcome === "retracted" && (
              <p className="text-[11px] text-lcars-teal/85 leading-relaxed mt-2">
                This was a training survey &mdash; it has not been counted
                against your record. Open a real field whenever you are ready.
              </p>
            )}
            {entry.closedAt && (
              <p className="text-[11px] text-lcars-ice/35 font-mono mt-1.5">
                Closed {formatDate(entry.closedAt)}
              </p>
            )}
          </div>
        </div>

        {/* The reference image's data-row idiom: a colour stub, a label, and
            a big number that is the actual content. */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Stat
            label="Signatures matched"
            value={`${pad(matched)} / ${pad(region.quasars.length)}`}
            hex={matched === region.quasars.length ? "var(--lcars-teal)" : "var(--lcars-amber)"}
          />
          <Stat label="Filings spent" value={pad(filingsUsed(entry))} hex="var(--lcars-amber)" />
          <Stat
            label="Ring scans"
            value={`${pad(scans.length)} / ${pad(RING_SCAN_LIMIT)}`}
            hex="var(--lcars-salmon)"
          />
        </div>

        <div className="flex flex-col xl:flex-row gap-5">
          {/* The catalog reveal, finally at a size worth reading. The dial
              scales with its box - every label is in user units - so this
              is the same drawing the sidebar makes, just not squinting. */}
          <div className="flex flex-col items-center shrink-0">
            <ResultField
              region={region}
              placements={placements}
              className="w-full max-w-[460px] xl:max-w-[420px] h-auto"
            />
            {/* "Placed", not "filed": a withdrawal files nothing, and this
                caption has to hold for all three outcomes. */}
            <p className="text-[11px] text-lcars-ice/40 leading-relaxed mt-2 max-w-[420px] text-center">
              Dashed rings are the catalog positions, tethered to where you
              placed them. A teal ring is a match.
            </p>
          </div>

          <div className="flex-1 min-w-0">
            <div className="lcars-caps text-[11px] tracking-wider text-lcars-ice/50 mb-2">
              Catalog entry
            </div>
            {/* Types are secret for the whole survey and are the payoff for
                finishing one, so they are shown for every outcome -
                including confirmed, where the sectors were already known
                but the classifications never were. */}
            <ul className="flex flex-col gap-1.5">
              {region.quasars.map((q, i) => {
                const trueSid = region.solution[q.id]?.sector;
                const placed = placements[q.id];
                const right = !!placed && placed === trueSid;
                return (
                  <li key={q.id} className="flex rounded-md overflow-hidden">
                    <div
                      className="w-1.5 shrink-0"
                      style={{
                        backgroundColor: right ? "var(--lcars-teal)" : "var(--lcars-red)",
                      }}
                    />
                    <div className="flex-1 min-w-0 bg-black/25 px-2.5 py-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="flex items-center gap-1.5 text-xs text-lcars-ice">
                        <QuasarStar
                          color={resolveQuasarColor(colors, entry.regionId, q.id, i)}
                          glyph={quasarGlyph(i)}
                          size={14}
                        />
                        {q.designation}
                      </span>
                      <span className="font-mono text-sm text-lcars-amber tabular-nums">
                        {trueSid}
                      </span>
                      <span className="lcars-caps text-[10px] tracking-wide rounded-full px-2 py-0.5 bg-lcars-lilac text-black font-semibold">
                        {region.solution[q.id]?.type}
                      </span>
                      {!right && (
                        <span className="font-mono text-[10px] text-lcars-ice/40 ml-auto">
                          {placed ? `placed ${placed}` : "never placed"}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Whether the region was winnable at all. Held back until it
                closes for the same reason the Log holds it back: while it
                is open, "nobody could have solved this" decides the survey
                for the player. */}
            {region.solvability && !region.solvability.withBestScans && (
              <p className="text-[11px] text-lcars-red/80 leading-relaxed mt-3">
                This region could not be resolved. Two positions matched every
                reading, so no amount of work would have separated them.
              </p>
            )}
            {region.solvability?.withBestScans === true &&
              region.solvability.withoutScans === false && (
                <p className="text-[11px] text-lcars-salmon/80 leading-relaxed mt-3">
                  This region needed a ring scan aimed at the right signature.
                  Bearings alone left two positions consistent with every reading.
                </p>
              )}
          </div>
        </div>

        {/* Persisted on the entry, so re-opening this report a week later
            still shows the promotion it caused. */}
        {entry.rankEvent && (
          <div className="flex items-center gap-3 rounded-lg bg-black/40 px-3 py-2.5 mt-4">
            <RankInsignia rank={entry.rankEvent.to} size={40} />
            <div className="min-w-0 leading-tight">
              <div
                className="lcars-caps text-sm font-semibold"
                style={{ color: rankHex(entry.rankEvent.to) }}
              >
                {entry.rankEvent.to === RELIEVED
                  ? "Relieved of survey duty"
                  : entry.rankEvent.to > entry.rankEvent.from
                  ? `Promoted — ${rankTitle(entry.rankEvent.to)}`
                  : `Demoted — ${rankTitle(entry.rankEvent.to)}`}
              </div>
              <div className="text-[11px] text-lcars-ice/50 mt-0.5">
                Catalog integrity review: {entry.rankEvent.confirmed} confirmed,{" "}
                {entry.rankEvent.retracted} retracted over {REVIEW_WINDOW} regions.
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-5">
          <LcarsButton color="amber" onClick={onReturnToLog}>
            Return to Log
          </LcarsButton>
          <LcarsButton color="orange" onClick={onSurveyNewRegion} disabled={atSurveyCap}>
            {PANEL_LABELS.surveyNewRegion}
          </LcarsButton>
          <span className="text-[11px] text-lcars-ice/40 leading-relaxed">
            {atSurveyCap
              ? "Every survey slot is taken by an unfinished region."
              : "This survey has been archived. The Log keeps it, and this report."}
          </span>
        </div>
      </LcarsPanel>
    </div>
  );
}

function Stat({ label, value, hex }: { label: string; value: string; hex: string }) {
  return (
    <div className="flex rounded-md overflow-hidden grow basis-40">
      <div className="w-1.5 shrink-0" style={{ backgroundColor: hex }} />
      <div className="flex-1 min-w-0 bg-black/25 px-3 py-1.5">
        <div className="lcars-caps text-[10px] tracking-wider text-lcars-ice/45">{label}</div>
        <div className="font-mono text-xl font-bold tabular-nums leading-none mt-0.5" style={{ color: hex }}>
          {value}
        </div>
      </div>
    </div>
  );
}
