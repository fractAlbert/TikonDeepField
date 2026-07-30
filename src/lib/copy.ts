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
  survey: "Quadrant Survey",
  surveyNewRegion: "Survey New Region",
} as const;

export const COPY = {
  noActiveAssignment: {
    caption: "No Active Assignment",
    defaultHint: "Select a region on the Briefing panel, or survey a new one, to begin.",
  },
  briefing: {
    // Deliberately doesn't name a rail - it's the right-hand one on
    // desktop and part of the single strip on a phone.
    archivedHint: `This region was archived. Pick one above, or use ${PANEL_LABELS.surveyNewRegion} in the navigation, to continue.`,
  },
  stationLoading: {
    label: "Surveying…",
  },
} as const;
