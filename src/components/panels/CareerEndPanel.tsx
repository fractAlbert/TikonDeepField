"use client";

// The end of a career, and the only way out of one.
//
// Two endings reach this screen and they are not the same event. Relief is
// the loss state - a failed review at the bottom rung - and it arrives
// without being asked for. Retirement is the officer's own decision at
// whatever rank they held, and it is the reason relief could be made
// terminal at all: without it the only way to finish a career is to fail
// one, which turns the ladder into something you can only fall off.
//
// It replaces the whole layout rather than sitting in `main` as a panel.
// Surveying has stopped, so leaving the rails up would offer eleven
// destinations that all say "no active assignment" - and the one thing this
// screen has to be is final.

import { PlayerProfile } from "@/lib/player";
import { PastCareer } from "@/lib/station";
import { RELIEVED, rankHex, rankTitle, tallyOutcomes } from "@/lib/ranks";
import { LcarsPanel } from "@/components/LcarsShell";
import { LcarsButton } from "@/components/LcarsButton";
import { RankInsignia } from "@/components/RankInsignia";
import { ServiceRecord } from "@/components/ServiceRecord";

/** Fixed-width readouts, never trimmed - see docs/lcars-style-notes.md. */
const pad = (n: number) => String(n).padStart(2, "0");

const ENDING = {
  relieved: {
    label: "Relieved of Survey Duty",
    accent: "bg-lcars-red",
    hex: "var(--lcars-red)",
    detail:
      "The catalog integrity review found against you at the bottom of the ladder. Your commission is withdrawn and the file is closed.",
    coda:
      "This career is over. The station keeps the record — every survey you filed is still in the regional catalog, for better or worse.",
  },
  retired: {
    label: "Retired from Survey Duty",
    accent: "bg-lcars-teal",
    hex: "var(--lcars-teal)",
    detail: "You stood down at your own request, with the file in good order.",
    coda:
      "This career is over, and it ended on your terms. The rank you retired at is the rank the record will always show.",
  },
} as const;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CareerEndPanel({
  player,
  careers,
  onBeginNewCareer,
}: {
  player: PlayerProfile;
  /** The service record, which already includes the career just closed. */
  careers: PastCareer[];
  onBeginNewCareer: () => void;
}) {
  const reason = player.ended?.reason ?? "retired";
  const style = ENDING[reason];
  const career = tallyOutcomes(player.outcomes.map((o) => o.outcome));
  const relieved = player.rank === RELIEVED;

  return (
    <div className="flex flex-col gap-4 max-w-[900px]">
      <LcarsPanel title="Career Closed" accent={style.accent}>
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
          </div>
        </div>

        <div className="flex items-start gap-4 mb-4">
          <RankInsignia rank={player.rank} size={72} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="lcars-caps text-xl font-bold text-lcars-ice leading-none">
              {player.name}
            </div>
            <div
              className="lcars-caps text-sm font-semibold mt-1"
              style={{ color: rankHex(player.rank) }}
            >
              {relieved ? "Relieved of duty" : rankTitle(player.rank)}
            </div>
            <div className="font-mono text-[11px] text-lcars-ice/40 mt-1.5">
              {player.serviceNumber} &middot; {formatDate(player.commissionedAt)} &ndash;{" "}
              {player.ended ? formatDate(player.ended.at) : ""}
            </div>
          </div>
        </div>

        {/* The reference image's data-row idiom: a colour stub, a label, and
            a big number that is the actual content. */}
        <div className="flex flex-wrap gap-2">
          <Stat label="Confirmed" value={pad(career.confirmed)} hex="var(--lcars-teal)" />
          <Stat label="Retracted" value={pad(career.retracted)} hex="var(--lcars-red)" />
          <Stat label="Withdrawn" value={pad(career.withdrawn)} hex="var(--lcars-ice)" />
          <Stat label="Regions closed" value={pad(career.total)} hex="var(--lcars-amber)" />
        </div>

        <p className="text-xs text-lcars-ice/50 leading-relaxed mt-4">{style.coda}</p>

        <div className="flex flex-wrap items-center gap-3 mt-5">
          {/* The only control on the screen. A career that has ended has
              nothing else to offer, and pretending otherwise is what made
              the old relieved state weightless. */}
          <LcarsButton color="orange" onClick={onBeginNewCareer}>
            Begin a New Career
          </LcarsButton>
          <span className="text-[11px] text-lcars-ice/40 leading-relaxed">
            A new officer reports in at Science Officer. Your surveys close with
            this file; the service record below keeps every career.
          </span>
        </div>
      </LcarsPanel>

      <ServiceRecord careers={careers} />
    </div>
  );
}

function Stat({ label, value, hex }: { label: string; value: string; hex: string }) {
  return (
    <div className="flex rounded-md overflow-hidden grow basis-32">
      <div className="w-1.5 shrink-0" style={{ backgroundColor: hex }} />
      <div className="flex-1 min-w-0 bg-black/25 px-3 py-1.5">
        <div className="lcars-caps text-[10px] tracking-wider text-lcars-ice/45">{label}</div>
        <div
          className="font-mono text-xl font-bold tabular-nums leading-none mt-0.5"
          style={{ color: hex }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
