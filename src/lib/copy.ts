// Central home for user-facing chrome text (captions, hints, placeholder
// copy) that either appears in more than one place or needs to stay
// consistent across callers - not a catch-all for every string in the app.
// Region briefing/clue text stays in the region data itself, since that's
// puzzle content rather than UI chrome.
export const COPY = {
  noActiveAssignment: {
    caption: "No Active Assignment",
    defaultHint: "Select a region on the Briefing panel, or survey a new one, to begin.",
  },
  briefing: {
    archivedHint:
      "This region was archived. Pick one above, or use Survey New Region in the right-hand rail, to continue.",
  },
  stationLoading: {
    label: "Surveying…",
  },
} as const;
