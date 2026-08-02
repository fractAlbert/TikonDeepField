# Backlog

Known-imperfect things, deliberately deferred. Each entry says what's wrong,
why it was left, and what a fix would have to respect — so picking one up
doesn't mean re-deriving the constraint that made it awkward in the first
place.

Fixed things don't live here. They go in the doc for the work that fixed
them (`mobile-comments.md`, `mobile-layout-plan.md`).

## Index

Numbers are stable handles for talking about an item ("let's do 6"). They
are not a priority order — where one is recommended, the entry says so.
Retire a number when its item ships rather than renumbering the rest.

| # | item | where |
| --- | --- | --- |
| 1 | Distance-matrix view or Star Map scratchpad | Interaction |
| 2 | ~~Re-tune rank thresholds~~ done; the real lever is 3 | `win-conditions.md` |
| 3 | `generateRegion()` reads rank, so promotion changes the work | Gameplay |
| 4 | Meter Sweep Scope passes — the rest of the sensor allocation | Gameplay |
| 5 | Record solvability at generation time | `win-conditions.md` |
| 6 | Remove the default region (`region` becomes nullable) | Design |
| 7 | First-run welcome, tutorial region, walk-through | Design |
| 8 | Star Manifest: give it thematic content or drop it | Gameplay |
| 9 | Mobile menu hub is a wall of fat buttons | Design |
| 10 | Log/Help/Prototypes flick-scroll on a phone — accepted | Design |
| 11 | Star Map hover readout dead on touch — accepted | Interaction |
| 12 | No `quasar-type` clues are ever emitted | Gameplay |

## Design

### 9 - The mobile menu hub is a wall of fat buttons

Raised 2026-07-30, on a real phone.

`MobileMenu.tsx` renders all ten destinations as one touching vertical run
stretched to fill the screen height. That's the desktop nav rail's idiom —
its filler segments stretch so the rail reads as a solid edge — but the rail
earns it by being permanent chrome at the edge of a busy screen. A landing
page doesn't. Blown up to a ninth of an 844px screen each, the buttons read
as fat and crude rather than as a system. ("Officer" joined the hub with
the rank work on 2026-07-31, making ten — still no scrolling, but the run
has no room left to grow.)

**Direction agreed:** small buttons with generous empty space are fine here.
The hub is the one screen with nothing competing for the room, so it doesn't
need to spend it.

Constraints a redesign has to keep:

- No scrolling. Ten destinations must fit whatever the layout is — see
  **Project rules** in `lcars-style-notes.md`. Shrinking the buttons makes
  this easier, not harder.
- Touch targets stay >= 44px (`min-h-11`), which is the real floor on "small".
- A run of touching buttons computes `runShape` per row. Wrapping the hub
  into a grid means per-row caps, not one cap set for the whole grid.
- The panel it leads to is reached by `handleNavSelect`; nothing about the
  navigation model needs to change, only the presentation.

### 6 - No default region, with the Log as the way back in

Direction agreed 2026-08-01. The app ships with a built-in region as the
initial active assignment; eventually it should ship with none. A player
starts empty, surveys their first region, and the Log becomes the place
they see what they have and pick one up again.

The onboarding argument is the good part: an empty first screen plus the
Log's own copy already reads as instruction — "click an entry to load it",
"archiving clears a survey from the Briefing panel's selection row". Making
that the deliberate first-run path is better than a built-in region that
quietly implies surveys arrive from somewhere.

Two things block it, and only the first is obvious.

**1. ~~The Log can only preview, never resume.~~ Done 2026-08-01.** Log
entries carry a **Resume** action now, kept separate from the card click so
previewing a finished region still doesn't pull you out of the game you are
playing. Offered only on open regions you are not already in — a closed one
has a read-only board, so activating it would swap a finished survey in for
your live one and gain nothing preview doesn't already give.

Resuming un-archives on the way through, and that is not optional.
"Archived" means hidden from the Briefing picker, and it is the same flag
`noActiveAssignment` keys off — so without it, resuming an archived region
made it active and then rendered the no-assignment placeholder instead of
the region.

**2. `region` becomes nullable everywhere.** `AppShell` resolves it as
`regions.find(...) ?? regions[0]`, which assumes the array is never empty.
Remove the built-ins and a first run has `region === undefined`, so
`touchSurvey(region)` throws, `logPreviewRegion.id !== region.id` throws,
and `RingScanPanel`/`StarManifestPanel` — which take `region: Region`, not
`Region | null` — have nothing to render. `StarMapPanel` already accepts
null and is the model to follow. This is a real refactor rather than a
deletion, and it is the actual cost of the change.

Worth keeping: `noActiveAssignment` already exists and already forces every
panel to a placeholder, so the states are half-built. But the placeholder
is not where a new player should land — see below.

### 7 - First-run welcome, with a generated tutorial region

Direction agreed 2026-08-01, for once the game settles. A first-time
welcome page: enough to get started, then it generates the opening survey —
something deliberately easy, to teach the instruments. Probably with a
walk-through.

This is the answer to "what does a player with no regions see", so it
replaces the empty-placeholder idea above rather than sitting beside it.
The placeholder keeps its current job: *your regions are archived*, which
is a different state from *you have never surveyed anything*.

**"Easy to solve" is measurable, not a feeling.** The tooling is already
here, and it should pick the tutorial region rather than a human judging
one. Generate-and-filter against `measure-deduction-depth.ts`, which
reports exactly the right things:

- **Resolves by plain propagation** — no global argument needed. Only ~61%
  of regions manage this; a tutorial region must be one of them, or the
  player hits a wall that needs a technique nobody has taught them.
- **Shallow chains** — 1 to 2 rounds. Today's mean is 2.6 with 7% needing
  four rounds. A first region wants every signature falling out of the two
  anchors or one step past them.
- **Nothing stuck** — mean is 1.35 signatures unresolvable per region
  today. For a tutorial it must be 0.
- **Six signatures, not eight.** Smaller is more *work*-efficient to teach
  on even though larger regions are more often solvable — fewer pairwise
  readings to hold in your head while learning what the readings mean.

Note those pull against each other: 6-signature regions are the hardest to
resolve (~28% unsolvable against ~13% at eight). So a tutorial region is a
rejection-sampled 6-signature region, not a typical one.

Measured — `scripts/find-tutorial-region.ts`, 3000 samples:

| | |
| --- | --- |
| 6-signature regions meeting all four bars | **29.3%** |
| `generateRegion()` calls to find one | **~11** |

Cheap enough to do live on the welcome screen. No need to pre-bake a
region into the source, which also means the tutorial is a different field
every time and can't be looked up.

**One finding that shapes the walk-through:** only **2 of 960** six-signature
regions resolve in a *single* round. A region where every signature falls
straight out of the two anchors essentially does not exist with the
current clue set — 2 rounds is the real floor, and 3 is common. So the
tutorial cannot avoid teaching chained inference: "this one is now fixed,
which fixes that one". That is the actual skill, so it is the right thing
to teach, but it means the walk-through is a few steps rather than one.

**It needs the same lever rank wants.** `generateRegion()` taking a
difficulty is already on the list further down (rank is meant to draw
harder regions and currently does not). A tutorial region is that lever at
its easiest setting, so building one gets the other most of the way.

**The walk-through needs somewhere to remember itself** — a completed flag
next to the officer profile, and it should be skippable and replayable. Do
not gate it behind "has never played": people re-read tutorials.

### 10 - Log, Help and Prototypes flick-scroll on a phone

They overflow 390x844 by 85px, 41px and 42px and fall back to the
hidden-scrollbar scroll inside `main`. That's allowed by the project rules —
content may scroll inside its own panel — and it was accepted knowingly. The
three are all long prose, so the fix, if wanted, is editorial (shorter copy,
or pagination the way the Survey Log does it) rather than layout.

## Gameplay

### 2, 3, 4, 5 - Win/lose, rank, and the sensor allocation

Lives in **`win-conditions.md`** — the whole design, its build order, and
the two generation constraints (anchor separation, solvability) it depends
on. Not duplicated here.

Status as of 2026-07-31: outcomes, the filing budget, withdrawal, the rank
ladder and the officer record all ship. Two things are still open —
charging for Sweep Scope passes (the Ring Scan is already metered, so
this is the remaining half of the allocation economy), and having `generateRegion()` read the officer's rank
so promotion actually changes the work.

### The starting puzzle is punishing, and only half of that is information

Raised 2026-07-31, from play. Two separate causes, and they need different
fixes:

1. **~19% of regions could not be solved at all.** No amount of skill
   helped, and nothing told you which ones they were. **Fixed** by the Ring
   Scan (below): a careful player now sees ~1%.
2. **The hardest legitimate tier is indistinguishable from the broken
   one.** Only 63% of regions fall to plain pairwise propagation, so about
   18% are solvable *but need a global argument* (quadrant totals, mutual
   exclusion). Hitting a wall therefore tells you nothing about whether
   you are missing a clever argument or the region is impossible — the two
   feel identical and one is unwinnable. A ring budget of 2 drops stuck
   signatures from 1.23 per region to 0.19, which mostly dissolves this.
3. **The bookkeeping is brutal.** Cross-referencing a 6–8 × 6–8 distance
   matrix means cycling the Sweep Scope one reference at a time and holding
   the readings in your head, because there is nowhere in the app to write
   anything down. This is a *UI* problem, and fixing it would make the game
   markedly less painful **without changing the difficulty at all** —
   arguably the better first move. A distance matrix view, or a scratchpad
   on the Star Map, would both qualify.

### ~~Retire the Quadrant Survey~~ - done 2026-08-01

Replaced by the **Ring Scan** panel: aim the array at one signature, learn
which ring it sits in, two scans per region. `QuadrantSurveyPanel.tsx` and
`quadrant-survey.ts` are deleted; `quasar-quadrant` briefing clues are
untouched and still ship two per region.

The census version measured better as a fairness fix and was rejected as a
mechanic - see `instrument-analysis.md`. Short version: a census reads the
same for everyone, so it lowers the loss rate uniformly and measures
nothing, while two metered scans leave a careful player at ~1% unsolvable
and a careless one at ~11%. That spread is what the rank ladder grades.

### 8 - The Star Manifest carries no information

Raised 2026-08-01. It lists every signature by name and colour, and now
also whatever the briefing pins down (sector, quadrant) after the
2026-07-31 fix. But that is all restatement — the briefing already said it
and the Star Map already shows the colours. Nothing on the panel is
something you could not get elsewhere in fewer clicks.

Two ways out, and they want deciding before more is built on it:

1. **Make it thematic.** Give it the character a personnel-and-equipment
   roster would have: catalog provenance, when a signature was first
   logged, which survey picked it up, confidence notes. Flavour rather
   than mechanics — it would earn its place by making the station feel
   staffed rather than by helping you solve anything.
2. **Drop it.** One fewer nav entry, which the mobile hub would thank us
   for (see the fat-buttons entry above — it is at ten and has no room).
   The colour-to-name mapping it provides also already exists on the Star
   Map's signature chips.

Leaning toward (1) only if the flavour is genuinely wanted; otherwise (2).
No mechanical argument for keeping it either way.

### ~~Ring Survey / census~~ - resolved 2026-08-01, shipped as metered scans

Both were built and measured. The **census** (anonymous per-ring
headcounts) is the better fairness fix in isolation: it takes unsolvable
regions from ~19% to ~4% and costs the puzzle nothing at all, 136 candidate
eliminations against today's 135. It was rejected anyway.

The reason is not in the solvability numbers. A census reads the same for
everyone, so it lowers the loss rate uniformly and measures nothing about
the player. Two metered scans instead leave a careful player at ~1%
unsolvable and a careless one at ~11%, and that ten-point spread is player
judgment - which is the thing the rank ladder exists to grade. Retiring the
census also *widens* the spread rather than narrowing it.

What shipped: `RingScanPanel.tsx`, two scans per region, budget persisted
in the survey log so a reload cannot refund one. Re-reading an
already-scanned signature is free, since the cost is the decision about
where to aim rather than the act of looking.

The census presentation work is not wasted if it is ever wanted: `RingScope`
still takes per-ring counts and the prototype panel still exercises all
four looks (sweep / sweep+hold / instant / no dial).

**Open question, unchanged:** whether to emit `quasar-type` clues. Nothing
currently links a signature's name to its type, which is what made a
type-sliced census reduce exactly to anonymous per-ring totals. It has no
bearing on the shipped scan, but it would change any future census.

## Interaction

### 1 — Nowhere to write anything down

**Recommended first.** Solving a region means cross-referencing a 6-8 x 6-8
distance matrix, and the only way to read it is to cycle the Sweep Scope
through every reference one at a time and hold the numbers in your head.
There is nowhere in the app to note anything.

This is the half of "the game is punishing" that no instrument fixed. The
Ring Scan removed the unwinnable regions; it did nothing about the mental
load of the winnable ones. A distance-matrix view, or a scratchpad on the
Star Map, would make the game markedly less punishing **without changing
the difficulty at all** — which is a claim none of the instrument work
could make.

Two shapes worth considering:

- **A matrix view.** Signatures down and across, distances in the cells,
  filled in as you observe them. Closest to what a player is actually
  building in their head. Risk: it does the bookkeeping *for* you, so it
  should probably only show readings you have taken rather than the whole
  true matrix.
- **A scratchpad on the Star Map.** Free-form notes per region, persisted
  beside the placements. Less structured, no risk of handing anything
  over, and much less work.

The Rule Out marks already do a small version of this and are the reason
the Star Map is usable at all — this is the same idea applied to distances
rather than positions.

### 11 — The star map hover readout is dead on touch

`StarMap`'s readout uses `onMouseEnter`, which never fires on a touch device,
so it sits at `--` on a phone for the whole session. Accepted as-is: tapping
a cell places a signature, which is the actual interaction, and the readout
is a convenience on top. Only worth revisiting if the readout starts carrying
information you can't get any other way.
