"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { regions as builtInRegions } from "@/data/regions";
import { generateRegion } from "@/lib/generate-region";
import { Region } from "@/lib/puzzle-types";
import { BUTTON_COLORS, ButtonColor } from "@/lib/lcars-colors";
import { EMPTY_LOG, getSurveyLog, subscribeSurveyLog, touchSurvey } from "@/lib/survey-log";
import { NavRail, NavItem } from "@/components/NavRail";
import { SoundToggle } from "@/components/SoundToggle";
import { BriefingPanel } from "@/components/panels/BriefingPanel";
import { StarManifestPanel } from "@/components/panels/StarManifestPanel";
import { StarMapPanel } from "@/components/panels/StarMapPanel";
import { SweepScopePanel } from "@/components/panels/SweepScopePanel";
import { QuadrantSurveyPanel } from "@/components/panels/QuadrantSurveyPanel";
import { LogPanel } from "@/components/panels/LogPanel";
import { HelpPanel } from "@/components/panels/HelpPanel";
import { PrototypesPanel } from "@/components/panels/PrototypesPanel";
import { NoActiveAssignmentPanel } from "@/components/NoActiveAssignmentPanel";
import { StationInfoPanel } from "@/components/panels/StationInfoPanel";
import { StationLoadingScreen } from "@/components/StationLoadingScreen";
import { LcarsPanel } from "@/components/LcarsShell";
import { GAME_NAME, OUTPOST_NAME, PANEL_LABELS } from "@/lib/copy";

type PanelId =
  | "briefing"
  | "manifest"
  | "sweep"
  | "survey"
  | "log"
  | "help"
  | "prototypes"
  | "station";

const PRIMARY_NAV: NavItem[] = [
  { id: "briefing", label: "Briefing", color: "orange" },
  { id: "manifest", label: PANEL_LABELS.manifest, color: "lilac" },
  { id: "sweep", label: PANEL_LABELS.sweep, color: "violet" },
  { id: "survey", label: PANEL_LABELS.survey, color: "salmon" },
  { id: "log", label: "Log", color: "amber" },
];

// "generate" isn't a real panel - selecting it fires an action (generate a
// region + jump to Briefing) instead of switching views. It's still just
// another item in this rail visually, handled as a special case in the
// rail's onSelect below.
const UTILITY_NAV: NavItem[] = [
  { id: "help", label: "Help", color: "ice" },
  { id: "prototypes", label: "Prototypes", color: "teal" },
  { id: "generate", label: PANEL_LABELS.surveyNewRegion, color: "orange" },
];

// Purely for flavor - the region is already generated before this starts,
// so nothing is actually blocked on it.
const GENERATE_DELAY_MS = 2200;

// Unlabeled, non-interactive filler segments padding out the left rail so
// it reads as a full LCARS panel rather than a handful of buttons over
// empty space.
const LEFT_RAIL_FILLERS: ButtonColor[] = Array.from(
  { length: 5 },
  (_, i) => BUTTON_COLORS[(i + PRIMARY_NAV.length) % BUTTON_COLORS.length]
);

export function AppShell() {
  const [panel, setPanel] = useState<PanelId>("briefing");
  const [regions, setRegions] = useState<Region[]>(builtInRegions);
  const [regionId, setRegionId] = useState(builtInRegions[0].id);
  const region = regions.find((r) => r.id === regionId) ?? regions[0];

  // Sweep Scope's clock starts the moment it first mounts, so mounting it
  // eagerly (hidden) at app load would mean it's already partway through
  // its first cycle by the time you actually click over to look at it -
  // showing up mid-sweep instead of starting from the left. Deferring the
  // mount until the first visit fixes that, while still never unmounting
  // it afterward - later switches away and back keep the clock running in
  // the background exactly as before.
  const [visitedSweep, setVisitedSweep] = useState(false);

  // A region picked from the Log is shown in the Star Map sidebar for
  // review without becoming the active survey - leaving the Log tab drops
  // back to whatever the active region actually is.
  const [logPreviewRegion, setLogPreviewRegion] = useState<Region | null>(null);

  // Whether Survey New Region's flavor delay is in progress - Briefing shows
  // the loading screen instead of its normal content while this is true.
  const [generating, setGenerating] = useState(false);

  // Archived-state (and therefore noActiveAssignment) isn't known until the
  // survey log has synced from localStorage post-hydration - defaulting to
  // "not mounted yet" means every panel starts on the placeholder and only
  // reveals real mission content once that's actually settled, instead of
  // briefly showing content that then has to be yanked back.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-time
       mount flag, same pattern as the localStorage-sync effects elsewhere. */
    setMounted(true);
  }, []);

  const builtInIds = useMemo(() => new Set(builtInRegions.map((r) => r.id)), []);
  const log = useSyncExternalStore(subscribeSurveyLog, getSurveyLog, () => EMPTY_LOG);
  const archivedIds = useMemo(
    () => new Set(log.filter((e) => e.archived).map((e) => e.regionId)),
    [log]
  );
  // Empty until mounted for the same reason noActiveAssignment is forced
  // true until then - otherwise this briefly lists regions (including ones
  // that are actually archived) straight from the pre-hydration empty log
  // snapshot, before correcting itself a moment later.
  const briefingRegions = useMemo(
    () => (mounted ? regions.filter((r) => !archivedIds.has(r.id)) : []),
    [regions, archivedIds, mounted]
  );

  useEffect(() => {
    touchSurvey(region, builtInIds.has(region.id) ? "builtin" : "generated");
  }, [region, builtInIds]);

  function selectPanel(id: string) {
    setPanel(id as PanelId);
    if (id === "sweep") setVisitedSweep(true);
    if (id !== "log") setLogPreviewRegion(null);
  }

  function handleUtilitySelect(id: string) {
    if (id === "generate") {
      // Generate immediately (it's fast either way) but hold the reveal
      // behind a deliberate delay - the loading screen is purely flavor.
      const generated = generateRegion();
      setGenerating(true);
      selectPanel("briefing");
      setTimeout(() => {
        setRegions((prev) => [...prev, generated]);
        setRegionId(generated.id);
        setGenerating(false);
      }, GENERATE_DELAY_MS);
    } else {
      selectPanel(id);
    }
  }

  function openStationInfo() {
    selectPanel("station");
  }

  // Archiving the active region leaves nothing meaningful to show it as -
  // browsing the Log tab is an intentional exception, since a previewed
  // entry may itself be archived without that meaning "nothing is active."
  // Forced true until mounted, so the first paint never guesses wrong.
  const noActiveAssignment = !mounted || archivedIds.has(region.id);

  // The Star Map always shows the field itself; it just has nothing
  // selectable when there's no active survey to plot (null region).
  const starMapRegion: Region | null =
    panel === "log" && logPreviewRegion ? logPreviewRegion : noActiveAssignment ? null : region;

  return (
    <div id="app-shell" className="flex-1 flex flex-col gap-3 p-3 md:p-6 h-full overflow-hidden">
      <header id="app-header" className="flex items-stretch gap-3 shrink-0">
        <div className="w-16 md:w-24 bg-lcars-orange rounded-tl-[2rem] rounded-bl-[2rem]" />
        <div className="flex-1 flex items-center justify-between gap-3 bg-lcars-orange rounded-tr-[2rem] px-4 md:px-8 py-3 md:py-4">
          <div>
            <h1 className="lcars-caps text-2xl md:text-4xl font-bold text-black leading-none">
              {GAME_NAME}
            </h1>
            <p className="lcars-caps text-xs md:text-sm text-black/70 mt-1">
              Deep Space Survey &mdash; {OUTPOST_NAME}
            </p>
          </div>
          <SoundToggle />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <NavRail
          id="nav-rail-primary"
          items={PRIMARY_NAV}
          fillerColors={LEFT_RAIL_FILLERS}
          activeId={panel}
          onSelect={selectPanel}
          indicatorSide="right"
          className="w-32 md:w-40 shrink-0 mr-[48px]"
        />

        <main id="main-content" data-panel={panel} className="flex-1 min-w-0 min-h-0 overflow-y-auto no-scrollbar">
          {panel === "briefing" &&
            (generating ? (
              <LcarsPanel id="briefing-loading" className="h-full">
                <StationLoadingScreen />
              </LcarsPanel>
            ) : (
              <BriefingPanel
                region={region}
                regions={briefingRegions}
                noActiveAssignment={noActiveAssignment}
                onSelectRegion={setRegionId}
                onOpenStationInfo={openStationInfo}
              />
            ))}
          {panel === "manifest" &&
            (noActiveAssignment ? (
              <LcarsPanel id="manifest-placeholder" title={PANEL_LABELS.manifest} accent="bg-lcars-lilac" className="h-full">
                <NoActiveAssignmentPanel onOpenStationInfo={openStationInfo} />
              </LcarsPanel>
            ) : (
              <StarManifestPanel region={region} />
            ))}
          {/* Mounted on first visit, then never unmounted (just hidden) -
              its sweep clock keeps running in the background against real
              elapsed time while you're on a different panel, instead of
              resetting every time you switch back to it. */}
          <div id="sweep-scope-container" className={panel === "sweep" && !noActiveAssignment ? "" : "hidden"}>
            {visitedSweep && (
              <SweepScopePanel region={region} visible={panel === "sweep" && !noActiveAssignment} />
            )}
          </div>
          {panel === "sweep" && noActiveAssignment && (
            <LcarsPanel id="sweep-placeholder" title={PANEL_LABELS.sweep} accent="bg-lcars-violet" className="h-full">
              <NoActiveAssignmentPanel onOpenStationInfo={openStationInfo} />
            </LcarsPanel>
          )}
          {panel === "survey" &&
            (noActiveAssignment ? (
              <LcarsPanel id="survey-placeholder" title={PANEL_LABELS.survey} accent="bg-lcars-salmon" className="h-full">
                <NoActiveAssignmentPanel onOpenStationInfo={openStationInfo} />
              </LcarsPanel>
            ) : (
              <QuadrantSurveyPanel region={region} />
            ))}
          {panel === "station" && <StationInfoPanel onBack={() => selectPanel("briefing")} />}
          {panel === "log" && (
            <LogPanel
              builtInRegions={builtInRegions}
              activeRegionId={region.id}
              previewRegionId={logPreviewRegion?.id ?? null}
              onPreviewRegion={setLogPreviewRegion}
            />
          )}
          {panel === "help" && <HelpPanel />}
          {panel === "prototypes" && <PrototypesPanel />}
        </main>

        <div
          id="starmap-sidebar"
          className="w-full lg:w-[360px] shrink-0 min-h-0 overflow-y-auto no-scrollbar ml-[20px]"
        >
          {panel === "log" && logPreviewRegion && logPreviewRegion.id !== region.id && (
            <p className="lcars-caps text-[10px] tracking-wider text-lcars-amber/80 mb-2 px-1">
              Previewing from Log &mdash; not your active survey
            </p>
          )}
          <StarMapPanel region={starMapRegion} />
        </div>

        <NavRail
          id="nav-rail-utility"
          items={UTILITY_NAV}
          activeId={panel}
          onSelect={handleUtilitySelect}
          indicatorSide="left"
          className="w-28 md:w-36 shrink-0 ml-[48px]"
        />
      </div>
    </div>
  );
}
