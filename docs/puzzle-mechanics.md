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
  "File Classification" **files a complete classification**: it's disabled
  until every signature is placed, and returns a discrepancy *count* only —
  "3 of 7 signatures inconsistent" — never which ones. Confirmation rings
  appear only on a solved region, where they reveal nothing you don't
  already know.

  The result is a snapshot frozen at the moment of filing (the `Filing`
  type in `StarMap.tsx`), and any later edit makes it stale rather than
  updating it. That is load-bearing. The previous version was a `verified`
  boolean latch with correctness derived live from `placements`, so the
  first press turned the map into a permanent oracle — move a marker and
  its ring re-coloured instantly, letting you hunt the solution one cell at
  a time without ever filing again, and without the survey log counting any
  of it. Staleness is *derived* by comparing the board against the
  snapshot rather than cleared by each handler, so no future mutation path
  can forget to invalidate it. Filing is also gated on a full board because
  a partial filing is a free single-cell probe — the same oracle in another
  shape.

### Closing a region

A region is **open** until it is filed correctly, filed wrongly for the
third time, or withdrawn. `FILING_LIMIT = 3` (in `survey-log.ts`) is what
stops the discrepancy count from becoming a search tool: three filings is
enough to act on a near-miss and nowhere near enough to enumerate 6–8
signatures over 40 sectors.

| control | result |
| --- | --- |
| File, zero discrepancies | **Confirmed** |
| File, discrepancies, budget left | still open, count shown |
| File, discrepancies, third filing | **Retracted** |
| Withdraw (two-click confirm) | **Withdrawn** |

Closing is irreversible, and the board goes read-only — the outcome is
already on the record, and the board is now the evidence for it. On a
retraction or withdrawal the true catalog entry is revealed: a dashed ring
on each true sector, tethered to wherever the marker actually ended up.
Nothing is given away by this, because there is nothing left to give.

`recordFiling`/`withdrawSurvey` are the only writers, and both go through
`closeEntry`, which no-ops if the region is already closed. That is what
makes "reported to the career record exactly once" structural rather than
something every call site has to remember.

### Rank (`ranks.ts`, `player.ts`)

Closing a region appends to the officer's outcome stream, and every
`REVIEW_WINDOW` (8) closed regions the station reviews it: 5+ confirmed
with at most 1 retraction promotes, 3+ retractions demotes, anything else
holds. Withdrawal counts as neither. The window resets on any rank change,
so one bad stretch is charged once. `scripts/simulate-career.ts` exercises
every path in that state machine head-on — the review is invisible for
eight regions and then fires, which is not a thing you can usefully test by
clicking. See `win-conditions.md` for why the ladder is shaped this way.

## Persistence (localStorage, client-only)

Three independent stores, all browser-local (no backend):

- **Star Map progress** (`starmap-storage.ts`, key
  `quasar-isolinear:starmap:<regionId>`) — `{ placements, ruledOut }` per
  region, read/written directly by `StarMap.tsx`; `starmap-storage.ts`
  itself only re-exposes the read side so `LogPanel` can show placement
  progress without duplicating `StarMap`'s parsing.
- **Survey log** (`survey-log.ts`, key `quasar-isolinear:survey-log`) — one
  entry per region ever surveyed: origin (`builtin` vs `generated`),
  timestamps, filings spent, outcome, archived flag. A `generated` region's
  entry carries a full snapshot of the `Region` itself (not just its id),
  because generated regions otherwise vanish on reload — the in-memory
  `regions` list `AppShell` keeps is not persisted.
  `useSyncExternalStore`-friendly (`subscribeSurveyLog`/`getSurveyLog`).

  `outcome` and `filings` are both optional, and every reader goes through
  `entryOutcome()`/`filingsUsed()` rather than the raw fields — entries
  written before those existed only recorded a `solved` boolean, which
  reads as confirmed-or-still-open.
- **Officer profile** (`player.ts`, key `quasar-isolinear:player`) — name,
  service number, rank, the full outcome stream, the review-window start
  index, and rank history. Commissioned lazily on first mount (via
  `use-player.ts`) rather than during render, because it generates a random
  name and the server would pick a different officer than the client.

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
  officer-name.ts              officer names + personnel file numbers
  flavor-text.ts                region name/briefing flavor text
  ranks.ts                       rank ladder + catalog integrity review (pure)
  player.ts                       officer profile persistence + review execution
  use-player.ts                    React binding for the above (commissions on mount)
  survey-log.ts                     play-history persistence + region outcomes
  starmap-storage.ts                 Star Map placement persistence (read side)
  polar-geometry.ts                   SVG polar math for StarMap rendering
  copy.ts                              centralized reusable UI chrome text

src/data/regions/       hand-authored regions (currently just region-2.ts)
src/components/panels/  one component per AppShell panel
src/components/starmap/ StarMap SVG board
src/components/sweep/   RelativeDistanceScope (Sweep Scope's instrument)
```
