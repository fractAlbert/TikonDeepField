"use client";

import { useEffect } from "react";
import {
  DEMOTION_RETRACTED,
  PROMOTION_CONFIRMED,
  PROMOTION_MAX_RETRACTED,
  RANKS,
  RELIEVED,
  REVIEW_WINDOW,
} from "@/lib/ranks";
import { LcarsButton } from "@/components/LcarsButton";
import { RankInsignia } from "@/components/RankInsignia";

/**
 * The whole ladder, top rung first, with the rules that move you between
 * them spelled out. Reachable from the profile panel.
 *
 * The one overlay in the app, so the behaviour lives here rather than in a
 * shared Modal component - there's nothing yet to share it with, and a
 * second caller would want different sizing anyway. It scrolls internally
 * rather than growing the page: the shell itself must never scroll (see
 * docs/lcars-style-notes.md), and a fixed overlay is the one place that
 * rule can be honoured while still showing arbitrary content.
 */
export function RankLadderModal({
  currentRank,
  onClose,
}: {
  currentRank: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      id="rank-ladder-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-8 bg-black/75"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Survey rank structure"
    >
      <div
        className="bg-lcars-panel rounded-xl overflow-hidden flex flex-col w-full max-w-2xl max-h-full"
        /* The backdrop closes on click; the card must not, or every
           interaction inside it dismisses the thing being read. */
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-lcars-amber lcars-caps text-black font-semibold px-4 py-1.5 text-sm shrink-0 flex items-center justify-between gap-3">
          <span>Survey Rank Structure</span>
          <span className="text-black/60 text-[11px]">Tikon Research Station</span>
        </div>

        <div className="p-4 flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-3">
          {[...RANKS].reverse().map((rank) => {
            const isCurrent = rank.index === currentRank;
            return (
              <div
                key={rank.index}
                /* No ring. The current rung is already said twice - a
                   lifted fill and a solid amber "You" chip - and the
                   reference's way of marking a selection is exactly that,
                   two things swapped at once rather than a stroke drawn
                   round the outside. */
                className={`flex gap-3 rounded-lg p-3 ${
                  isCurrent ? "bg-white/10" : "bg-black/25"
                }`}
              >
                <RankInsignia rank={rank.index} size={44} title="" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold" style={{ color: rank.hex }}>
                      {rank.title}
                    </span>
                    <span className="font-mono text-[10px] text-lcars-ice/40">{rank.short}</span>
                    {isCurrent && (
                      <span className="lcars-caps text-[10px] font-semibold tracking-wide rounded-full px-2 py-0.5 bg-lcars-amber text-black">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-lcars-ice/75 leading-relaxed mt-1">{rank.blurb}</p>
                  <p className="text-[11px] text-lcars-ice/45 leading-relaxed mt-1.5">{rank.duty}</p>
                </div>
              </div>
            );
          })}

          <div
            className={`flex gap-3 rounded-lg p-3 ${
              currentRank === RELIEVED ? "bg-lcars-red/25" : "bg-black/25"
            }`}
          >
            <RankInsignia rank={RELIEVED} size={44} title="" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-lcars-red">Relieved of Survey Duty</span>
                {currentRank === RELIEVED && (
                  <span className="lcars-caps text-[10px] font-semibold tracking-wide rounded-full px-2 py-0.5 bg-lcars-red text-black">
                    You
                  </span>
                )}
              </div>
              <p className="text-xs text-lcars-ice/75 leading-relaxed mt-1">
                Off the ladder. Reached by failing a review while holding the lowest rank, which
                takes a sustained run of retractions rather than a bad afternoon.
              </p>
              <p className="text-[11px] text-lcars-ice/45 leading-relaxed mt-1.5">
                Reinstatement can be requested from your record, and puts you back on as a Survey
                Technician with a clean review window.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-black/25 p-3">
            <div className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50 mb-2">
              Catalog Integrity Review
            </div>
            <p className="text-xs text-lcars-ice/75 leading-relaxed">
              The station judges patterns, not single surveys. Every {REVIEW_WINDOW} closed
              regions your record is reviewed: {PROMOTION_CONFIRMED} or more confirmed with at
              most {PROMOTION_MAX_RETRACTED} retraction promotes you, {DEMOTION_RETRACTED} or more
              retractions demotes you, and anything else holds your rank. Withdrawing a region
              counts as neither - it never costs you a rank, and it never earns one.
            </p>
            <p className="text-[11px] text-lcars-ice/45 leading-relaxed mt-2">
              The window resets whenever your rank changes, so one bad stretch is only ever
              charged once.
            </p>
          </div>
        </div>

        <div className="shrink-0 p-3 pt-0 flex justify-end">
          <LcarsButton color="ice" onClick={onClose}>
            Close
          </LcarsButton>
        </div>
      </div>
    </div>
  );
}
