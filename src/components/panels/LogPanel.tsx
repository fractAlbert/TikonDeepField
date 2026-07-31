"use client";

import { useState, useSyncExternalStore } from "react";
import { Region } from "@/lib/puzzle-types";
import { quasarColorHex } from "@/lib/quasar-colors";
import { loadStarMapSave } from "@/lib/starmap-storage";
import {
  EMPTY_LOG,
  FILING_LIMIT,
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
}: {
  builtInRegions: Region[];
  activeRegionId: string;
  previewRegionId: string | null;
  onPreviewRegion: (region: Region) => void;
}) {
  const entries = useSyncExternalStore(subscribeSurveyLog, getSurveyLog, () => EMPTY_LOG);
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(entries.length / ENTRIES_PER_PAGE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageEntries = entries.slice(
    clampedPage * ENTRIES_PER_PAGE,
    clampedPage * ENTRIES_PER_PAGE + ENTRIES_PER_PAGE
  );

  return (
    <div className="flex flex-col gap-4">
      <LcarsPanel title="Survey Log" accent="bg-lcars-amber">
        <p className="text-sm text-lcars-ice/70 leading-relaxed mb-4">
          Every region survey you&apos;ve opened, with its progress. Click an
          entry to load it into the Star Map for review without changing your
          active survey. Archiving clears a survey from the Briefing
          panel&apos;s selection row without deleting its history here.
        </p>

        {entries.length === 0 ? (
          <p className="text-sm text-lcars-ice/50">
            No surveys begun yet. Select a region on the Briefing panel, or
            generate a new one, to start your log.
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
}: {
  entry: SurveyLogEntry;
  builtInRegions: Region[];
  isActive: boolean;
  isPreviewed: boolean;
  onPreviewRegion: (region: Region) => void;
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

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playButtonClick();
              setArchived(entry.regionId, !entry.archived);
            }}
            className="ml-auto lcars-caps text-[10px] font-semibold tracking-wide text-lcars-ice bg-white/15 hover:bg-white/25 rounded-full px-2.5 py-0.5 cursor-pointer transition-colors"
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
                style={{ backgroundColor: quasarColorHex(i) }}
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

        <p className="text-[11px] text-lcars-ice/40 font-mono">
          {/* Written as an explicit string because the plain version lost
              its leading space and rendered "3filings used". The original
              "verify attempts" line this replaced had the same bug, so
              it's worth recognising: it shows up when a JSX text node
              wraps across lines and contains an entity like &middot;. */}
          {placedCount} / {region.quasars.length} placed &middot; {spent} of {FILING_LIMIT}
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
