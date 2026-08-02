"use client";

import { useState, useSyncExternalStore } from "react";
import { Region } from "@/lib/puzzle-types";
import { resolveQuasarColor, getQuasarColors } from "@/lib/quasar-colors";
import { loadStarMapSave } from "@/lib/starmap-storage";
import {
  EMPTY_LOG,
  currentFilingLimit,
  SurveyLogEntry,
  entryOutcome,
  filingsUsed,
  getSurveyLog,
  resolveEntryRegion,
  setArchived,
  subscribeSurveyLog,
} from "@/lib/survey-log";
import { SurveyOutcome } from "@/lib/ranks";
import { playButtonClick } from "@/lib/sound";
import { LcarsPanel } from "@/components/LcarsShell";
import { LcarsButton } from "@/components/LcarsButton";

const ENTRIES_PER_PAGE = 3;

// A region is open until it's filed or withdrawn, and then it's one of
// three things. The old log only knew "solved", which couldn't tell a
// region you gave up on from one you hadn't touched since lunch.
const OUTCOME_STYLE: Record<SurveyOutcome, { label: string; chip: string; accent: string }> = {
  confirmed: { label: "Confirmed", chip: "bg-lcars-teal", accent: "var(--lcars-teal)" },
  retracted: { label: "Retracted", chip: "bg-lcars-red", accent: "var(--lcars-red)" },
  withdrawn: { label: "Withdrawn", chip: "bg-lcars-ice/70", accent: "rgba(204,230,255,0.45)" },
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function LogPanel({
  builtInRegions,
  activeRegionId,
  previewRegionId,
  onPreviewRegion,
  onResumeRegion,
}: {
  builtInRegions: Region[];
  activeRegionId: string;
  previewRegionId: string | null;
  onPreviewRegion: (region: Region) => void;
  /** Make this survey the active one and go to its briefing. */
  onResumeRegion: (region: Region) => void;
}) {
  const allEntries = useSyncExternalStore(subscribeSurveyLog, getSurveyLog, () => EMPTY_LOG);
  const [page, setPage] = useState(0);
  // The two views are exclusive rather than additive: archiving is how you
  // get a survey out of the way, so folding archived entries back into the
  // default list would undo the only thing archiving does here.
  const [showArchived, setShowArchived] = useState(false);

  const activeCount = allEntries.filter((e) => !e.archived).length;
  const archivedCount = allEntries.length - activeCount;
  const entries = allEntries.filter((e) => e.archived === showArchived);

  const totalPages = Math.max(1, Math.ceil(entries.length / ENTRIES_PER_PAGE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageEntries = entries.slice(
    clampedPage * ENTRIES_PER_PAGE,
    clampedPage * ENTRIES_PER_PAGE + ENTRIES_PER_PAGE
  );

  function selectView(archived: boolean) {
    playButtonClick();
    setShowArchived(archived);
    // The lists are different lengths, so page 3 of one is often past the
    // end of the other. clampedPage would cover it, but landing on the last
    // page of a list you just switched to reads as a glitch.
    setPage(0);
  }

  return (
    <div className="flex flex-col gap-4">
      <LcarsPanel title="Survey Log" accent="bg-lcars-amber">
        <p className="text-sm text-lcars-ice/70 leading-relaxed mb-4">
          Every region survey you&apos;ve opened, with its progress. Click an
          entry to load it into the Star Map for review without changing your
          active survey; <strong className="text-lcars-teal">Resume</strong>{" "}
          switches to it properly. Archiving clears a survey from the Briefing
          panel&apos;s selection row without deleting its history here.
        </p>

        <div className="flex gap-1 bg-black/30 rounded-full p-1 w-fit mb-4">
          {([
            [false, "Current", activeCount],
            [true, "Archived", archivedCount],
          ] as [boolean, string, number][]).map(([archived, label, count]) => (
            <button
              key={label}
              type="button"
              onClick={() => selectView(archived)}
              className={`lcars-caps text-[11px] px-3 py-1 rounded-full cursor-pointer transition-colors ${
                showArchived === archived
                  ? "bg-lcars-amber text-black font-semibold"
                  : "text-lcars-ice/60 hover:text-lcars-ice"
              }`}
            >
              {label}
              <span className="font-mono ml-1.5 opacity-70">{count}</span>
            </button>
          ))}
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-lcars-ice/50">
            {showArchived
              ? "Nothing archived. Archiving a survey moves it here and out of the Briefing panel's selection row."
              : allEntries.length === 0
              ? "No surveys begun yet. Select a region on the Briefing panel, or generate a new one, to start your log."
              : "Every survey is archived. Switch to Archived above to see them."}
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-2.5">
              {pageEntries.map((entry) => (
                <LogEntryCard
                  key={entry.regionId}
                  entry={entry}
                  builtInRegions={builtInRegions}
                  isActive={entry.regionId === activeRegionId}
                  isPreviewed={entry.regionId === previewRegionId}
                  onPreviewRegion={onPreviewRegion}
                  onResumeRegion={onResumeRegion}
                />
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <LcarsButton
                  color="amber"
                  disabled={clampedPage === 0}
                  onClick={() => setPage(clampedPage - 1)}
                >
                  Prev
                </LcarsButton>
                <div className="flex items-baseline gap-2 font-mono">
                  <span className="lcars-caps text-[10px] text-lcars-ice/40">Page</span>
                  <span className="text-2xl font-bold text-lcars-amber leading-none">
                    {clampedPage + 1}
                  </span>
                  <span className="text-sm text-lcars-ice/40">/ {totalPages}</span>
                </div>
                <LcarsButton
                  color="amber"
                  disabled={clampedPage === totalPages - 1}
                  onClick={() => setPage(clampedPage + 1)}
                >
                  Next
                </LcarsButton>
              </div>
            )}
          </>
        )}
      </LcarsPanel>
    </div>
  );
}

function LogEntryCard({
  entry,
  builtInRegions,
  isActive,
  isPreviewed,
  onPreviewRegion,
  onResumeRegion,
}: {
  entry: SurveyLogEntry;
  builtInRegions: Region[];
  isActive: boolean;
  isPreviewed: boolean;
  onPreviewRegion: (region: Region) => void;
  onResumeRegion: (region: Region) => void;
}) {
  const region = resolveEntryRegion(entry, builtInRegions);
  if (!region) return null;

  const save = loadStarMapSave(entry.regionId);
  const placedCount = save ? Object.values(save.placements).filter(Boolean).length : 0;
  const outcome = entryOutcome(entry);
  const style = outcome ? OUTCOME_STYLE[outcome] : null;
  const accentColor = style?.accent ?? "var(--lcars-amber)";
  const spent = filingsUsed(entry);

  return (
    <li
      onClick={() => {
        playButtonClick();
        onPreviewRegion(region);
      }}
      className={`flex rounded-lg overflow-hidden cursor-pointer transition-opacity ${
        isPreviewed ? "ring-2 ring-lcars-amber" : ""
      } ${entry.archived ? "opacity-50" : ""}`}
    >
      <div className="w-2 shrink-0" style={{ backgroundColor: accentColor }} />
      <div className="flex-1 min-w-0 bg-lcars-panel px-3.5 py-3">
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          <span className="text-sm font-semibold text-lcars-ice mr-1">{region.name}</span>
          <span
            className={`lcars-caps text-[10px] font-semibold tracking-wide rounded-full px-2 py-0.5 text-black ${
              style?.chip ?? "bg-lcars-amber"
            }`}
          >
            {style?.label ?? "In Progress"}
          </span>
          <span className="lcars-caps text-[10px] font-semibold tracking-wide rounded-full px-2 py-0.5 bg-lcars-ice/70 text-black">
            {entry.origin === "generated" ? "Generated" : "Default"}
          </span>
          {isActive && (
            <span className="lcars-caps text-[10px] font-semibold tracking-wide rounded-full px-2 py-0.5 bg-lcars-violet text-black">
              Active
            </span>
          )}
          {entry.archived && (
            <span className="lcars-caps text-[10px] font-semibold tracking-wide rounded-full px-2 py-0.5 bg-white/25 text-black">
              Archived
            </span>
          )}

          {/* Resume is the way back into a survey, as distinct from
              clicking the card, which only previews it. Offered on open
              regions you aren't already in: a closed one has a read-only
              board, so making it active would replace the game you're
              playing with a finished one for no gain - preview shows it
              just as well. */}
          {!isActive && !outcome && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playButtonClick();
                onResumeRegion(region);
              }}
              className="ml-auto lcars-caps text-[10px] font-semibold tracking-wide text-black bg-lcars-teal hover:bg-lcars-ice rounded-full px-2.5 py-0.5 cursor-pointer transition-colors"
            >
              Resume
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playButtonClick();
              setArchived(entry.regionId, !entry.archived);
            }}
            className={`lcars-caps text-[10px] font-semibold tracking-wide text-lcars-ice bg-white/15 hover:bg-white/25 rounded-full px-2.5 py-0.5 cursor-pointer transition-colors ${
              !isActive && !outcome ? "" : "ml-auto"
            }`}
          >
            {entry.archived ? "Restore" : "Archive"}
          </button>
        </div>

        <p className="text-xs text-lcars-ice/50 leading-relaxed mb-2 line-clamp-1">
          {region.briefing}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {region.quasars.map((q, i) => (
            <span
              key={q.id}
              className="flex items-center gap-1 rounded-full bg-black/30 px-1.5 py-0.5 text-[11px] font-mono text-lcars-ice/80"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: resolveQuasarColor(getQuasarColors(), entry.regionId, q.id, i) }}
              />
              {q.designation}
              {outcome && (
                /* A closed region has nothing left to give away, so the
                   log shows the catalog entry for all three outcomes -
                   including the ones you got wrong, which is the only
                   place a retraction can be learned from. */
                <span className="text-lcars-ice/40">
                  &middot; {region.solution[q.id]?.sector} &middot; {region.solution[q.id]?.type}
                </span>
              )}
            </span>
          ))}
        </div>

        {/* Only once the region is closed. While it is open, "nobody could
            have solved this" would decide the survey for the player - the
            whole point of withdrawal is that they cannot tell. */}
        {outcome && region.solvability && !region.solvability.withBestScans && (
          <p className="text-[11px] text-lcars-red/80 mb-1.5">
            This region could not be resolved. Two positions matched every
            reading, so no amount of work would have separated them.
          </p>
        )}
        {outcome && region.solvability?.withBestScans === true &&
          region.solvability.withoutScans === false && (
            <p className="text-[11px] text-lcars-salmon/70 mb-1.5">
              This region needed a ring scan aimed at the right signature.
            </p>
          )}

        <p className="text-[11px] text-lcars-ice/40 font-mono">
          {/* Written as an explicit string because the plain version lost
              its leading space and rendered "3filings used". The original
              "verify attempts" line this replaced had the same bug, so
              it's worth recognising: it shows up when a JSX text node
              wraps across lines and contains an entity like &middot;. */}
          {placedCount} / {region.quasars.length} placed &middot; {spent} of {currentFilingLimit()}
          {" filings used"} &middot; first surveyed {formatDate(entry.firstSurveyedAt)}
          {outcome && entry.closedAt && (
            <>
              {" "}
              &middot; {style?.label.toLowerCase()} {formatDate(entry.closedAt)}
            </>
          )}
        </p>
      </div>
    </li>
  );
}
