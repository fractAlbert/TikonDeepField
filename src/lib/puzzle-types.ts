// Core data model for a "region" (puzzle). All regions share one fixed
// polar field (see RING_COUNT/SEGMENT_COUNT in grid.ts): every sector is a
// (ring, segment) position, ring = distance band from center, segment =
// angular bearing. A region places its quasars sparsely across that field
// - most of the 40 positions go unused by any given puzzle. Quasar->Sector
// and Quasar->Type are both bijections (each quasar gets exactly one type
// and one sector, all distinct), which keeps this a classic logic-grid
// ("zebra puzzle") problem despite the radial presentation.

export interface Sector {
  /** e.g. "R2S5" (ring 2, segment 5, both 1-indexed for display) */
  id: string;
  /** 0-indexed, 0 = innermost ring */
  ring: number;
  /** 0-indexed, increases clockwise */
  seg: number;
}

/** A quarter-slice of the field spanning every ring (see quadrantOf in grid.ts). */
export type Quadrant = "I" | "II" | "III" | "IV";

export interface Quasar {
  /** e.g. "3C 273" - a catalog-style designation, also used as the display name */
  id: string;
  designation: string;
}

export interface Solution {
  /** quasarId -> { type, sectorId } */
  [quasarId: string]: {
    type: string;
    sector: string;
  };
}

export type Clue =
  | { kind: "quasar-type"; quasar: string; type: string; negate?: boolean }
  | { kind: "quasar-sector"; quasar: string; sector: string; negate?: boolean }
  | { kind: "type-sector"; type: string; sector: string; negate?: boolean }
  | { kind: "type-ring"; type: string; ring: number; negate?: boolean }
  | { kind: "type-segment"; type: string; segment: number; negate?: boolean }
  | { kind: "quasar-quadrant"; quasar: string; quadrant: Quadrant; negate?: boolean }
  | { kind: "type-quadrant"; type: string; quadrant: Quadrant; negate?: boolean }
  /**
   * Every signature of `type` lies in one of `quadrants`, and each listed
   * quadrant holds at least one. The set is exact, not a lower bound.
   *
   * Added 2026-08-11 so a classification held by *several* signatures can
   * still be talked about - `type-quadrant` cannot, because it resolves to a
   * single signature and is scored false the moment two share a type.
   *
   * **It tells you less than it appears to, on purpose.** The user's own
   * framing: *"there are Ancient Relics in regions II and IV. Okay, so now I
   * know there are at least 2 of them. It does help but it also misleads a
   * bit which is nice for a puzzle."* Two listed quadrants mean at least two
   * signatures - but three relics with two sharing a quadrant list exactly
   * the same two, so the count a player naturally reads off is a floor and
   * not a fact.
   */
  | { kind: "type-quadrant-set"; type: string; quadrants: Quadrant[]; negate?: boolean }
  | { kind: "type-adjacent-type"; typeA: string; typeB: string; negate?: boolean }
  | { kind: "quasar-adjacent-quasar"; quasarA: string; quasarB: string; negate?: boolean }
  | { kind: "type-same-ring-type"; typeA: string; typeB: string; negate?: boolean }
  | { kind: "type-same-segment-type"; typeA: string; typeB: string; negate?: boolean }
  | {
      kind: "type-radial";
      typeA: string;
      /** typeA is `direction` of typeB along the same segment */
      direction: "inward" | "outward";
      typeB: string;
      negate?: boolean;
    }
  | {
      kind: "type-angular";
      typeA: string;
      /** typeA is `direction` of typeB along the same ring */
      direction: "clockwise" | "counterclockwise";
      typeB: string;
      negate?: boolean;
    }
  // Identity-based mirrors of the four type-relational kinds above. These
  // reference specific quasars rather than types, so - unlike their type-
  // based counterparts - they work even when a type repeats across
  // several quasars in the same region, since there's no "the X quasar"
  // ambiguity to resolve.
  | { kind: "quasar-same-ring"; quasarA: string; quasarB: string; negate?: boolean }
  | { kind: "quasar-same-segment"; quasarA: string; quasarB: string; negate?: boolean }
  | {
      kind: "quasar-radial";
      quasarA: string;
      direction: "inward" | "outward";
      quasarB: string;
      negate?: boolean;
    }
  | {
      kind: "quasar-angular";
      quasarA: string;
      direction: "clockwise" | "counterclockwise";
      quasarB: string;
      negate?: boolean;
    };

export interface Region {
  id: string;
  name: string;
  /** Flavor text shown on the briefing panel */
  briefing: string;
  quasarTypes: string[];
  quasars: Quasar[];
  solution: Solution;
  clues: Clue[];
  /**
   * Whether the region could be solved at all, assessed once at generation
   * (see solvability.ts). Optional because built-in regions and anything
   * generated before this existed have no verdict.
   *
   * Never shown while a survey is open - "this one is impossible" would
   * decide the game for the player. It is for the Log, after the fact.
   */
  solvability?: { withoutScans: boolean; withBestScans: boolean };
  /**
   * How many signatures this region's Constellation shows, fixed at
   * generation from the rank that drew it.
   *
   * **On the region rather than read from the player**, and that is not a
   * convenience. A region outlives the rank that produced it - you can open
   * one at Officer, get promoted, and come back to it - and its difficulty
   * must not change underneath you. It is also what lets `solvability.ts`
   * know what a given region actually revealed, which it has to, because a
   * shipped instrument is part of what a player can know and the "nobody
   * could have got this" flag is wrong the moment it ignores one.
   *
   * Optional: built-in regions and anything generated before 2026-08-11 have
   * none, and the Constellation is simply unavailable for those.
   */
  constellationStars?: number;
}
