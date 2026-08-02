"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { regions as builtInRegions } from "@/data/regions";
import { generateRegion } from "@/lib/generate-region";
import { Region } from "@/lib/puzzle-types";
import { BUTTON_COLORS, ButtonColor } from "@/lib/lcars-colors";
import {
  EMPTY_LOG,
  getSurveyLog,
  setArchived,
  subscribeSurveyLog,
  touchSurvey,
} from "@/lib/survey-log";
import { loadActiveRegionId, saveActiveRegionId } from "@/lib/active-region";
import { unlockAudio } from "@/lib/sound";
import { BELOW_LG, useMediaQuery } from "@/lib/use-media-query";
import { NavRail, NavItem } from "@/components/NavRail";
import { MobileMenu } from "@/components/MobileMenu";
import { MobilePanelBar } from "@/components/MobilePanelBar";
import { SoundToggle } from "@/components/SoundToggle";
import { BriefingPanel } from "@/components/panels/BriefingPanel";
import { StarManifestPanel } from "@/components/panels/StarManifestPanel";
import { StarMapPanel } from "@/components/panels/StarMapPanel";
import { SweepScopePanel } from "@/components/panels/SweepScopePanel";
import { RingScanPanel } from "@/components/panels/RingScanPanel";
import { LogPanel } from "@/components/panels/LogPanel";
import { HelpPanel } from "@/components/panels/HelpPanel";
import { PrototypesPanel } from "@/components/panels/PrototypesPanel";
import { NoActiveAssignmentPanel } from "@/components/NoActiveAssignmentPanel";
import { StationInfoPanel } from "@/components/panels/StationInfoPanel";
import { ProfilePanel } from "@/components/panels/ProfilePanel";
import { OfficerBadge } from "@/components/OfficerBadge";
import { StationLoadingScreen } from "@/components/StationLoadingScreen";
import { LcarsPanel } from "@/components/LcarsShell";
import { GAME_NAME, OUTPOST_NAME, PANEL_LABELS } from "@/lib/copy";

// "starmap" and "menu" only exist below `lg`: the map loses its permanent
// sidebar and becomes a panel like any other, and "menu" is the phone
// landing hub that stands in for the two rails. Both resolve to Briefing on
// desktop, where neither is reachable.
type PanelId =
  | "briefing"
  | "manifest"
  | "sweep"
  | "ringscan"
  | "log"
  | "help"
  | "prototypes"
  | "station"
  | "profile"
  | "starmap"
  | "menu";

const MOBILE_ONLY_PANELS: PanelId[] = ["starmap", "menu"];

const PRIMARY_NAV: NavItem[] = [
  { id: "briefing", label: "Briefing", color: "orange" },
  { id: "manifest", label: PANEL_LABELS.manifest, color: "lilac" },
  { id: "sweep", label: PANEL_LABELS.sweep, color: "violet" },
  { id: "ringscan", label: PANEL_LABELS.ringScan, color: "salmon" },
  { id: "log", label: "Log", color: "amber" },
];

// "generate" isn't a real panel - selecting it fires an action (generate a
// region + jump to Briefing) instead of switching views. It's still just
// another item in this rail visually, handled as a special case in the
// rail's onSelect below.
const UTILITY_NAV: NavItem[] = [
  { id: "profile", label: "Officer", color: "lilac" },
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

// Below `lg` both rails are replaced by the menu hub, with the star map
// joining as a real destination. Amber to match its own panel header - the
// tie to the thing it opens is worth more here than keeping every entry a
// different color, which the rails don't manage either.
const STARMAP_NAV: NavItem = { id: "starmap", label: "Star Map", color: "amber" };
const MOBILE_NAV: NavItem[] = [PRIMARY_NAV[0], STARMAP_NAV, ...PRIMARY_NAV.slice(1), ...UTILITY_NAV];

// Panel titles for the phone panel bar. Everything reachable from the menu
// is titled by the menu entry that opened it, so the two can't drift; only
// Station Info needs its own, since you get there from Briefing's emblem
// rather than from the menu.
const MOBILE_TITLES: Record<string, string> = {
  ...Object.fromEntries(MOBILE_NAV.map((item) => [item.id, item.label])),
  station: OUTPOST_NAME,
};

export function AppShell() {
  // Starts on the menu, which is the phone landing view and resolves to
  // Briefing on desktop - so desktop still opens on Briefing exactly as
  // before, without needing to know the viewport during the first render.
  const [requestedPanel, setRequestedPanel] = useState<PanelId>("menu");

  // Drives which layout is *mounted*, not just which is visible - see
  // use-media-query.ts for why that distinction is load-bearing.
  const isMobile = useMediaQuery(BELOW_LG);

  // Resolving the phone-only panels here rather than redirecting in an
  // effect avoids a cascading render, and has the nicer side effect of
  // being reversible: widening the window shows Briefing (the map is in the
  // sidebar by then anyway), and narrowing it again puts you back where you
  // left off.
  const panel: PanelId =
    !isMobile && MOBILE_ONLY_PANELS.includes(requestedPanel) ? "briefing" : requestedPanel;

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

  // Generated regions used to exist only in the state above, so a refresh
  // stranded whichever survey you were in the middle of - it stayed in the
  // Log, viewable but no longer selectable. Nothing was actually lost: the
  // log carries a full snapshot of every generated region, which is what
  // lets the Log panel render them at all. This puts them back on the
  // roster and re-selects the one that was active.
  //
  // It also makes Archive mean what it says. The Briefing picker is meant
  // to list your unarchived surveys, but generated ones vanished on reload
  // regardless, so archiving them changed nothing.
  const [restoredRoster, setRestoredRoster] = useState(false);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore
       from localStorage on mount; the server has no storage to read. */
    const saved = getSurveyLog()
      .filter((e) => e.origin === "generated" && e.region)
      .map((e) => e.region!);
    if (saved.length > 0) {
      setRegions((prev) => {
        const known = new Set(prev.map((r) => r.id));
        return [...prev, ...saved.filter((r) => !known.has(r.id))];
      });
    }
    const lastActive = loadActiveRegionId();
    if (lastActive) setRegionId(lastActive);
    setRestoredRoster(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Held back until the restore has run, or the first commit would persist
  // the default built-in id straight over whatever was actually saved.
  useEffect(() => {
    if (restoredRoster) saveActiveRegionId(regionId);
  }, [regionId, restoredRoster]);

  // Prime the sound engine's AudioContext ahead of the first real sound
  // effect. Constructing it here (no gesture required for that part) pays
  // most of the one-time setup cost before anyone's clicked anything; the
  // pointerdown listener catches the actual unlock gesture as early as
  // possible too, so it's already resumed by the time a button's own click
  // handler gets around to playing a sound a tick later. Otherwise all of
  // that latency lands on whichever click happens to be first.
  useEffect(() => {
    unlockAudio();
    const unlock = () => unlockAudio();
    document.addEventListener("pointerdown", unlock, { once: true, capture: true });
    return () => document.removeEventListener("pointerdown", unlock, { capture: true });
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
    setRequestedPanel(id as PanelId);
    if (id === "sweep") setVisitedSweep(true);
    if (id !== "log") setLogPreviewRegion(null);
  }

  function handleNavSelect(id: string) {
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

  /**
   * Pick a survey back up from the Log. Distinct from previewing it, which
   * is what clicking the card does and deliberately leaves the active
   * survey alone.
   *
   * Un-archives on the way through, because archived means "hidden from
   * the Briefing picker" and that is also what `noActiveAssignment` keys
   * off - resuming an archived region without this would make it active
   * and then show the no-assignment placeholder instead of it.
   */
  function resumeRegion(target: Region) {
    setArchived(target.id, false);
    setRegionId(target.id);
    setLogPreviewRegion(null);
    selectPanel("briefing");
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

  // Rendered into the sidebar on desktop and into `main` below `lg`, but
  // never both at once - each call site is gated on `isMobile`, so there is
  // structurally only ever one StarMap alive to write placements.
  const starMapView = (
    <>
      {panel === "log" && logPreviewRegion && logPreviewRegion.id !== region.id && (
        <p className="lcars-caps text-[10px] tracking-wider text-lcars-amber/80 mb-2 px-1">
          Previewing from Log &mdash; not your active survey
        </p>
      )}
      <StarMapPanel region={starMapRegion} />
    </>
  );

  return (
    // The viewport shell never scrolls, on any width - that's a standing
    // LCARS rule (see docs/lcars-style-notes.md). Anything too tall falls
    // back to a hidden-scrollbar flick-scroll inside `main`.
    <div id="app-shell" className="flex-1 flex flex-col gap-3 p-3 md:p-6 h-full overflow-hidden">
      {/* Phone-sized type here is doing real work, not just tidying: at the
          desktop sizes the title and subtitle each wrapped to two lines,
          making the header 108px of an 844px screen. One line each brings
          it to roughly half that, and the Star Map only needed ~19px more
          than it had. */}
      <header id="app-header" className="flex items-stretch gap-3 shrink-0">
        <div className="w-10 md:w-24 bg-lcars-orange rounded-tl-[2rem] rounded-bl-[2rem]" />
        <div className="flex-1 flex items-center justify-between gap-3 bg-lcars-orange rounded-tr-[2rem] px-3 md:px-8 py-2 md:py-4">
          <div className="min-w-0">
            <h1 className="lcars-caps text-lg md:text-4xl font-bold text-black leading-none">
              {GAME_NAME}
            </h1>
            <p className="lcars-caps text-[10px] md:text-sm text-black/70 mt-0.5 md:mt-1 truncate">
              Deep Space Survey &mdash; {OUTPOST_NAME}
            </p>
          </div>
          {/* The officer on duty, always visible and always next to their
              insignia - rank is the thing the record is about, and a name
              without one is just a string. The name drops below `md`,
              where the header is already one line of title and there is
              no room for a second column of text; the insignia stays,
              since it's the part that carries the rank. */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <OfficerBadge
              id="officer-badge"
              onClick={() => selectPanel("profile")}
              nameClassName="hidden md:block"
            />
            <SoundToggle />
          </div>
        </div>
      </header>

      {/* `main` keeps the same position in the tree either way, so crossing
          the breakpoint restyles the layout without remounting any panel -
          Sweep Scope's background clock in particular survives a resize. */}
      <div className={isMobile ? "flex flex-col flex-1 min-h-0 gap-3" : "flex flex-1 min-h-0"}>
        {isMobile && panel !== "menu" && (
          <MobilePanelBar
            id="mobile-panel-bar"
            title={MOBILE_TITLES[panel] ?? ""}
            onBack={() => selectPanel("menu")}
          />
        )}
        {!isMobile && (
          <NavRail
            id="nav-rail-primary"
            items={PRIMARY_NAV}
            fillerColors={LEFT_RAIL_FILLERS}
            activeId={panel}
            onSelect={selectPanel}
            indicatorSide="right"
            /* max-lg:hidden covers the pre-hydration frame only. The server
               can't measure a viewport, so a phone's first paint is the
               desktop layout - and that layout squeezes `main` to zero
               width, which looks broken rather than merely wrong. Hiding
               the desktop-only columns in CSS lets that frame render as
               header + full-width content until the menu appears. Once
               hydrated these three aren't rendered below `lg` at all, so
               the class never gets a chance to apply. */
            className="w-32 md:w-40 shrink-0 mr-[48px] max-lg:hidden"
          />
        )}

        <main
          id="main-content"
          data-panel={panel}
          className="flex-1 min-w-0 min-h-0 overflow-y-auto no-scrollbar"
        >
          {panel === "menu" && (
            <MobileMenu id="mobile-menu" items={MOBILE_NAV} onSelect={handleNavSelect} />
          )}
          {panel === "briefing" &&
            (generating ? (
              /* Titled to match the placeholder this replaces. Without the
                 title bar the content box is ~30px taller and starts
                 higher, which moved the emblem on the swap. */
              <LcarsPanel
                id="briefing-loading"
                title="Active Assignment"
                accent="bg-lcars-orange"
                className="h-full"
              >
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
          {panel === "ringscan" &&
            (noActiveAssignment ? (
              <LcarsPanel id="ringscan-placeholder" title={PANEL_LABELS.ringScan} accent="bg-lcars-salmon" className="h-full">
                <NoActiveAssignmentPanel onOpenStationInfo={openStationInfo} />
              </LcarsPanel>
            ) : (
              <RingScanPanel region={region} />
            ))}
          {panel === "station" && (
            <StationInfoPanel showHeader={!isMobile} onBack={() => selectPanel("briefing")} />
          )}
          {panel === "log" && (
            <LogPanel
              builtInRegions={builtInRegions}
              activeRegionId={region.id}
              previewRegionId={logPreviewRegion?.id ?? null}
              onPreviewRegion={setLogPreviewRegion}
              onResumeRegion={resumeRegion}
            />
          )}
          {panel === "profile" && <ProfilePanel />}
          {panel === "help" && <HelpPanel />}
          {panel === "prototypes" && (
            <PrototypesPanel region={noActiveAssignment ? null : region} />
          )}
          {isMobile && panel === "starmap" && starMapView}
        </main>

        {!isMobile && (
          <div
            id="starmap-sidebar"
            className="w-[360px] shrink-0 min-h-0 overflow-y-auto no-scrollbar ml-[20px] max-lg:hidden"
          >
            {starMapView}
          </div>
        )}

        {!isMobile && (
          <NavRail
            id="nav-rail-utility"
            items={UTILITY_NAV}
            activeId={panel}
            onSelect={handleNavSelect}
            indicatorSide="left"
            className="w-28 md:w-36 shrink-0 ml-[48px] max-lg:hidden"
          />
        )}
      </div>
    </div>
  );
}
