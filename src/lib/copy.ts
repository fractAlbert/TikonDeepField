// Central home for user-facing chrome text (captions, hints, placeholder
// copy, panel/nav labels) that either appears in more than one place or
// needs to stay consistent across callers - not a catch-all for every
// string in the app. Region briefing/clue text stays in the region data
// itself, since that's puzzle content rather than UI chrome, and a label
// that only ever appears in the one component that owns it (e.g. Star
// Map's "Verify"/"Reset" buttons) stays inline there rather than moving
// here on the offchance something else might reuse it someday.
//
// No i18n/locale switching here - just a single source of truth for text
// that's currently duplicated by hand across callers. If a second language
// ever becomes real, COPY's shape (grouped by feature) is what you'd key
// by locale; nothing here needs restructuring to get there.
export const GAME_NAME = "Tikon: Deep Field";
export const OUTPOST_NAME = "Tikon Research Station";

/**
 * Labels shared between a NavRail entry and the panel(s) it points to (and,
 * for "Survey New Region", HelpPanel's reference text). Each of these is
 * currently duplicated verbatim across 2-3 call sites by hand - kept here
 * so the nav button and the panel it opens can't silently drift apart.
 */
export const PANEL_LABELS = {
  manifest: "Star Manifest",
  sweep: "Sweep Scope",
  /**
   * Replaced the Quadrant Survey on 2026-08-01. A quadrant spans all five
   * rings, so counting signatures per quadrant said almost nothing about
   * how far out anything was - see docs/instrument-analysis.md. Quadrant
   * *clues* in the briefing are untouched; only the panel is gone.
   */
  ringScan: "Ring Scan",
  surveyNewRegion: "Survey New Region",
} as const;

export const COPY = {
  noActiveAssignment: {
    caption: "No Active Assignment",
    /**
     * Worded so it holds in both empty states. It used to open with
     * "Select a region on the Briefing panel", which pointed at a picker
     * that is genuinely empty on a first run now that no default region
     * ships. The panels that show this one (Manifest, Sweep, Ring Scan)
     * don't know which state they're in; Briefing does, and overrides it.
     */
    defaultHint: `Pick a survey up from the Briefing panel, or use ${PANEL_LABELS.surveyNewRegion} in the navigation, to begin.`,
  },
  briefing: {
    // Deliberately doesn't name a rail - it's the right-hand one on
    // desktop and part of the single strip on a phone.
    archivedHint: `This region was archived. Pick one above, or use ${PANEL_LABELS.surveyNewRegion} in the navigation, to continue.`,
    /**
     * The other empty state, and a genuinely different one: *you have never
     * surveyed anything* rather than *the region you had is archived*. It
     * exists because the app no longer ships with a default region, so this
     * is what a first run actually lands on. A welcome page with a
     * generated tutorial region is meant to replace it (backlog item 5) -
     * until then this at least says the true thing rather than telling a
     * new player their region was archived.
     */
    noSurveysHint: `No surveys on record. Use ${PANEL_LABELS.surveyNewRegion} in the navigation to open your first field.`,
  },
  surveyCap: {
    caption: "Survey slots full",
    /** Named actions only - each one is a control that exists on screen. */
    hint: "Every slot is taken by an unfinished survey. File a classification to close one, withdraw it from the Star Map, or archive it below.",
  },
  stationLoading: {
    label: "Surveying…",
  },
} as const;
