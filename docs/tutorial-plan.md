# First-run tutorial

**Shipped 2026-08-03.** This was the plan; the "As built" section at the
bottom records where the build departed from it and what only showed up
once the thing was walked end to end.

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

---

## As built (2026-08-03)

Shipped in one pass rather than the five staged steps above, because the
region turned out to be the only genuinely independent piece — everything
after it needs the step list to exist to be worth reviewing.

### The region

`Ember Verge`, baked by `scripts/bake-tutorial-region.ts --write` into
`src/data/regions/tutorial.ts`. It beat the plan's candidate: **1** round of
plain elimination after the scan rather than 2, with exactly one viable aim
point. `scripts/explain-tutorial-region.ts` prints its whole deduction path,
and the walk-through copy is written from that output rather than from
memory:

```
briefing:      Mrk 633 @ R2S7, Q3970 @ R4S4 (anchors)
               Ton 454, Mrk 280 in Quadrant III
               nothing at all about CTA 118 or CTA 115
bearings only: CTA 115 -> R5S3, Mrk 280 -> R2S6, Ton 454 -> R5S5
THE WALL:      CTA 118 is R1S7 or R2S8 — and the two are indistinguishable:
               both read 1 from Mrk 633, both out of range from Q3970
one scan:      ring 2, which kills R1S7, and the region closes
```

That last line is why this region is better than tutorial-grade. The wall is
a *single* signature whose two candidates read identically from **every**
bearing available, so the copy can state the actual inference instead of
gesturing at technique — which was the entire argument for fixing the region
in the first place.

`scripts/verify-puzzles.ts` now re-asserts all four bars plus "the
walk-through aims at the one signature that works", so a re-bake that
invalidates the copy fails the build rather than shipping a tutorial that
teaches a false inference.

### The three open decisions, as answered

1. **Survey cap** — counts, as recommended. No special case in
   `activeSurveys`.
2. **Rank** — answered by direction on the day, and better than either
   option written here: **a tutorial win counts toward your career, a
   tutorial failure does not count against it.** `careerOutcome` in
   `survey-log.ts` reports a tutorial `retracted` to the record as
   `withdrawn` — reusing the ladder's existing neutral outcome, so no new
   case in `reviewVerdict` — while `confirmed` passes through untouched.
   The log entry keeps `retracted`, so the board and the report stay honest
   about what happened; only the record is merciful. The report says so
   explicitly, since otherwise a retraction reads as a real mark.
3. **Blocking vs pointing** — points. `pointer-events` is off everywhere
   except the coach bar, and every step condition asks about the board's
   state rather than intercepting a click, so working out of order still
   satisfies them. Next is never disabled: a player who already knows a step
   can move on.

### What the plan got wrong

- **A docked bar, not a coach mark.** The plan assumed a tooltip pinned to
  an anchor. That cannot work under the no-scroll rule — the usual fix for
  an off-screen anchor is to scroll it into view, which is exactly what is
  forbidden — and on a 390px screen it would cover the thing it points at.
  The bar is fixed to the bottom, so it is never off screen and never moves
  the layout; anchors get an *outline* instead, which is drawn outside the
  box and so cannot shift a panel that exactly fits.
- **The shell shrinks rather than being overlaid.** `#app-shell` takes
  bottom padding while a step is up. Since the shell never scrolls, content
  underneath a fixed bar would be unreachable rather than merely hidden.
- **"Place the two that fall straight out" is three.** Measured, not
  guessed.
- **The phone lands on the menu hub, not Briefing** — so the welcome screen
  shipped desktop-only until the hub was made to yield to it. The one place
  a welcome matters most is the platform that never showed it.

### Three bugs that only appeared by walking it

Worth recording because none were visible from the code, and the first two
were invisible to a DOM check that only counted elements:

1. **The Sweep Scope never mounted.** The step controller set the panel with
   `setRequestedPanel`, bypassing `selectPanel` — which is also what sets
   `visitedSweep`, the flag that mounts the scope at all. Step 3 navigated to
   an empty panel and told the player to read an instrument that wasn't
   there. Caught by measuring the container at height 0.
2. **Anchors in panels that mount on navigation never highlighted.** One
   `requestAnimationFrame` fires before React has committed the newly
   selected panel. Now retried for ~30 frames.
3. **React wipes an imperatively-added class.** `#sweep-scope-container`'s
   `className` flips between `""` and `"hidden"`, and React rewrites it on
   exactly the render a step navigates — silently removing the highlight.
   A `MutationObserver` puts it back. This worked on every static-className
   anchor and failed only on the dynamic one, which is the kind of thing
   that ships.

### The first placement, guarded (2026-08-04)

The step that taught placement was one step doing two of them: *"click a
signature to arm it, then click a cell to drop it. Start with the two you
already know: Mrk 633 at R2S7, and Q3970 at R4S4."* Four things named in one
sentence, to a player who has not yet clicked anything, with a condition
that only clears when both are down. Split in two, and the first half
guarded three ways:

- **One named signature**, not a choice of six.
- **Its chip is ringed** in the Star Map's signature list, in the
  walk-through's teal - so the copy naming "Mrk 633" is tied to the thing
  you have to click. Done as a React class on the chip rather than through
  `TutorialCoach`'s imperative anchor ring, which sets `border-radius: 4px`
  and would have squared off a `rounded-full` chip.
- **Its cell is ringed on the dial**, with a leader out to a label carrying
  the sector id - `components/starmap/TargetCallout.tsx`, in the station
  schematic's callout idiom.

The second anchor keeps the chip and loses the cell. The copy still names
R4S4, so finding it is the first thing the player does unaided, and reading
the grid is a skill the rest of the region depends on. Guarding it twice
teaches them to wait for the ring.

Two things the callout had to work around, both measured rather than eyed
(`scripts/check-tutorial-callout.ts`):

- **There is nowhere to put the label.** The dial is a circle of radius 200
  in a 440-unit box, so the only empty space is the corners - and the
  quadrant labels are already there, at radius 236 on the diagonals, with
  the segment labels at 214. The slot threads between them with ~13 units
  of margin. The script measures the label box and both leader segments
  against every label the dial draws, for all 40 cells, so pointing a
  future step somewhere new is a re-run rather than a guess. It enforces
  only the cells the step list actually hints at, and prints the rest: a
  fixed slot per corner means a leader to a cell at the far edge of that
  quadrant comes in shallow, which is a real limit on *where a hint may
  point* rather than a bug in the slot.
- **A dashed cell outline was already taken.** Stroking `cellPath` is the
  literal reading of "outline the space", but an armed signature dashes
  every empty cell as its ghost-target hint - so the one cell that mattered
  would have been saying the same thing as thirty-nine others. A ring at
  14.5 fits inside a cell's 15.5 units of clearance and reads as a target
  instead. It cannot be confused with the confirmation ring at 14: that one
  only ever appears on a cell that already has a marker in it.

The walk-through is eleven steps now, not ten.

### Field references in white (2026-08-04)

The copy is dense with coordinates - *"the briefing puts Mrk 280 in Quadrant
III, and the scope reads it 1 away from Mrk 633 at R2S7"* is four of them in
one sentence - and as flat prose they all sit at the same weight, so finding
the one you have to act on means reading the paragraph again. `tokenizeCopy`
splits a step body into plain and field-reference runs and the coach bar
sets the second in white against its dimmed ice.

The rule is deliberately narrow: **only things you can point at on the
dial** - a signature designation, a sector id, a quadrant, or a spelt-out
`ring 4` / `segment 4`. Instrument and panel names are out, and so is
anything merely important. Emphasis covering half a paragraph emphasises
nothing, and once it stops meaning "go and look at this" it is only bold
text. The digit in the spelt-out case is what keeps it off "ring-steps",
"segment-hops" and the Ring Scan, none of which name a place; designations
are read off the baked region, so a re-bake that renames one cannot leave
the walk-through pointing at a signature that no longer exists.

### Verified end to end

Both outcomes, on desktop and at 390x844:

| | |
| --- | --- |
| Win path | 06/06 matched, 1 filing, 1 of 2 scans; career records `confirmed` |
| Fail path | entry `retracted`, career records `withdrawn`, report says so |
| All 10 steps | correct panel, correct anchor ringed, conditions flip on the board |
| Phone | welcome reachable, shell never scrolls, no horizontal overflow |
