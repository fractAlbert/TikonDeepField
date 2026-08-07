"use client";

// What a first run lands on, in place of the no-assignment placeholder.
//
// That placeholder is honest - it says you have no surveys and points at
// Survey New Region - but it is not a welcome, and since the default region
// was removed it is the literal first thing anybody sees. This replaces it
// only for a player with no surveys at all who has not finished or skipped
// the walk-through; the placeholder keeps its other job (*your regions are
// archived*), which is a different state entirely.
//
// Deliberately short. It is not a manual - the walk-through teaches the
// instruments by using them, and the Help panel is a page away. What this
// has to do is say what the job is and offer one obvious button.

import { OUTPOST_NAME, PANEL_LABELS } from "@/lib/copy";
import { RING_COUNT, SEGMENT_COUNT } from "@/lib/grid";
import { LcarsBreak, LcarsPanel } from "@/components/LcarsShell";
import { LcarsButton } from "@/components/LcarsButton";
import { StationEmblem } from "@/components/StationEmblem";
import { tutorialRegion } from "@/data/regions/tutorial";

export function WelcomePanel({
  officerName,
  resuming,
  onBeginTutorial,
  onSkip,
}: {
  /** Empty before the profile is read; the greeting drops rather than guesses. */
  officerName: string;
  /** True when a walk-through was started and left part-way. */
  resuming: boolean;
  onBeginTutorial: () => void;
  onSkip: () => void;
}) {
  return (
    <LcarsPanel
      id="welcome-panel"
      title="Welcome Aboard"
      accent="bg-lcars-teal"
      className="h-full"
    >
      <div className="flex flex-col h-full min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <div className="flex flex-wrap items-start gap-5">
            <div className="shrink-0 w-24 md:w-32 opacity-80">
              <StationEmblem />
            </div>

            <div className="flex-1 min-w-[240px]">
              <h2 className="lcars-caps text-xl md:text-2xl font-bold text-lcars-teal leading-none">
                {officerName ? `Officer ${officerName}` : "Officer"}
              </h2>
              {/* The `{" "}` after each interpolation is not optional: these
                  text nodes wrap across lines and contain an entity, which
                  is exactly when JSX drops the leading space and renders
                  "Stationcharts" / "5x8polar". */}
              <p className="text-sm text-lcars-ice/80 leading-relaxed mt-3">
                {OUTPOST_NAME}{" "}
                charts quasars in deep field. Sensors can tell you a signature
                exists and roughly how far it sits from something else
                &mdash; they cannot tell you where it is. That is your job.
              </p>
              <p className="text-sm text-lcars-ice/80 leading-relaxed mt-2.5">
                A survey hands you a {RING_COUNT}&times;{SEGMENT_COUNT}{" "}
                polar field, a handful of signatures, and a briefing with two
                exact positions in it. Everything else you triangulate. When
                you are sure, you file the census against the catalog
                &mdash; and the station keeps score.
              </p>
            </div>
          </div>

          {/* The three instruments, named once so the walk-through's panel
              switches aren't the first time they're seen. */}
          <div className="flex flex-wrap gap-2 mt-5">
            {[
              [PANEL_LABELS.sweep, "How far a signature is from a reference."],
              [PANEL_LABELS.ringScan, "Which ring one signature is in. Metered."],
              [PANEL_LABELS.manifest, "Everything you have actually observed."],
            ].map(([name, note]) => (
              <div key={name} className="flex rounded-md overflow-hidden grow basis-52">
                <div className="w-1.5 shrink-0 bg-lcars-violet" />
                <div className="flex-1 min-w-0 bg-black/25 px-3 py-2">
                  <div className="lcars-caps text-[11px] font-semibold text-lcars-violet">
                    {name}
                  </div>
                  <div className="text-[11px] text-lcars-ice/55 leading-relaxed mt-0.5">
                    {note}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <LcarsBreak className="shrink-0 mt-4" />
        <div className="shrink-0 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <LcarsButton color="teal" onClick={onBeginTutorial}>
              {resuming ? "Resume training survey" : "Begin training survey"}
            </LcarsButton>
            <LcarsButton color="orange" onClick={onSkip}>
              Skip &mdash; {PANEL_LABELS.surveyNewRegion}
            </LcarsButton>
          </div>
          <p className="text-[11px] text-lcars-ice/40 leading-relaxed mt-2.5">
            The training survey is a real region &mdash; {tutorialRegion.name},
            walked through step by step. Finishing it counts toward your
            record like any other; failing it does not count against you. You
            can replay or skip it any time from the Officer panel.
          </p>
        </div>
      </div>
    </LcarsPanel>
  );
}
