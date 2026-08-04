import { Region } from "@/lib/puzzle-types";

// The first-run tutorial's region. Fixed, not generated - see
// docs/tutorial-plan.md.
//
// Baked by `scripts/bake-tutorial-region.ts`; do not hand-edit. The
// walk-through is written against these exact sectors ("CTA 118 reads
// the same from both anchors, so bearings alone cannot place it"), so a
// changed coordinate silently makes the tutorial teach a false inference.
// `scripts/verify-puzzles.ts` re-asserts the four bars on every run.
//
// What makes it tutorial-grade:
//   - 6 signatures, the smallest a region comes
//   - NOT solvable from bearings alone: propagation stalls on purpose, and
//     that wall is where the walk-through introduces the Ring Scan
//   - ONE scan is enough, and exactly one signature is worth aiming it at
//     (CTA 118), so "work out which one you are stuck on" has
//     a single defensible answer
//   - after the scan the rest falls out by plain elimination in 1 round(s)
//
// Exported on its own rather than added to `regions` in ./index.ts: that
// list is a legacy resolver for old `origin: "builtin"` log entries, and
// seeding the roster from it is exactly what the no-default-region change
// removed.
export const TUTORIAL_REGION_ID = "region-tutorial";

/** The one signature a ring scan has to be aimed at for this to resolve. */
export const TUTORIAL_SCAN_TARGET = "CTA 118";

export const tutorialRegion: Region = {
  id: TUTORIAL_REGION_ID,
  name: "Ember Verge",
  briefing: "Outpost sensors are running at full resolution for this pass. 6 quasar signatures logged. File a full census once classification is complete.",
  quasarTypes: ["Pulsar-Class", "Rogue Emission", "Redshift Anomaly", "Dormant Core"],
  quasars: [
    { id: "CTA 118", designation: "CTA 118" },
    { id: "CTA 115", designation: "CTA 115" },
    { id: "Mrk 280", designation: "Mrk 280" },
    { id: "Mrk 633", designation: "Mrk 633" },
    { id: "Ton 454", designation: "Ton 454" },
    { id: "Q3970", designation: "Q3970" },
  ],
  solution: {
    "CTA 118": { type: "Pulsar-Class", sector: "R2S8" },
    "CTA 115": { type: "Pulsar-Class", sector: "R5S3" },
    "Mrk 280": { type: "Redshift Anomaly", sector: "R2S6" },
    "Mrk 633": { type: "Rogue Emission", sector: "R2S7" },
    "Ton 454": { type: "Dormant Core", sector: "R5S5" },
    Q3970: { type: "Pulsar-Class", sector: "R4S4" },
  },
  clues: [
    { kind: "quasar-sector", quasar: "Mrk 633", sector: "R2S7" },
    { kind: "quasar-sector", quasar: "Q3970", sector: "R4S4" },
    { kind: "quasar-quadrant", quasar: "Ton 454", quadrant: "III" },
    { kind: "quasar-quadrant", quasar: "Mrk 280", quadrant: "III" },
  ],
  solvability: { withoutScans: false, withBestScans: true },
};
