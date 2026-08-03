// The first-run walk-through, as data.
//
// See docs/tutorial-plan.md for why this exists and why the region is
// fixed. The short version: the Ring Scan is the one instrument nobody
// discovers on their own - it is metered, it costs something, and it is
// silent about everything except the signature you aim it at - so a first
// region that never needs it teaches the player, correctly, that they can
// ignore it. Then their second region is unsolvable and they have no idea
// why. `Ember Verge` therefore hits a wall on purpose, and the wall is the
// lesson.
//
// **Every claim in the copy below is checked against the baked region by
// `scripts/explain-tutorial-region.ts`.** Re-run it after re-baking and fix
// the copy, or the tutorial will confidently teach a false inference. What
// it reports today:
//
//   briefing gives:  Mrk 633 @ R2S7, Q3970 @ R4S4 (anchors)
//                    Ton 454 and Mrk 280 in Quadrant III
//                    nothing at all about CTA 118 or CTA 115
//   bearings alone:  CTA 115 -> R5S3, Mrk 280 -> R2S6, Ton 454 -> R5S5
//   THE WALL:        CTA 118 is R1S7 or R2S8, and the two are
//                    indistinguishable - both read 1 from Mrk 633 and both
//                    are out of range from Q3970
//   one scan:        ring 2, which leaves only R2S8, and the region closes
//
// The steps *point*; they do not block. A player who wanders off and places
// things in a different order still satisfies the conditions, because each
// one asks about the board's state rather than about what was clicked last.

import { TUTORIAL_SCAN_TARGET, tutorialRegion } from "@/data/regions/tutorial";

/**
 * Where a step wants the player. "starmap" is a real panel only below `lg`;
 * on desktop the map is permanently in the sidebar, so the shell leaves the
 * panel alone for those steps rather than navigating somewhere pointless.
 */
export type TutorialPanel =
  | "briefing"
  | "starmap"
  | "sweep"
  | "manifest"
  | "ringscan"
  | "report";

/** Everything a step's `done` predicate is allowed to look at. */
export interface TutorialProgress {
  /** quasarId -> sectorId, live from the Star Map. */
  placements: Record<string, string | undefined>;
  /** Rule-out and candidate marks across every signature, summed. */
  markCount: number;
  /** Ring scans spent on the tutorial region. */
  scansSpent: number;
  /** True once the region has an outcome. */
  closed: boolean;
}

export interface TutorialStep {
  id: string;
  panel: TutorialPanel;
  title: string;
  body: string;
  /**
   * Element to ring while this step is up, if it happens to be on screen.
   * Never required: a coach mark may not scroll the page to bring itself
   * into view (docs/lcars-style-notes.md), so a missing anchor degrades to
   * copy alone rather than moving the layout.
   */
  anchorId?: string;
  /**
   * True once the board shows the player has done it. Omitted for steps
   * that only explain, which advance on the button instead.
   */
  done?: (p: TutorialProgress) => boolean;
}

const placedCount = (p: TutorialProgress) =>
  Object.values(p.placements).filter(Boolean).length;

const at = (p: TutorialProgress, quasar: string, sector: string) =>
  p.placements[quasar] === sector;

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "briefing",
    panel: "briefing",
    anchorId: "logged-bearings",
    title: "Read the briefing",
    body:
      "Six signatures are out there and the station has logged four bearings on them — two exact positions, and two that name only a quadrant. That is every fact you get for free. Everything else you work out from the instruments.",
  },
  {
    id: "anchors",
    panel: "starmap",
    anchorId: "starmap-signatures",
    title: "Place what you were given",
    body:
      "On the Star Map, click a signature to arm it, then click a cell to drop it. Start with the two you already know: Mrk 633 at R2S7, and Q3970 at R4S4. These are your reference points — everything else is measured against them.",
    done: (p) => at(p, "Mrk 633", "R2S7") && at(p, "Q3970", "R4S4"),
  },
  {
    id: "sweep",
    panel: "sweep",
    anchorId: "sweep-scope-container",
    title: "A reading is a distance, not a position",
    body:
      "The Sweep Scope picks one signature as a reference and tells you how far the others are from it — ring-steps plus segment-hops, with no direction. Switch the reference to measure from somewhere else. Two distances from two known points is usually enough to pin a third.",
  },
  {
    id: "deduce",
    panel: "starmap",
    anchorId: "starmap-field",
    title: "Three of them fall straight out",
    body:
      "Work an example: the briefing puts Mrk 280 in Quadrant III, and the scope reads it 1 away from Mrk 633 at R2S7. Only one Quadrant III cell is 1 step from there — R2S6. Place it, then do the same for Ton 454 and CTA 115.",
    done: (p) => placedCount(p) >= 5,
  },
  {
    id: "manifest",
    panel: "manifest",
    anchorId: "manifest-list",
    title: "The Manifest keeps your working",
    body:
      "Every reading you actually look at is recorded here, per signature, so you are not holding the whole field in your head. Nothing is filled in that you have not observed. You can also recolour a signature here if two of them look too alike.",
  },
  {
    id: "mark",
    panel: "starmap",
    anchorId: "starmap-modes",
    title: "Mark what you cannot decide",
    body:
      "CTA 118 is the last one, and it will not settle: it could be R1S7 or R2S8. Switch to Maybe and mark both — press and sweep to paint a run. Rule Out is the inverse, for cells you have eliminated.",
    done: (p) => p.markCount >= 1,
  },
  {
    id: "wall",
    panel: "ringscan",
    anchorId: "ringscan-signatures",
    title: "This is the wall, and it is deliberate",
    body:
      "You are not stuck through a mistake. R1S7 and R2S8 both read 1 from Mrk 633, and both are out of range from Q3970 — every bearing you can take says the same thing about them. Bearings cannot separate these two, and no amount of care will change that. Aim a Ring Scan at CTA 118. It returns one fact: which ring it sits in.",
    done: (p) => p.scansSpent >= 1,
  },
  {
    id: "finish",
    panel: "starmap",
    anchorId: "starmap-field",
    title: "Ring 2 — so R2S8",
    body:
      "The scan says ring 2, which kills R1S7 outright and leaves exactly one cell. Place CTA 118 at R2S8. That is the whole point of the instrument: it is expensive and it is nearly silent, and you spend it on the one signature you genuinely cannot reason out.",
    done: (p) => placedCount(p) >= tutorialRegion.quasars.length,
  },
  {
    id: "file",
    panel: "starmap",
    anchorId: "starmap-actions",
    title: "File the classification",
    body:
      "Filing checks your whole board at once and tells you how many signatures are inconsistent — never which ones. You get a few attempts per region; spend them all without a match and the entry is retracted. Withdraw releases a region you cannot crack, and costs you nothing.",
    done: (p) => p.closed,
  },
  {
    id: "result",
    panel: "report",
    title: "That is the loop",
    body:
      "Every survey ends in a result like this one: the catalog against where you put things, the classification of each signature, and any change to your rank. Open a new field whenever you like — you can have three going at once. Good hunting, officer.",
  },
];

export const TUTORIAL_LAST_STEP = TUTORIAL_STEPS.length - 1;

/** The signature the walk-through tells you to scan. Re-exported so the copy above and the baked region cannot drift. */
export { TUTORIAL_SCAN_TARGET };

export function stepDone(step: TutorialStep, progress: TutorialProgress): boolean {
  return step.done ? step.done(progress) : false;
}
