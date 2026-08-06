"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { regions as builtInRegions } from "@/data/regions";
import { generateRegion } from "@/lib/generate-region";
import { assessSolvability } from "@/lib/solvability";
import { Region } from "@/lib/puzzle-types";
import { BUTTON_COLORS, ButtonColor } from "@/lib/lcars-colors";
import {
  ACTIVE_SURVEY_LIMIT,
  EMPTY_LOG,
  activeSurveys,
  getSurveyLog,
  resolveEntryRegion,
  setArchived,
  subscribeSurveyLog,
  touchSurvey,
} from "@/lib/survey-log";
import { loadActiveRegionId, saveActiveRegionId } from "@/lib/active-region";
import { unlockAudio } from "@/lib/sound";
import { BELOW_LG, useMediaQuery } from "@/lib/use-media-query";
import { NavRail, NavItem } from "@/components/NavRail";
import { MobileJumpBar } from "@/components/MobileJumpBar";
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
import { StationEmblem } from "@/components/StationEmblem";
import { StationLoadingScreen } from "@/components/StationLoadingScreen";
import { SurveyReportPanel } from "@/components/panels/SurveyReportPanel";
import { WelcomePanel } from "@/components/panels/WelcomePanel";
import { TutorialCoach } from "@/components/TutorialCoach";
import { TUTORIAL_STEPS, TutorialProgress } from "@/lib/tutorial";
import { TUTORIAL_REGION_ID, tutorialRegion } from "@/data/regions/tutorial";
import { beginNewCareer } from "@/lib/player";
import { difficultyForRank } from "@/lib/ranks";
import {
  claimRegionName,
  endTutorial,
  isRegionNameUsed,
  setTutorialStep,
  tutorialState,
} from "@/lib/station";
import { useStation } from "@/lib/use-station";
import { CareerEndPanel } from "@/components/panels/CareerEndPanel";
import { usePlayer } from "@/lib/use-player";
import { ringScansUsed } from "@/lib/survey-log";
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
  | "menu"
  // Deliberately not in any nav list. The report is reached by finishing a
  // survey and by opening a closed entry from the Log, which is what keeps
  // it from needing a twelfth slot in the phone hub - that run is full at
  // eleven (backlog item 6).
  | "report";

const MOBILE_ONLY_PANELS: PanelId[] = ["starmap", "menu"];

// The panels you actually solve a region from, as opposed to read about one
// or administer the career. These are the four that get a one-tap hop to the
// Star Map on a phone, and the only four the map offers to return you to -
// see MobileJumpBar.
const SOLVING_PANELS: PanelId[] = ["briefing", "manifest", "sweep", "ringscan"];

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
  // Station Info used to be reachable only through the emblem on the
  // no-assignment placeholder, which meant it vanished the moment you
  // picked up a survey. Fine when the pages were lore you read once; not
  // fine now they carry the quasar classifications, since the moment you
  // want those is mid-survey, looking at a type you don't recognise.
  //
  // Violet because every colour is already spoken for somewhere, so the
  // goal is distance from the twin rather than uniqueness: it puts four
  // slots between this and Sweep Scope in the phone menu's single run, and
  // leaves the desktop utility rail five distinct colours.
  { id: "station", label: "Station", color: "violet" },
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
// is titled by the menu entry that opened it, so the two can't drift.
//
// Station Info is the one deliberate override. It is in the menu now, but
// the rail has room for "Station" and the panel bar has room for the whole
// station name - and the emblem on the no-assignment placeholder still
// opens it too, where the full name is what you'd expect to land on.
const MOBILE_TITLES: Record<string, string> = {
  ...Object.fromEntries(MOBILE_NAV.map((item) => [item.id, item.label])),
  station: OUTPOST_NAME,
  // Not a menu entry, so it has no label to inherit - see PanelId.
  report: "Survey Result",
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

  // Starts empty on purpose. The app used to ship with a built-in region
  // already active, which quietly implied surveys arrive from somewhere; a
  // player now starts with nothing and opens their first field themselves.
  // Everything downstream of this is null-tolerant as a result - see
  // `activeRegion` below, which is the single place that decides whether
  // there is a survey to render.
  const [regions, setRegions] = useState<Region[]>([]);
  const [regionId, setRegionId] = useState<string | null>(null);
  const region = regions.find((r) => r.id === regionId) ?? null;

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

  // The Star Map filling `main` instead of the 360px sidebar (desktop only;
  // below `lg` the map is already a full-width panel of its own). See the
  // render for how this expands *without* remounting the map, which is the
  // whole constraint - StarMap owns the board and writes it to
  // localStorage, so two live instances would fight over one key.
  const [mapMaximized, setMapMaximized] = useState(false);

  // Which instrument the phone's Star Map was opened from, so it can offer
  // the way back. Null when the map was reached any other way - from the hub
  // or by the walk-through - where the panel bar's Back already goes exactly
  // where you came from and a second return button would be noise.
  const [mapOrigin, setMapOrigin] = useState<PanelId | null>(null);

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

  // The roster is now *entirely* restored from the log - there is no
  // built-in seed left to fall back on, so this effect is the only thing
  // that puts regions on the board at all.
  //
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
  //
  // `resolveEntryRegion` rather than reading `e.region` directly: a player
  // who started before the default region was removed has a `builtin`
  // entry carrying only an id, and that entry has to come back too or
  // removing the default would delete a survey they were part-way through.
  const [restoredRoster, setRestoredRoster] = useState(false);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore
       from localStorage on mount; the server has no storage to read. */
    const saved = getSurveyLog()
      .map((e) => resolveEntryRegion(e, builtInRegions))
      .filter((r): r is Region => !!r);
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
    if (region) touchSurvey(region, builtInIds.has(region.id) ? "builtin" : "generated");
  }, [region, builtInIds]);

  // Slots against ACTIVE_SURVEY_LIMIT. Gated on `mounted` for the same
  // reason noActiveAssignment is: before hydration the log reads empty, so
  // an ungated check would say "0 of 3" on the first frame for a player
  // who is actually at the cap.
  const openSurveys = useMemo(() => activeSurveys(log), [log]);
  const atSurveyCap = mounted && openSurveys.length >= ACTIVE_SURVEY_LIMIT;

  // Set when Survey New Region is refused, so the Log can say why. Kept
  // here rather than in LogPanel because the refusal happens in the
  // navigation, one panel away from where it gets explained.
  const [capRefused, setCapRefused] = useState(false);

  // Which closed survey the result report is showing. Resolved from the log
  // rather than from `regions`, and rendered outside the `noActiveAssignment`
  // gate below - closing a region archives it, and every gated panel would
  // fall back to the placeholder in the same frame the report was opened.
  const [reportRegionId, setReportRegionId] = useState<string | null>(null);
  const reportEntry = useMemo(
    () => log.find((e) => e.regionId === reportRegionId) ?? null,
    [log, reportRegionId]
  );
  const reportRegion = reportEntry ? resolveEntryRegion(reportEntry, builtInRegions) ?? null : null;

  /**
   * A survey just ended - by a final filing or by a withdrawal. Both now
   * archive the region (see `closeEntry`), so without this the app would
   * cut straight to the station logo.
   *
   * The active region is cleared as well, so "no active survey" is
   * literally true rather than "your active survey is one you finished".
   */
  function handleSurveyClosed(closedRegionId: string) {
    setReportRegionId(closedRegionId);
    setRegionId(null);
    selectPanel("report");
  }

  /** Re-open a report from the Log, which is what makes it not a one-shot. */
  function handleOpenReport(closedRegionId: string) {
    setReportRegionId(closedRegionId);
    selectPanel("report");
  }

  // ------------------------------------------------------------------
  // The first-run walk-through.
  //
  // A controller, not a component: `tutorial.ts` holds the steps as data,
  // and the only thing that lives here is which step is current, what the
  // board looks like, and the rule that a step's target panel wins over
  // whatever the player last clicked. See docs/tutorial-plan.md.

  const { player } = usePlayer();
  // Read off the station record, not the profile - it has to survive the
  // career that finished, or a second career would be taught to place a
  // signature by someone who has just retired from doing it.
  const station = useStation();
  const tutorial = tutorialState(regions.length > 0);
  // Running, as opposed to merely unfinished: the walk-through only drives
  // the app once its region is actually on the roster.
  const [tutorialRunning, setTutorialRunning] = useState(false);
  const [tutorialStep, setTutorialStepIndex] = useState(0);

  /**
   * The Star Map's board, lifted.
   *
   * `StarMap` still owns it - this is a copy reported on every change, not
   * the source - because two things a level up need to know about it and
   * neither can reach into the component. The tutorial's step conditions
   * ask what the board *shows*, and the Sweep Scope and Ring Scan dim a
   * signature you have already placed.
   *
   * The alternative for the second was a `loadStarMapSave` read inside each
   * panel, which is cheaper and wrong: on a desktop the map and the scope
   * are on screen together, so a snapshot taken at mount goes stale the
   * moment a marker moves.
   */
  const [board, setBoard] = useState<{
    regionId: string;
    placements: Record<string, string | undefined>;
    markCount: number;
  } | null>(null);

  const tutorialEntry = useMemo(
    () => log.find((e) => e.regionId === TUTORIAL_REGION_ID),
    [log]
  );

  // Only ever the tutorial's own board. `board` now follows whatever survey
  // is active, so without this check a step condition could be satisfied by
  // a placement made in an entirely different region.
  const tutorialBoard = board?.regionId === TUTORIAL_REGION_ID ? board : null;
  const tutorialProgress: TutorialProgress = {
    placements: tutorialBoard?.placements ?? {},
    markCount: tutorialBoard?.markCount ?? 0,
    scansSpent: tutorialEntry ? ringScansUsed(tutorialEntry).length : 0,
    closed: tutorialEntry ? !!tutorialEntry.outcome : false,
  };

  const activeStep = tutorialRunning ? TUTORIAL_STEPS[tutorialStep] : null;
  const stepSatisfied = activeStep?.done ? activeStep.done(tutorialProgress) : true;

  /**
   * Offered only to a player with nothing on record who hasn't finished or
   * skipped it. Everyone else keeps the ordinary placeholder - see
   * `tutorialState` for why an existing save reads as done.
   */
  const showWelcome = mounted && !tutorial.done && regions.length === 0 && !tutorialRunning;

  function beginTutorial() {
    // Idempotent: replaying after finishing re-uses the same region and its
    // saved board rather than stacking a second copy on the roster.
    setRegions((prev) =>
      prev.some((r) => r.id === TUTORIAL_REGION_ID) ? prev : [...prev, tutorialRegion]
    );
    // Ember Verge is a real name on a real map; a generated region turning
    // up with it later would read as the bug it looks like.
    claimRegionName(tutorialRegion.name);
    setRegionId(TUTORIAL_REGION_ID);
    setTutorialRunning(true);
    // Resumes where it was left. The panel follows from the effect below,
    // so there is nothing to set here.
    setTutorialStepIndex(tutorial.step);
  }

  /** Declined the walk-through from the welcome screen: open a real field instead. */
  function declineTutorial() {
    endTutorial(0);
    handleNavSelect("generate");
  }

  function advanceTutorial(to: number) {
    if (to > TUTORIAL_STEPS.length - 1) {
      endTutorial(TUTORIAL_STEPS.length - 1);
      setTutorialRunning(false);
      return;
    }
    const next = Math.max(0, to);
    setTutorialStepIndex(next);
    setTutorialStep(next);
  }

  function skipTutorial() {
    endTutorial(tutorialStep);
    setTutorialRunning(false);
  }

  /**
   * The step's panel wins.
   *
   * "starmap" is a real destination only below `lg`; on desktop the map is
   * permanently in the sidebar, so navigating for those steps would drag
   * the player off the Briefing for no reason. Runs as an effect rather
   * than during render because it is a navigation, and it deliberately does
   * not depend on `requestedPanel` - the player is free to click away
   * mid-step, and only a step *change* pulls them back.
   */
  useEffect(() => {
    if (!activeStep) return;
    if (activeStep.panel === "starmap" && !isMobile) return;
    // Through `selectPanel`, not `setRequestedPanel`. Selecting a panel is
    // not only a state change: it is also what sets `visitedSweep`, which
    // is what mounts the Sweep Scope at all. Setting the panel directly
    // navigated to an *empty* Sweep Scope - the step told the player to
    // read an instrument that had never been mounted. Found by walking the
    // tutorial and measuring the container at height 0.
    // Deliberately not depending on `selectPanel`: it is redeclared every
    // render, so depending on it would re-navigate constantly and pin the
    // player to the step's panel. Only a *step change* pulls them back,
    // which is what "points, does not block" means here.
    selectPanel(activeStep.panel);
  }, [activeStep, isMobile]);

  function selectPanel(id: string) {
    setRequestedPanel(id as PanelId);
    // Recorded on the way in, from the panel being left. Computed on every
    // navigation rather than only on the way to the map, so it can't go
    // stale: a later hub -> Star Map trip must not still be offering the
    // instrument you were on two visits ago.
    setMapOrigin(id === "starmap" && SOLVING_PANELS.includes(panel) ? panel : null);
    // Going anywhere restores the map. Maximised, the map *is* the content
    // area, so a nav click that left it expanded would look like the
    // destination failed to open - which is exactly the "mode you can get
    // stuck in" this feature had to avoid.
    setMapMaximized(false);
    if (id === "sweep") setVisitedSweep(true);
    if (id !== "log") setLogPreviewRegion(null);
    // The refusal is about one attempt, not a standing state - leaving the
    // Log and coming back shouldn't still be scolding you.
    if (id !== "log") setCapRefused(false);
  }

  function handleNavSelect(id: string) {
    if (id === "generate") {
      // Refuse rather than silently do nothing, and land somewhere you can
      // act on it: the Log is where surveys get archived, and it lists the
      // open ones you'd have to close. Nothing is auto-archived - a player
      // already over the cap (every existing save is) keeps everything and
      // is only blocked from opening *more*.
      if (atSurveyCap) {
        setCapRefused(true);
        selectPanel("log");
        return;
      }
      // The flavor delay means the new region isn't on the roster (and has
      // no log entry, so it holds no slot) for another two seconds. Without
      // this, two quick clicks put you over the cap by opening two.
      if (generating) return;
      // Generate immediately (it's fast either way) but hold the reveal
      // behind a deliberate delay - the loading screen is purely flavor.
      // Assessed here rather than inside generateRegion: the analysis
      // scripts generate regions precisely to measure solvability, so
      // handing them a verdict would be circular. Costs about 0.4ms.
      // No two regions in a save share a name. Claimed immediately rather
      // than after the reveal delay, or opening two fields quickly could
      // name them both the same thing.
      //
      // The rank read here is the other half of "rank changes the work"
      // (backlog item 1): a Chief of Survey draws six signatures with the
      // anchors almost on top of each other and no quadrant named, a
      // technician draws eight with the anchors wide and four named. This
      // is the *only* call that conditions on rank - the tutorial adds its
      // baked region directly and never comes through here, which is what
      // keeps `Ember Verge` exactly as the walk-through describes it.
      const raw = generateRegion({
        nameTaken: isRegionNameUsed,
        difficulty: difficultyForRank(player.rank),
      });
      claimRegionName(raw.name);
      const generated: Region = { ...raw, solvability: assessSolvability(raw) };
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

  // Two ways to have nothing to show now, and they're different states:
  // an archived active region (you have surveys, this one is put away), and
  // no region at all (a first run, since the default region is gone).
  // Archiving the active region leaves nothing meaningful to show it as -
  // browsing the Log tab is an intentional exception, since a previewed
  // entry may itself be archived without that meaning "nothing is active."
  // Forced true until mounted, so the first paint never guesses wrong.
  const noActiveAssignment = !mounted || !region || archivedIds.has(region.id);

  // The one gate every panel reads. Non-null means there is a live survey
  // to render, which is what lets the panels that genuinely need a region
  // keep taking a non-nullable one instead of each re-deriving the rule.
  const activeRegion: Region | null = noActiveAssignment ? null : region;

  /**
   * Which signatures are already on the board, for the instruments that
   * list them.
   *
   * The Star Map's chips drop to 60% once a signature is placed, so "what
   * have I still got left" is answerable at a glance; the Sweep Scope's
   * references and the Ring Scan's targets are the same list of stars and
   * now read the same way. Note the dim means "you have put this one
   * down", *not* "disabled" - a placed signature is still a perfectly
   * legitimate scan target, since you may well have placed it on a guess.
   *
   * Guarded on the region id rather than trusting whatever the board last
   * reported: `board` outlives any one survey, and dimming the wrong six
   * names for a frame is worse than dimming none.
   */
  const placedQuasarIds = useMemo(() => {
    if (!activeRegion || board?.regionId !== activeRegion.id) return new Set<string>();
    return new Set(
      Object.entries(board.placements)
        .filter(([, sector]) => !!sector)
        .map(([quasarId]) => quasarId)
    );
  }, [activeRegion, board]);

  // The Star Map always shows the field itself; it just has nothing
  // selectable when there's no active survey to plot (null region).
  const starMapRegion: Region | null =
    panel === "log" && logPreviewRegion ? logPreviewRegion : activeRegion;

  /**
   * The phone's bottom bar, as the nav entry it is drawn from: where one tap
   * takes you. The bar takes that entry's label and colour, so it reads as
   * "one tap puts you here" rather than as a back button that happens to be
   * labelled. Where you *are* is the panel bar's job, at the top of the
   * screen.
   *
   * Only with a live survey. Without one the four survey panels are all
   * showing the same "no active assignment" placeholder and the map has
   * nothing selectable on it, so a permanent hop between them would be
   * offering to carry you between two empty rooms.
   */
  const jump = useMemo(() => {
    if (!isMobile || !activeRegion) return null;
    const toId =
      panel === "starmap" ? mapOrigin : SOLVING_PANELS.includes(panel) ? "starmap" : null;
    if (!toId) return null;
    return MOBILE_NAV.find((item) => item.id === toId) ?? null;
  }, [isMobile, activeRegion, panel, mapOrigin]);

  // Maximising is a *restyle* of the sidebar, never a move: the map stays
  // at the same place in the tree and only the widths change, because
  // StarMap owns the board and persists it, and a remount would drop the
  // armed signature and the current filing snapshot on the way through.
  // Held here (rather than in the state itself) so every reader agrees -
  // the report drops the sidebar entirely, and below `lg` there is nothing
  // to expand into.
  const mapMaximised = mapMaximized && !isMobile && panel !== "report";

  // Rendered into the sidebar on desktop and into `main` below `lg`, but
  // never both at once - each call site is gated on `isMobile`, so there is
  // structurally only ever one StarMap alive to write placements.
  const starMapView = (
    <>
      {panel === "log" && logPreviewRegion && logPreviewRegion.id !== region?.id && (
        <p className="lcars-caps text-[10px] tracking-wider text-lcars-amber/80 mb-2 px-1">
          Previewing from Log &mdash; not your active survey
        </p>
      )}
      <StarMapPanel
        region={starMapRegion}
        /* Only the live survey can close; a previewed entry from the Log
           is already closed and read-only. */
        onClosed={starMapRegion === activeRegion ? handleSurveyClosed : undefined}
        /* Only for the live survey - a preview from the Log is a different
           region's board and must not feed step conditions or dim the
           instruments' signature lists. */
        onBoardChange={starMapRegion === activeRegion ? setBoard : undefined}
        /* Same gate as the board callback, and for the same reason: a
           preview from the Log must not sprout a "place it here" ring for
           a region the walk-through isn't talking about. */
        hint={
          tutorialRunning && starMapRegion?.id === TUTORIAL_REGION_ID
            ? activeStep?.hint ?? null
            : null
        }
        maximized={mapMaximised}
        /* Below `lg` there is nothing to maximise into - the map is already
           a full-width panel - so the control is simply absent there. */
        onToggleMaximize={isMobile ? undefined : () => setMapMaximized((v) => !v)}
      />
    </>
  );

  /**
   * The career is over - relieved, or retired. This replaces the entire
   * layout rather than being a panel you can navigate away from, which is
   * the point: surveying has stopped, so leaving the rails up would offer
   * eleven destinations that all say the same "no active assignment".
   *
   * Gated on `mounted` for the same reason `noActiveAssignment` is - the
   * profile reads as the placeholder until localStorage has been read, and
   * a first frame that guessed wrong here would flash the whole app.
   */
  const careerOver = mounted && !!player.ended;

  return (
    // The viewport shell never scrolls, on any width - that's a standing
    // LCARS rule (see docs/lcars-style-notes.md). Anything too tall falls
    // back to a hidden-scrollbar flick-scroll inside `main`.
    <div
      id="app-shell"
      className="flex-1 flex flex-col gap-3 p-3 md:p-6 h-full overflow-hidden"
      /* Reserved rather than overlaid. The coach bar is `fixed`, so without
         this it would sit on top of whatever is at the bottom of the
         screen - and since the shell never scrolls, covered content is
         unreachable rather than merely hidden. Shrinking the shell keeps
         every panel fully visible while the walk-through runs. */
      style={activeStep ? { paddingBottom: isMobile ? 210 : 168 } : undefined}
    >
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

      {careerOver && (
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <CareerEndPanel player={player} careers={station.careers} onBeginNewCareer={beginNewCareer} />
        </div>
      )}

      {/* `main` keeps the same position in the tree either way, so crossing
          the breakpoint restyles the layout without remounting any panel -
          Sweep Scope's background clock in particular survives a resize. */}
      <div
        className={`${
          /* 8px rather than 12 between the phone's three stacked bands.
             The jump bar below `main` costs 44px of touch floor plus a gap,
             and the Sweep Scope missed fitting outright by exactly 4px with
             `gap-3` here - two gaps at 8px hand that back and then some. The
             rule is to prefer making it fit, and this is the cheapest 8px in
             the layout: chrome sitting closer to its own content reads
             tighter on a phone, not more cramped. */
          isMobile ? "flex flex-col flex-1 min-h-0 gap-2" : "flex flex-1 min-h-0"
        } ${careerOver ? "hidden" : ""}`}
      >
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

        {/* Hidden rather than unmounted while the map is maximised. `main`
            holds the Sweep Scope, whose clock has been running since its
            first mount and must not be restarted by a panel expanding next
            to it - and the same reasoning that keeps the scope mounted when
            you navigate away applies here. */}
        <main
          id="main-content"
          data-panel={panel}
          className={`flex-1 min-w-0 min-h-0 overflow-y-auto no-scrollbar ${
            mapMaximised ? "hidden" : ""
          }`}
        >
          {/* The hub is the phone's landing view, so on a phone it - not
              Briefing - is what a first run actually opens on. Without this
              the welcome screen shipped desktop-only, which is backwards:
              the hub's eleven destinations are the least useful thing to
              hand someone who has never played and has no survey to open. */}
          {panel === "menu" && !showWelcome && (
            <MobileMenu id="mobile-menu" items={MOBILE_NAV} onSelect={handleNavSelect} />
          )}
          {/* The welcome takes the Briefing slot rather than being a
              destination of its own: it is what a first run lands on, and
              Briefing is where the app already opens. It also keeps the
              phone hub at eleven entries, which is full (backlog item 6). */}
          {(panel === "briefing" || panel === "menu") && showWelcome && (
            <WelcomePanel
              officerName={player.name}
              resuming={tutorial.step > 0}
              onBeginTutorial={beginTutorial}
              onSkip={declineTutorial}
            />
          )}
          {panel === "briefing" &&
            !showWelcome &&
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
                region={activeRegion}
                regions={briefingRegions}
                /* The whole roster, not the unarchived slice above: with
                   nothing unarchived those two are both empty, and only
                   this one can tell "everything is archived" apart from
                   "you have never surveyed anything". */
                hasAnySurveys={regions.length > 0}
                onSelectRegion={setRegionId}
                onOpenStationInfo={openStationInfo}
              />
            ))}
          {panel === "manifest" &&
            (activeRegion ? (
              <StarManifestPanel region={activeRegion} />
            ) : (
              <LcarsPanel id="manifest-placeholder" title={PANEL_LABELS.manifest} accent="bg-lcars-lilac" className="h-full">
                <NoActiveAssignmentPanel onOpenStationInfo={openStationInfo} />
              </LcarsPanel>
            ))}
          {/* Mounted on first visit, then never unmounted (just hidden) -
              its sweep clock keeps running in the background against real
              elapsed time while you're on a different panel, instead of
              resetting every time you switch back to it. */}
          <div id="sweep-scope-container" className={panel === "sweep" && activeRegion ? "" : "hidden"}>
            {visitedSweep && activeRegion && (
              <SweepScopePanel
                region={activeRegion}
                visible={panel === "sweep"}
                placedQuasarIds={placedQuasarIds}
              />
            )}
          </div>
          {panel === "sweep" && !activeRegion && (
            <LcarsPanel id="sweep-placeholder" title={PANEL_LABELS.sweep} accent="bg-lcars-violet" className="h-full">
              <NoActiveAssignmentPanel onOpenStationInfo={openStationInfo} />
            </LcarsPanel>
          )}
          {panel === "ringscan" &&
            (activeRegion ? (
              <RingScanPanel region={activeRegion} placedQuasarIds={placedQuasarIds} />
            ) : (
              <LcarsPanel id="ringscan-placeholder" title={PANEL_LABELS.ringScan} accent="bg-lcars-salmon" className="h-full">
                <NoActiveAssignmentPanel onOpenStationInfo={openStationInfo} />
              </LcarsPanel>
            ))}
          {panel === "station" && (
            <StationInfoPanel showHeader={!isMobile} onBack={() => selectPanel("briefing")} />
          )}
          {panel === "log" && (
            <LogPanel
              builtInRegions={builtInRegions}
              activeRegionId={region?.id ?? null}
              previewRegionId={logPreviewRegion?.id ?? null}
              openSurveyCount={openSurveys.length}
              capRefused={capRefused}
              onPreviewRegion={setLogPreviewRegion}
              onResumeRegion={resumeRegion}
              onOpenReport={handleOpenReport}
            />
          )}
          {/* Outside the activeRegion gate on purpose - the region this
              describes is archived by definition, which is exactly what
              that gate rejects. */}
          {panel === "report" &&
            (reportRegion && reportEntry ? (
              <SurveyReportPanel
                region={reportRegion}
                entry={reportEntry}
                atSurveyCap={atSurveyCap}
                onReturnToLog={() => selectPanel("log")}
                onSurveyNewRegion={() => handleNavSelect("generate")}
              />
            ) : (
              <LcarsPanel id="report-placeholder" title="Survey Result" accent="bg-lcars-teal" className="h-full">
                <NoActiveAssignmentPanel onOpenStationInfo={openStationInfo} />
              </LcarsPanel>
            ))}
          {panel === "profile" && <ProfilePanel />}
          {panel === "help" && <HelpPanel />}
          {panel === "prototypes" && <PrototypesPanel region={activeRegion} />}
          {isMobile && panel === "starmap" && starMapView}
        </main>

        {/* Below `main`, not inside it - a sibling on `shrink-0`, exactly as
            the panel bar is above. `main` keeps being the only scroller, so
            this can't scroll out from under the thumb that is reaching for
            it. */}
        {jump && (
          <MobileJumpBar
            id="mobile-jump-bar"
            label={jump.label}
            color={jump.color}
            /* Leaning the way you're going: out to the map on the right,
               back from it on the left. */
            side={panel === "starmap" ? "left" : "right"}
            onSelect={() => selectPanel(jump.id)}
          />
        )}

        {/* Dropped while the report is up. The report draws the same field
            itself, much larger, so leaving the sidebar there would show it
            twice at two sizes - and giving `main` those 380px back is what
            lets the dial and the catalog sit side by side. Hiding rather
            than moving the map is safe here because the region behind it is
            closed: StarMap re-reads its board from localStorage on remount,
            and a closed board can't have changed meanwhile. */}
        {!isMobile && panel !== "report" && (
          /* Same element either way - only the width classes change, which
             is what lets the map expand without React unmounting anything
             inside it. Both rails stay where they are, so maximising never
             takes the navigation away. */
          <div
            id="starmap-sidebar"
            className={
              mapMaximised
                ? "flex-1 min-w-0 min-h-0 overflow-y-auto no-scrollbar"
                : "w-[360px] shrink-0 min-h-0 overflow-y-auto no-scrollbar ml-[20px] max-lg:hidden"
            }
          >
            {starMapView}
          </div>
        )}

        {!isMobile && (
          <div className="w-28 md:w-36 shrink-0 min-h-0 flex flex-col ml-[48px] max-lg:hidden">
            <NavRail
              id="nav-rail-utility"
              items={UTILITY_NAV}
              activeId={panel}
              onSelect={handleNavSelect}
              indicatorSide="left"
              className="shrink-0"
            />
            {/* Only with a survey open - on the placeholder the same emblem
                is already the centrepiece of `main`, and two of them reads
                as a mistake. */}
            {!noActiveAssignment && <StationEmblem />}
          </div>
        )}
      </div>

      {activeStep && !careerOver && (
        <TutorialCoach
          step={activeStep}
          index={tutorialStep}
          total={TUTORIAL_STEPS.length}
          satisfied={stepSatisfied}
          onNext={() => advanceTutorial(tutorialStep + 1)}
          onBack={() => advanceTutorial(tutorialStep - 1)}
          onSkip={skipTutorial}
        />
      )}
    </div>
  );
}
