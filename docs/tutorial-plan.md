# First-run tutorial

Backlog item 3 (was 5 before the 2026-08-03 renumber). Plan only — nothing
here is built yet.

**The brief, as given 2026-08-03:** it starts from the blank page, guides
the player through starting a game and through using each section, and the
first region is *always the same one* — simple enough to learn on, but it
must require a Ring Scan.

That last clause is the whole design. Everything below follows from it.

## Why "must require a Ring Scan" changes the region

The earlier plan looked for the gentlest possible field: one that resolves
by plain pairwise propagation with no scans spent. That is the wrong region
to teach on, and the reason is worth keeping.

The Ring Scan is the one instrument a player will never discover on their
own. The Briefing, the Sweep Scope and the Star Map all reward poking at
them. The Ring Scan costs something, it is metered at two per region, and
it is silent about everything except the one signature you aim it at — so a
first region that never needs it teaches the player, correctly, that they
can ignore it. Then their second region is unsolvable and they have no idea
why. `docs/instrument-analysis.md` puts the number on it: aimed well, two
scans take the unsolvable share from ~25% to ~1%; not aimed at all, it
stays at ~25%.

So the tutorial region has to hit a wall on purpose, and the wall is the
lesson.

### The four bars, and how rare they are together

Measured by `scripts/find-tutorial-region.ts` (rewritten for this), 4000
samples:

| bar | | |
| --- | --- | --- |
| Six signatures | 1364 of 4000 | fewer pairwise readings to hold while learning what a reading means |
| **Not** unique with zero scans | 361 (26.5% of those) | propagation must stall — this is the teaching moment |
| One scan is enough | 324 (89.8% of those) | see below |
| Rest propagates in ≤2 rounds, nothing stuck | 226 (69.8% of those) | after the scan it must be ordinary reasoning, not a second wall |

**Tutorial grade: 226 of 1364 six-signature regions (16.6%) — about 18
`generateRegion()` calls to find one.** Rounds needed after the scan:
`1:8  2:218  3:59  4:4`.

**One scan, not two,** is a deliberate bar. The budget is two; a tutorial
that spends the whole allocation teaches nothing about spending it
carefully, and it leaves a learner who aims their first scan wrong with no
way out. 89.8% of scan-requiring regions clear this, so it costs almost
nothing to demand.

Uniqueness is decided by `uniqueWithRingsKnown()` in `src/lib/solvability.ts`
— the same code the app uses — so a region the finder blesses cannot be one
the app judges differently. Propagation depth is measured separately in the
script, because *"a perfect solver could"* and *"a human doing
straightforward elimination can"* are different claims and a tutorial needs
the second.

### The candidate

From the run above, the best of 226 — chosen because exactly **one**
signature is worth scanning, which makes the walk-through's advice
unambiguous:

```
Wraith Shoal — resolves in 2 rounds after one scan
  anchors:  APM 4713 at R1S1,  HE 529 at R3S4
  scan target that works:  CTA 75   (the only one)

  Mrk 18      R5S7   Ancient Relic
  PKS 2083    R3S6   Redshift Anomaly
  CTA 75      R3S8   Ancient Relic
  APM 4713    R1S1   Ancient Relic
  Q3561       R5S6   Rogue Emission
  HE 529      R3S4   Dormant Core
```

Re-run the finder before baking; it samples fresh each time and a nicer
name or a tidier layout may turn up. What must not change is the four bars
and the single-scan-target property.

## Fixing the region — what it buys and what it costs

**Buys:** the walk-through can be *written against the actual solution*.
It can say "PKS 2083 reads 2 from your anchor and 3 from the other, so it
can only be R3S6" instead of gesturing vaguely at technique. It can know in
advance that CTA 75 is the one that stays ambiguous, and stage the Ring
Scan reveal on exactly that. A tutorial over a random region can only teach
process; over a fixed region it can teach the actual inference. Every
screenshot, every piece of copy and every "now try it" step becomes
checkable.

**Costs:** it can be looked up. Accepted — there is nothing to win by
cheating a tutorial, and the earlier objection to a baked region was about
*replayable* regions, not the first one.

Ship it as `src/data/regions/tutorial.ts` alongside `region-2.ts`, exported
separately from `regions` so nothing can accidentally seed the roster with
it (see the note in `src/data/regions/index.ts` about why that list is now
legacy-only). Fixed `id: "region-tutorial"`, so its log entry, star-map
save and completion flag all agree about what it is.

## The walk-through

### Where it starts

A first run now lands on the no-assignment placeholder with
`COPY.briefing.noSurveysHint`. The welcome **replaces** that when
`!tutorialDone && !hasAnySurveys` — the placeholder keeps its existing job
(*your regions are archived*), which is a different state.

`BriefingPanel` already takes `hasAnySurveys` for exactly this distinction,
so the branch it needs exists.

### The steps

Each step: a target panel, an anchor element, one short piece of copy, and
an advance condition. Steps that teach an action advance on the action;
steps that only explain advance on **Next**.

| # | panel | teaches | advances on |
| --- | --- | --- | --- |
| 1 | welcome | what the station wants from you | Next |
| 2 | — | **Survey New Region** opens a field | the click (forced to the tutorial region) |
| 3 | briefing | the briefing, and that Logged Bearings are the only free facts | Next |
| 4 | starmap | arm a signature, place it — do the two anchors | both anchors placed |
| 5 | sweep | a reading is a *distance to a reference*, not a position | one reference cycled |
| 6 | starmap | place the two that fall straight out | both placed |
| 7 | manifest | notes and colours; where to keep what you worked out | Next |
| 8 | starmap | Rule Out and the candidate ring — mark the ambiguity | ≥1 mark of each |
| 9 | ringscan | **the wall.** Two candidates fit every reading. Aim a scan at CTA 75 | scan spent |
| 10 | starmap | finish it | all six placed |
| 11 | starmap | File Classification, and what a discrepancy count means | filed |
| 12 | log / officer | outcomes, the slot cap, rank | Next → done |

Step 9 is the point of the whole thing. It should say plainly that the
player is *not* stuck through error — the region genuinely cannot be
resolved from bearings alone, and working out *which* signature you are
stuck on is itself the deduction.

### Mechanics

- **A controller, not a component.** `tutorial.ts` holds the step list as
  data; `AppShell` reads the active step and force-selects `panel`. Steps
  name an anchor by element id.
- **Anchors already exist** for a good half of it: `#briefing-panel`,
  `#active-assignment-picker`, `#region-detail`, `#logged-bearings`,
  `#starmap-sidebar`, `#sweep-scope-container`, `#nav-rail-primary`,
  `#nav-rail-utility`, `#mobile-menu`, `#officer-badge`, `#main-content`.
  Still needed: the Star Map's mode switch, its signature chips and its
  File/Withdraw row; the Ring Scan's signature buttons; a Star Manifest
  row. Add them as ids in the same style rather than inventing a new
  targeting mechanism.
- **Completion lives on the player**, next to the officer profile —
  `player.ts`, not the survey log. Clearing your surveys must not resurrect
  the tutorial. Store the furthest step reached, not just a boolean, so it
  can resume.
- **Skippable and replayable.** A Skip control on every step, and a Replay
  entry on the Officer panel. Do not gate on "has never played" — people
  re-read tutorials.

### Constraints it must respect

- **Nothing scrolls to reveal chrome** (`docs/lcars-style-notes.md`). A
  coach mark may not push the layout or scroll the page to bring itself
  into view. If an anchor is off-screen the step is wrong, not the layout.
- **Below `lg` navigation is a hub.** "Go to Sweep Scope" is a rail click
  on desktop and a menu-hub tap on a phone, so a step that says "click the
  Sweep Scope button" is wrong on one of them. Steps should name the
  destination and let the controller navigate.
- **The phone hub is full** at eleven entries (backlog item 6) — the
  tutorial must not need a twelfth destination.
- **Read the LCARS notes and `docs/reference/LCARS-2.jpg` before designing
  the overlay.** A coach mark is new chrome and there is no precedent for
  it in the app yet.

## Open decisions

1. **Does the tutorial region count against the survey cap?** It is a real
   region, so by default yes — one of three slots. Simplest, and archiving
   frees it. The alternative (exempt it) means a special case in
   `activeSurveys()`, which is the kind of exception that quietly spreads.
2. **Does it count toward the rank review window?** This one matters more.
   A learner who retracts the tutorial takes a real mark on their record
   for a region they were being taught on. Options: let it count (harsh but
   honest), force `withdrawn` on a tutorial retraction (rank-neutral, see
   `win-conditions.md`), or exclude it from `recordOutcome`. **Recommend
   rank-neutral** — the tutorial should not be able to hurt you.
3. **Does the walk-through block interaction, or only point?** Blocking
   guarantees the script stays in sync with the board; pointing is less
   patronising and survives a player who wanders. Recommend pointing, with
   the advance conditions above tolerating out-of-order work.

## Build order

1. Bake the region (`find-tutorial-region.ts`, review, `tutorial.ts`).
   Verifiable on its own — `verify-puzzles.ts` should cover it, plus an
   assertion that it still needs exactly one scan.
2. Add the missing anchor ids. No behaviour change, reviewable separately.
3. Tutorial state on `player.ts` + the Officer panel's Replay control.
4. The welcome screen (step 1–2 only, ending in a real generated region).
   Shippable alone and already better than the bare placeholder.
5. The coach-mark overlay and the remaining steps.

Steps 1–4 are each independently useful, which is deliberate: this is a
feature that can stall halfway and still leave the app better than it
started.
