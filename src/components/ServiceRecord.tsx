"use client";

// Every career the station has on file, oldest first.
//
// This is what makes retiring a decision rather than a delete button: stand
// down at Chief of Survey and the roll says so, permanently, next to the
// one that ended at Survey Technician. Shown both on the career-end screen
// and on the Officer panel, because the second is where you go to *think*
// about retiring.

import { PastCareer } from "@/lib/station";
import { RELIEVED, rankHex, rankTitle } from "@/lib/ranks";
import { LcarsPanel } from "@/components/LcarsShell";
import { RankInsignia } from "@/components/RankInsignia";

const pad = (n: number) => String(n).padStart(2, "0");

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

export function ServiceRecord({ careers }: { careers: PastCareer[] }) {
  if (careers.length === 0) return null;

  return (
    <LcarsPanel title="Service Record" accent="bg-lcars-lilac">
      <p className="text-xs text-lcars-ice/50 leading-relaxed mb-3">
        {careers.length === 1 ? "One career" : `${careers.length} careers`} on
        file at this station.
      </p>
      <ul className="flex flex-col gap-1.5">
        {careers.map((c) => {
          const relieved = c.ending === "relieved";
          return (
            <li key={c.commissionedAt} className="flex rounded-md overflow-hidden">
              {/* The accent bar carries the ending, so the shape of a
                  record - a run of teal with one red in it - reads before
                  any of the text does. */}
              <div
                className="w-1.5 shrink-0"
                style={{ backgroundColor: relieved ? "var(--lcars-red)" : "var(--lcars-teal)" }}
              />
              <div className="flex-1 min-w-0 bg-black/25 px-3 py-2 flex items-center gap-3">
                <RankInsignia rank={c.finalRank} size={32} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-lcars-ice truncate">{c.name}</div>
                  <div
                    className="lcars-caps text-[11px] font-semibold"
                    style={{ color: rankHex(c.finalRank) }}
                  >
                    {c.finalRank === RELIEVED ? "Relieved of duty" : rankTitle(c.finalRank)}
                  </div>
                  <div className="font-mono text-[10px] text-lcars-ice/35 mt-0.5">
                    {c.serviceNumber} &middot; {formatDate(c.commissionedAt)} &ndash;{" "}
                    {formatDate(c.endedAt)} &middot; {relieved ? "relieved" : "retired"}
                  </div>
                </div>
                <div className="font-mono text-[11px] text-right shrink-0 tabular-nums leading-tight">
                  <div className="text-lcars-teal">{pad(c.confirmed)} conf</div>
                  <div className="text-lcars-red/80">{pad(c.retracted)} retr</div>
                  <div className="text-lcars-ice/40">{pad(c.withdrawn)} wdrn</div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </LcarsPanel>
  );
}
