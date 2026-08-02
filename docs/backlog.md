# Backlog

Known-imperfect things, deliberately deferred. Each entry says what's wrong,
why it was left, and what a fix would have to respect — so picking one up
doesn't mean re-deriving the constraint that made it awkward in the first
place.

Fixed things don't live here. They go in the doc for the work that fixed
them (`mobile-comments.md`, `mobile-layout-plan.md`).

## Index

Numbers are handles for talking about an item ("let's do 6"), not a
priority order — where one is recommended, the entry says so. Shipped items
are removed and the rest renumbered, so a number only means what this table
says it means today.

| # | item | where |
| --- | --- | --- |
| 1 | `generateRegion()` reads rank, so regions get harder as you rise | Gameplay |
| 2 | Cap active assignments at 3 | Gameplay |
| 3 | Circle the signatures a filing got right | Gameplay |
| 4 | Meter Sweep Scope passes, the rest of the sensor allocation | Gameplay |
| 5 | Record solvability at generation time | `win-conditions.md` |
| 6 | No `quasar-type` clues are ever emitted | Gameplay |
| 7 | Remove the default region (`region` becomes nullable) | Design |
| 8 | First-run welcome, tutorial region, walk-through | Design |
| 9 | Star Map 50% wider | Design |
| 10 | Maximize the Star Map (desktop only) | Design |
| 11 | Mobile menu hub is a wall of fat buttons | Design |
| 12 | Log/Help/Prototypes flick-scroll on a phone, accepted | Design |
| 13 | Star Map hover readout dead on touch, accepted | Interaction |
| 14 | Let a player recolour a signature | Interaction |

## Design

### 11 - The mobile menu hub is a wall of fat buttons

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

### 7 - No default region, with the Log as the way back in

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

### 8 - First-run welcome, with a generated tutorial region

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

### 9 - Star Map 50% wider

Raised 2026-08-02. The sidebar is `w-[360px]` and the dial inside it is
capped at `max-w-[260px]`, which is what makes the ring and segment labels
paint at ~10px and left no room for the quadrant labels to grow past 17
user units.

The catch is where the width comes from. `main` is only ~500px at 1344px
wide once the sidebar and both rails have taken their share; another 180px
of sidebar leaves it around 320px, which is narrower than the Log cards and
the Station Info tab row are built for. So this is not a one-number change
— either the rails give up width too, or the panels that live in `main`
have to cope with less.

Item 15 is the other half of the answer: if the map can be maximised on
demand, the docked size matters less.

### 10 - Maximize the Star Map (desktop only)

Raised 2026-08-02. A button that expands the Star Map to fill `main`, with
the dial drawn much larger, and a Back control to return to the docked
view. Desktop only — below `lg` the map is already a full-width panel of
its own, so there is nothing to maximise.

Notes for whoever builds it:

- The map must not be **remounted** when it expands. `StarMap` owns
  placement state and writes it to localStorage; two live instances would
  fight over the same key, which is the same hazard `useMediaQuery` exists
  to avoid (see `use-media-query.ts`). Move the existing node, or hide the
  sidebar and render into `main` from the same place in the tree.
- The dial scales with its container — `viewBox` is fixed at 440 units, and
  every label size is in user units — so a larger box makes the labels
  larger for free. That is the actual point of the feature.
- The nav rails should stay reachable; maximising the map should not become
  a mode you can get stuck in.

### 12 - Log, Help and Prototypes flick-scroll on a phone

They overflow 390x844 by 85px, 41px and 42px and fall back to the
hidden-scrollbar scroll inside `main`. That's allowed by the project rules —
content may scroll inside its own panel — and it was accepted knowingly. The
three are all long prose, so the fix, if wanted, is editorial (shorter copy,
or pagination the way the Survey Log does it) rather than layout.

## Gameplay

### 1, 4, 5, 6 - Rank, the sensor allocation, and what is left

Lives in **`win-conditions.md`** — the whole design, its build order, and
the two generation constraints (anchor separation, solvability) it depends
on. Not duplicated here.

Status as of 2026-07-31: outcomes, the filing budget, withdrawal, the rank
ladder and the officer record all ship. Two things are still open —
charging for Sweep Scope passes (the Ring Scan is already metered, so
this is the remaining half of the allocation economy), and having
`generateRegion()` read the officer's rank so the *regions* get harder as
you rise.

**Partly answered 2026-08-02.** The filing budget now scales with rank
(4 4 3 2 2), which was the cheaper half of "rank changes the work" and the
one that fixed the ladder: it separates an average player from a careful
one, which no threshold setting could. What is still missing is region
difficulty - a Chief of Survey draws exactly the same fields as a
technician. That is the other half of item 1, and it is also the lever the
tutorial region needs (item 8).

### 3 - Circle the signatures a filing got right

Raised 2026-08-02, from play: working out which markers are wrong is the
hard part, and a filing that only says "3 of 7 inconsistent" gives nothing
to act on. Mark the correct ones so the player can see what to leave alone.
Proposed to fade out with rank, so a Chief of Survey files blind.

**This is the oracle the filing rework removed**, and that is worth saying
plainly before building it. Until 2026-07-30 the Star Map showed
per-signature correctness and kept showing it as you edited, so you could
hunt the answer one cell at a time without ever filing again. The fix was
to return a count and nothing else.

Two things make the proposal different from what was removed:

- **Filings are capped at three now.** The old oracle was free and
  unlimited, which is what made it degenerate. Three marked filings is a
  budget, and spending one to learn which five of eight are right is a real
  trade.
- **It would be rank-scaled.** At the bottom of the ladder it is training
  wheels; at the top it is gone. That is the same lever as item 1, and it
  gives the ladder something to change about the *work* rather than the
  label.

**It is more self-limiting than it looks.** The obvious exploit is to file
a garbage board immediately and harvest the marks, since a wrong filing
that is not your third records nothing against your rank — it costs a
filing and nothing else. That does not pay: a randomly placed board gets
about **0.2 signatures right** (8 signatures across 8 of 40 cells), so a
speculative filing circles nothing and has spent a third of the budget.

The marks are only worth anything on a board you have already reasoned
out, which is exactly when a player deserves confirmation. So it probably
needs no extra bounding. If it does prove too strong in play, the least
damaging limit is circling a **count per ring or quadrant** rather than per
signature — still actionable, still not a per-cell answer.

**Implementation note, and it is the important one.** The marks must come
from the frozen `Filing` snapshot in `StarMap.tsx`, never from live
`placements`. That snapshot already exists and already goes stale the
moment a marker moves — which is exactly what stops this becoming the old
live oracle again. The rendering hook is already there too: confirmation
rings are drawn today when `currentFiling.solved`, so this is the same
draw, gated per signature instead of all-or-nothing.

### 2 - Cap active assignments at 3

Raised 2026-08-02. You can have any number of surveys on the go. Capping it
at three means starting a fourth requires finishing or letting go of one,
which is the pressure the filing budget and the rank ladder are already
built around — a survey you never close costs you nothing today.

It also fixes a problem this session created. Generated regions now survive
a refresh (`5ebfa7d`), so the Briefing picker lists every unarchived
survey rather than just the current session's; a cap keeps that list to
three by construction instead of relying on the player to archive.

Decisions it needs:

- **What counts as active.** Cleanest is "unarchived and not closed" —
  confirmed, retracted and withdrawn regions are done and should not
  occupy a slot. That makes the cap a limit on *unfinished* work, which is
  the thing worth limiting.
- **What happens at the cap.** Survey New Region should refuse with a
  reason rather than silently doing nothing, and point at the way out
  (close one, or withdraw it). Withdrawal already exists as the honest
  escape and is rank-neutral, so the cap gives it a second job.
- **Existing saves are over the cap.** Most players will already have more
  than three open. Do not delete or auto-archive anything — block *new*
  surveys until they are back under, and say so.

## Interaction

### 14 - Let a player recolour a signature

Raised 2026-08-02, from play. Colours are assigned by position in the
region's quasar list, so which two a region gets is luck — and two close
shades on the signatures you happen to be cross-referencing makes the Sweep
Scope harder to read than the puzzle warrants. Being able to change one
when it matters costs the design nothing.

The palette is ten entries (`quasar-colors.ts`) against 6-8 signatures per
region, so collisions are not the problem; adjacency is. `#6fd0e8` cyan and
`#7ab8ff` sky blue, or `#ffb454` orange and `#f5d35c` yellow, are hard to
tell apart at blip size.

Shape it should take: an override store keyed by region and quasar, and a
single `colorFor(regionId, quasarId, index)` that every call site uses.
`quasarColorHex(index)` is currently called directly in seven components
(Star Map, Sweep Scope, Manifest, Log, Ring Scan and both prototypes), so
the work is routing them through one helper — after which a change lands
everywhere at once, which is the requirement. Do not thread a colour prop
down; that is the version that gets missed in one place.

### 13 - The star map hover readout is dead on touch

`StarMap`'s readout uses `onMouseEnter`, which never fires on a touch device,
so it sits at `--` on a phone for the whole session. Accepted as-is: tapping
a cell places a signature, which is the actual interaction, and the readout
is a convenience on top. Only worth revisiting if the readout starts carrying
information you can't get any other way.
