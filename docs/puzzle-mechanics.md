# Puzzle Mechanics & Architecture

How a "region" (puzzle) is modeled, generated, solved, and played. Companion
to `tikon-research-station.md` (lore/setting) and `lcars-style-notes.md`
(visual style) — this doc is the code-facing one.

## The field

Every region shares one fixed polar field: `RING_COUNT = 5` rings ×
`SEGMENT_COUNT = 8` bearing segments = 40 sectors (`src/lib/grid.ts`), IDs
like `R3S5` (ring 3, segment 5, 1-indexed for display). A region places its
quasars sparsely across that field — a region with 8 quasars still leaves 32
sectors empty.

Segments group into 4 quadrants of 2 segments each (`quadrantOf`). Two
directional relationships are defined along a fixed axis: **radial**
(inward/outward, same segment) and **angular** (clockwise/counterclockwise,
same ring). `orthogonalDistanceSigned` gives Manhattan-style distance
(ring-steps + segment-hops) between any two sectors — this is what drives
Sweep Scope's relative-distance readout.

## Data model (`src/lib/puzzle-types.ts`)

A `Region` is: a list of `Quasar`s (catalog-style designations, e.g. "3C
273", from `name-generator.ts`), a list of allowed `quasarTypes`, a
`Solution` (quasarId → `{ type, sector }`), and a `clues` array.

Quasar → sector is a **bijection** (each sector holds at most one quasar).
Quasar → type is **not** — a type can repeat across several quasars in the
same region — which is why the solver and clue evaluator both have to
resolve "the X-type signature" against however many quasars currently have
type X (see `resolveType` in `clue-eval.ts`): zero assigned is
indeterminate, exactly one resolves normally, more than one falsifies any
clue that presupposes uniqueness. This is what keeps the puzzle a classic
logic-grid ("zebra puzzle") problem despite types being reusable and the
field being radial instead of a grid.

### Clue vocabulary — defined vs. actually used

`Clue` is a 17-variant discriminated union covering direct facts
(`quasar-type`, `quasar-sector`), type-level facts (`type-sector`,
`type-ring`, `type-segment`, `type-quadrant`), and relational facts
(adjacency, same-ring, same-segment, radial, angular — each in both a
type-based form and a quasar-identity-based form, plus a `negate` flag on
every variant). All 17 are fully implemented in the solver
(`clue-eval.ts`) and rendered to LCARS-style prose (`clue-text.ts`).

**Only 2 of the 17 are actually emitted anywhere** — `quasar-sector` and
`quasar-quadrant` — by both `generateRegion()` and the one hand-authored
region (`data/regions/region-2.ts`). The other 15 kinds (all the relational
and type-level ones) are live, tested-by-the-solver machinery with no
current caller. That's the natural lever for adding puzzle variety later
without touching the solver or renderer at all — just emit more clue kinds
from generation.

## Generation (`src/lib/generate-region.ts`)

`generateRegion()`:
1. Picks 6–8 quasars (`MIN_QUASARS`/`MAX_QUASARS`) and 3+ distinct types
   from a 6-entry `TYPE_CATALOG`, guaranteeing every chosen type gets at
   least one quasar, then fills remaining slots by repeating types freely.
2. Scatters quasars across random sectors, generates names/region
   name/briefing flavor text (`name-generator.ts`, `flavor-text.ts`).
3. Builds **exactly 4 clues** (`buildMandatoryClues`): 2 `quasar-sector`
   anchors chosen to be within `ANCHOR_MAX_DISTANCE` (5) of each other —
   matching Sweep Scope's default visibility range, so the two anchors are
   always usable as a real triangulation pair — plus 2 `quasar-quadrant`
   clues on two other quasars. The remaining quasars (2–4 of them) get **no
   briefing clue at all**; they're meant to be found via Sweep
   Scope/Quadrant Survey triangulation from the two known anchors, not read
   off the page.

Note this does **not** currently check solvability/uniqueness after
generation — `solveRegion` exists and can detect ambiguity (see below) but
generation doesn't call it. Whether a generated region has a unique
solution depends entirely on the fixed clue-count formula happening to pin
things down (it usually does, given the anchor pair + quadrant clues +
Sweep Scope/Quadrant Survey together, but nothing guarantees it).

## Solver (`src/lib/solver.ts`)

Backtracking search over `(Quasar → {type, sector})` assignments, pruned
after every placement via `partialAssignmentIsConsistent`
(`clue-eval.ts` — true unless some clue is *definitely* violated;
clues that can't be evaluated yet from a partial assignment don't block).
Quasars with a direct `quasar-type`/`quasar-sector` clue get their
candidate list collapsed to one value and are searched first, so pruning
kicks in as early as possible. Stops after `maxSolutions` (default 2) —
enough to detect ambiguity without fully enumerating. Not currently wired
into generation or into any UI flow; it's available for a future
"is this region uniquely solvable" check.

## In-game information sources

The player never gets a clean answer from one place — that's deliberate
(see `tikon-research-station.md`, "How a Survey Actually Gets Done"). Each
panel is a distinct, partial information channel:

- **Briefing** (`BriefingPanel.tsx`) — the region's `clues` rendered via
  `clueText()`. Currently always `quasar-sector`/`quasar-quadrant` facts
  per the generation gap above.
- **Star Manifest** (`StarManifestPanel.tsx`) — roster of every quasar by
  name/color, for matching a name mentioned in a clue to what's visible
  elsewhere.
- **Sweep Scope** (`SweepScopePanel.tsx` / `RelativeDistanceScope.tsx`) — a
  rotating single-line sensor sweep against a chosen reference quasar.
  Shows only *unsigned* orthogonal distance (`VISIBILITY_RANGE = 5`) from
  the reference — a quasar 2 clockwise and one 2 counterclockwise land on
  the same tick, so this alone is ambiguous and has to be cross-referenced.
  Runs on a `requestAnimationFrame` loop keyed off wall-clock elapsed time,
  stays mounted (just hidden) across panel switches so the sweep clock
  keeps running in the background.
- **Quadrant Survey** (`QuadrantSurveyPanel.tsx` / `quadrant-survey.ts`) —
  ground-truth census of one quadrant at a time: total count + per-type
  breakdown, no ring/segment/identity.
- **Star Map** (`StarMapPanel.tsx` / `starmap/StarMap.tsx`) — the actual
  answer sheet. Arm a quasar, click a sector to place it (or toggle "Rule
  out" mode to mark cells it definitely isn't at, independent per quasar).
  "Verify" compares current placements against `region.solution` and
  records the attempt (see persistence below); it does not reveal *which*
  placements are wrong beyond a per-marker correct/incorrect ring.

## Persistence (localStorage, client-only)

Two independent stores, both browser-local (no backend):

- **Star Map progress** (`starmap-storage.ts`, key
  `quasar-isolinear:starmap:<regionId>`) — `{ placements, ruledOut }` per
  region, read/written directly by `StarMap.tsx`; `starmap-storage.ts`
  itself only re-exposes the read side so `LogPanel` can show placement
  progress without duplicating `StarMap`'s parsing.
- **Survey log** (`survey-log.ts`, key `quasar-isolinear:survey-log`) — one
  entry per region ever surveyed: origin (`builtin` vs `generated`),
  timestamps, verify-attempt count, solved state, archived flag. A
  `generated` region's entry carries a full snapshot of the `Region` itself
  (not just its id), because generated regions otherwise vanish on reload —
  the in-memory `regions` list `AppShell` keeps is not persisted.
  `useSyncExternalStore`-friendly (`subscribeSurveyLog`/`getSurveyLog`).

**Known leftover from the app rename** (see project memory on the rename):
both storage keys still use the `quasar-isolinear:` prefix rather than a
`tikon-deep-field:`/similar one. Harmless today (nothing reads the string
itself), but worth deciding deliberately — a silent key rename would orphan
existing players' saved progress — before ever touching it.

## File map

```
src/lib/
  puzzle-types.ts      Region/Clue/Solution/Sector data model
  grid.ts               field geometry: sectors, adjacency, radial/angular, quadrants
  clue-eval.ts           clue evaluation against a (partial) assignment
  clue-text.ts            clue -> LCARS prose
  solver.ts                backtracking solve + ambiguity check (unused by generation/UI so far)
  generate-region.ts        procedural region generation
  quadrant-survey.ts         Quadrant Survey panel's data source
  name-generator.ts           catalog-style quasar designations
  flavor-text.ts                region name/briefing flavor text
  survey-log.ts                  play-history persistence
  starmap-storage.ts              Star Map placement persistence (read side)
  polar-geometry.ts                 SVG polar math for StarMap rendering
  copy.ts                            centralized reusable UI chrome text

src/data/regions/       hand-authored regions (currently just region-2.ts)
src/components/panels/  one component per AppShell panel
src/components/starmap/ StarMap SVG board
src/components/sweep/   RelativeDistanceScope (Sweep Scope's instrument)
```
