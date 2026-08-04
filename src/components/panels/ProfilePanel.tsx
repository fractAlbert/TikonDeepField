"use client";

import { useState } from "react";
import {
  DEMOTION_RETRACTED,
  PROMOTION_CONFIRMED,
  RANKS,
  RELIEVED,
  REVIEW_WINDOW,
  SurveyOutcome,
  rankAt,
  rankHex,
  rankTitle,
  reviewOutlook,
  tallyOutcomes,
} from "@/lib/ranks";
import {
  RankEvent,
  renamePlayer,
  rerollPlayerName,
  retireCareer,
  reviewWindow,
} from "@/lib/player";
import { restartTutorial } from "@/lib/station";
import { usePlayer } from "@/lib/use-player";
import { useStation } from "@/lib/use-station";
import { playButtonClick, playReset } from "@/lib/sound";
import { LcarsPanel } from "@/components/LcarsShell";
import { LcarsButton } from "@/components/LcarsButton";
import { RankInsignia } from "@/components/RankInsignia";
import { RankLadderModal } from "@/components/RankLadderModal";
import { ServiceRecord } from "@/components/ServiceRecord";

const OUTCOME_STYLE: Record<SurveyOutcome, { label: string; chip: string }> = {
  confirmed: { label: "Confirmed", chip: "bg-lcars-teal text-black" },
  retracted: { label: "Retracted", chip: "bg-lcars-red text-black" },
  withdrawn: { label: "Withdrawn", chip: "bg-lcars-ice/70 text-black" },
};

const REASON_LABEL: Record<RankEvent["reason"], string> = {
  commission: "Commissioned",
  promotion: "Promoted",
  demotion: "Demoted",
  relieved: "Relieved of duty",
  retired: "Retired",
  // Reinstatement no longer happens - relief ends the career - but a
  // profile from before 2026-08-04 can still carry one in its history, and
  // the history is the point of the record.
  reinstatement: "Reinstated",
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ProfilePanel() {
  const { player, commissioned } = usePlayer();
  const station = useStation();
  const [draftName, setDraftName] = useState<string | null>(null);
  const [showLadder, setShowLadder] = useState(false);
  // Retirement is irreversible, so it takes the same two-click arming the
  // Star Map's Withdraw does rather than a dialog - easy to reach,
  // impossible to hit by accident.
  const [confirmingRetire, setConfirmingRetire] = useState(false);

  if (!commissioned) {
    // Pre-hydration and the first frame after it. Deliberately not a
    // skeleton of the real layout - the profile is one screen, and a
    // flash of the wrong officer would be worse than a beat of nothing.
    return (
      <LcarsPanel title="Personnel Record" accent="bg-lcars-lilac" className="h-full">
        <p className="text-sm text-lcars-ice/50">Reading personnel file…</p>
      </LcarsPanel>
    );
  }

  const rank = rankAt(player.rank);
  const relieved = player.rank === RELIEVED;
  const windowOutcomes = reviewWindow(player);
  const tally = tallyOutcomes(windowOutcomes);
  const career = tallyOutcomes(player.outcomes.map((o) => o.outcome));

  function commitName() {
    if (draftName !== null && draftName.trim()) renamePlayer(draftName);
    setDraftName(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {showLadder && (
        <RankLadderModal currentRank={player.rank} onClose={() => setShowLadder(false)} />
      )}

      <LcarsPanel title="Personnel Record" accent="bg-lcars-lilac">
        <div className="flex items-start gap-4">
          <RankInsignia rank={player.rank} size={72} className="mt-0.5" />

          <div className="flex-1 min-w-0">
            {draftName !== null ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitName();
                    if (e.key === "Escape") setDraftName(null);
                  }}
                  maxLength={40}
                  aria-label="Officer name"
                  className="min-w-0 flex-1 bg-black/40 rounded-lg px-3 py-1.5 text-lg font-semibold text-lcars-ice outline-none ring-1 ring-lcars-lilac/60 focus:ring-lcars-amber"
                />
                <button
                  type="button"
                  onClick={() => {
                    playButtonClick();
                    commitName();
                  }}
                  className="lcars-caps text-[11px] font-semibold rounded-full px-3 py-1 bg-lcars-teal text-black cursor-pointer hover:bg-lcars-ice transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playButtonClick();
                    setDraftName(rerollPlayerName());
                  }}
                  className="lcars-caps text-[11px] font-semibold rounded-full px-3 py-1 bg-lcars-violet text-black cursor-pointer hover:bg-lcars-lilac transition-colors"
                >
                  Reroll
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playButtonClick();
                    setDraftName(null);
                  }}
                  className="lcars-caps text-[11px] font-semibold rounded-full px-3 py-1 bg-white/15 text-lcars-ice cursor-pointer hover:bg-white/25 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xl font-semibold text-lcars-ice leading-none">
                  {player.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playButtonClick();
                    setDraftName(player.name);
                  }}
                  className="lcars-caps text-[10px] font-semibold tracking-wide rounded-full px-2.5 py-0.5 bg-white/15 text-lcars-ice cursor-pointer hover:bg-white/25 transition-colors"
                >
                  Rename
                </button>
              </div>
            )}

            <div
              className="lcars-caps text-sm font-semibold mt-2"
              style={{ color: rankHex(player.rank) }}
            >
              {rankTitle(player.rank)}
            </div>
            <p className="text-xs text-lcars-ice/60 leading-relaxed mt-1 max-w-prose">
              {relieved ? "Off the survey roster. The commission is withdrawn." : rank?.blurb}
            </p>
            <p className="font-mono text-[11px] text-lcars-ice/40 mt-2">
              Personnel file {player.serviceNumber} &middot; commissioned{" "}
              {formatDate(player.commissionedAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <LcarsButton color="lilac" onClick={() => setShowLadder(true)} className="text-sm">
            Rank Structure
          </LcarsButton>
          {/* Replay rather than "if you've never played": people re-read
              tutorials, and the walk-through is the only place several of
              the instruments are actually explained by using them. It takes
              effect on the next empty board - the welcome screen is what
              offers it, and that only appears with nothing on the roster. */}
          <LcarsButton
            color="violet"
            className="text-sm"
            onClick={() => {
              playButtonClick();
              restartTutorial();
            }}
          >
            Replay Training
          </LcarsButton>
        </div>
        <p className="text-[11px] text-lcars-ice/40 leading-relaxed mt-2">
          Training replays from the welcome screen, which appears when you
          have no surveys on the roster. Archive what you have open to get
          back to it.
        </p>

        {/* Stand down. Kept at the bottom of the file it closes, and away
            from the row above - the controls up there are all reversible
            and this one is not. Available at any rank, including mid-survey:
            the confirmation carries the weight, and "you may not retire
            while you have work open" is a rule with nothing behind it. */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (!confirmingRetire) {
                  playButtonClick();
                  setConfirmingRetire(true);
                  return;
                }
                playReset();
                retireCareer();
              }}
              onBlur={() => setConfirmingRetire(false)}
              className={`lcars-caps text-xs px-4 py-1.5 rounded-full font-semibold cursor-pointer transition-colors ${
                confirmingRetire
                  ? "bg-lcars-red text-black hover:bg-lcars-salmon"
                  : "bg-lcars-panel text-lcars-ice/80 hover:bg-white/15"
              }`}
            >
              {confirmingRetire ? "Confirm retirement" : "Retire"}
            </button>
            <span className="text-[11px] text-lcars-ice/40 leading-relaxed max-w-prose">
              {confirmingRetire
                ? "This closes the career for good. Open surveys end with it, and a new officer starts from Science Officer."
                : "Stand down at your current rank. The file closes on your terms and stays on the service record — which is the difference between retiring and being relieved."}
            </span>
          </div>
        </div>
      </LcarsPanel>

      <LcarsPanel title="Standing" accent="bg-lcars-amber">
        <RankLadderStrip current={player.rank} />

        {relieved ? (
          <div className="mt-4 rounded-lg bg-lcars-red/20 ring-1 ring-lcars-red/60 p-3">
            <div className="lcars-caps text-xs font-semibold text-lcars-red">
              Relieved of Survey Duty
            </div>
            <p className="text-xs text-lcars-ice/70 leading-relaxed mt-1.5">
              The career is over. There is no route back onto the ladder from
              here &mdash; the record stands as it is, and a new officer starts
              a new file.
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-2">
              <span className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50">
                Catalog Integrity Review
              </span>
              <span className="font-mono text-[11px] text-lcars-ice/40">
                {tally.total} / {REVIEW_WINDOW} regions closed
              </span>
            </div>

            <ReviewWindowStrip outcomes={windowOutcomes} />

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 font-mono text-[11px]">
              <span className="text-lcars-teal">
                {tally.confirmed} confirmed
                <span className="text-lcars-ice/35"> / {PROMOTION_CONFIRMED} to promote</span>
              </span>
              <span className="text-lcars-red">
                {tally.retracted} retracted
                <span className="text-lcars-ice/35"> / {DEMOTION_RETRACTED} to demote</span>
              </span>
              <span className="text-lcars-ice/50">{tally.withdrawn} withdrawn</span>
            </div>

            <p className="text-xs text-lcars-ice/65 leading-relaxed mt-2">
              {reviewOutlook(windowOutcomes)}
            </p>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-lcars-ice/45">
          <span>Career: {player.outcomes.length} regions closed</span>
          <span>{career.confirmed} confirmed</span>
          <span>{career.retracted} retracted</span>
          <span>{career.withdrawn} withdrawn</span>
        </div>
      </LcarsPanel>

      <LcarsPanel title="Service History" accent="bg-lcars-violet">
        {player.history.length === 0 ? (
          <p className="text-sm text-lcars-ice/50">No entries.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...player.history].reverse().map((event, i) => (
              <li key={`${event.at}-${i}`} className="flex items-center gap-3 rounded-lg bg-black/25 px-3 py-2">
                <RankInsignia rank={event.to} size={30} title="" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold" style={{ color: rankHex(event.to) }}>
                    {rankTitle(event.to)}
                  </div>
                  <div className="text-[11px] text-lcars-ice/45 font-mono">
                    {REASON_LABEL[event.reason]}
                    {event.reason !== "commission" && event.reason !== "reinstatement" && (
                      <> from {rankTitle(event.from)}</>
                    )}
                    {" · "}
                    {formatDate(event.at)}
                  </div>
                </div>
                {(event.reason === "promotion" ||
                  event.reason === "demotion" ||
                  event.reason === "relieved") && (
                  /* The window that produced the decision, so a demotion
                     never reads as arbitrary. */
                  <div className="font-mono text-[10px] text-lcars-ice/40 text-right shrink-0 leading-tight">
                    <div className="text-lcars-teal/70">{event.confirmed} conf</div>
                    <div className="text-lcars-red/70">{event.retracted} retr</div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </LcarsPanel>

      {/* Renders nothing until there is a career on file, so a first-career
          player never sees an empty panel asking them to notice it. */}
      <ServiceRecord careers={station.careers} />
    </div>
  );
}

/** The ladder as a run of rungs, filled up to the officer's current rank. */
function RankLadderStrip({ current }: { current: number }) {
  return (
    <div className="flex gap-1">
      {RANKS.map((rank) => {
        const held = current >= rank.index;
        const isCurrent = current === rank.index;
        return (
          <div
            key={rank.index}
            title={rank.title}
            className={`flex-1 min-w-0 rounded-md px-1.5 py-2 text-center ${
              isCurrent ? "ring-1 ring-white/40" : ""
            }`}
            style={{
              backgroundColor: held ? rank.hex : "rgba(255,255,255,0.06)",
              color: held ? "#000" : "rgba(232,240,247,0.4)",
            }}
          >
            <div className="lcars-caps text-[10px] font-bold leading-none">{rank.short}</div>
            <div className="text-[9px] leading-tight mt-1 truncate">{rank.rung}</div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The current review window as one slot per region, oldest first, with the
 * unfilled slots left visible - seeing how many are left is most of the
 * tension.
 */
function ReviewWindowStrip({ outcomes }: { outcomes: SurveyOutcome[] }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: REVIEW_WINDOW }).map((_, i) => {
        const outcome = outcomes[i];
        return (
          <div
            key={i}
            title={outcome ? OUTCOME_STYLE[outcome].label : "Not yet closed"}
            className={`flex-1 h-6 rounded-md flex items-center justify-center ${
              outcome ? OUTCOME_STYLE[outcome].chip : "bg-white/10"
            }`}
          >
            <span className="lcars-caps text-[10px] font-bold">
              {outcome ? OUTCOME_STYLE[outcome].label[0] : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
