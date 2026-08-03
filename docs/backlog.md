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
| 2 | No `quasar-type` clues are ever emitted | Gameplay |
| 3 | First-run welcome, tutorial region, walk-through | Design |
| 4 | Star Map 50% wider | Design |
| 5 | Maximize the Star Map (desktop only) | Design |
| 6 | Mobile menu hub is a wall of fat buttons | Design |
| 7 | Log/Help/Prototypes flick-scroll on a phone, accepted | Design |
| 8 | Star Map hover readout dead on touch, accepted | Interaction |

## Design

### 6 - The mobile menu hub is a wall of fat buttons

Raised 2026-07-30, on a real phone.

`MobileMenu.tsx` renders all ten destinations as one touching vertical run
stretched to fill the screen height. That's the desktop nav rail's idiom —
its filler segments stretch so the rail reads as a solid edge — but the rail
earns it by being permanent chrome at the edge of a busy screen. A landing
page doesn't. Blown up to a ninth of an 844px screen each, the buttons read
as fat and crude rather than as a system. ("Officer" joined the hub with
the rank work on 2026-07-31, making ten — still no scrolling, but the run
has no room left to grow.)

**The run is now full.** "Station" joined on 2026-08-02, making eleven.
Measured on a cold load at 320x568, the smallest phone still worth
supporting, every button lands at exactly 44px — the `min-h-11` floor, with
nothing left over. It fits, and it fits by nothing. A twelfth destination
either scrolls or breaks the touch floor, so the redesign below is now a
prerequisite for adding one rather than a nicety. (At 390x844 the same run
is comfortable, 65px a button, which is why this doesn't show up unless you
go looking for it.)

**Direction agreed:** small buttons with generous empty space are fine here.
The hub is the one screen with nothing competing for the room, so it doesn't
need to spend it.

Constraints a redesign has to keep:

- No scrolling. Eleven destinations must fit whatever the layout is — see
  **Project rules** in `lcars-style-notes.md`. Shrinking the buttons makes
  this easier, not harder.
- Touch targets stay >= 44px (`min-h-11`), which is the real floor on "small".
- A run of touching buttons computes `runShape` per row. Wrapping the hub
  into a grid means per-row caps, not one cap set for the whole grid.
- The panel it leads to is reached by `handleNavSelect`; nothing about the
  navigation model needs to change, only the presentation.

### 3 - First-run welcome, with a generated tutorial region

Direction agreed 2026-08-01, for once the game settles. A first-time
welcome page: enough to get started, then it generates the opening survey —
something deliberately easy, to teach the instruments. Probably with a
walk-through.

**This is now the only thing missing.** The default region was removed on
2026-08-03, so "a player with no regions" is a real state that ships today
— and what it currently lands on is the no-assignment placeholder, with a
hint pointing at Survey New Region (`COPY.briefing.noSurveysHint`). That is
honest but it is not a welcome. The two empty states are already told apart
in the code: `BriefingPanel` takes `hasAnySurveys` and picks between
*your regions are archived* and *you have never surveyed anything*, so a
welcome screen has a flag to key off already.

**Planned in full: `docs/tutorial-plan.md`.** Steps, storage, anchors,
constraints, open decisions and a build order that can stall halfway and
still leave the app better. Only the headlines are repeated here.

**Two things changed on 2026-08-03**, both from direction given that day,
and both invert what this entry used to say.

**1. The region is fixed, not generated per player.** The cost is that it
can be looked up; the gain is that the walk-through can be written against
the actual solution — "PKS 2083 reads 2 from your anchor and 3 from the
other, so it can only be R3S6" — instead of gesturing at technique. A
tutorial over a random region can only teach process.

**2. It must *require* a Ring Scan.** This is the reversal that matters.
The old bar was "resolves by plain propagation with no scans" — the
gentlest possible field. That teaches the player, correctly, that the Ring
Scan is ignorable, and then their second region is unsolvable and they
don't know why. The scan is the one instrument nobody discovers on their
own: metered, costly, and silent about everything but its target.

So the tutorial region has to hit a wall on purpose. Re-measured with
`scripts/find-tutorial-region.ts` (rewritten for the new bars), 4000
samples:

| | |
| --- | --- |
| 6-signature regions that are tutorial grade | **16.6%** |
| `generateRegion()` calls to find one | **~18** |
| of scan-requiring regions, share needing only *one* scan | **89.8%** |

Still cheap. The one-scan bar is nearly free and worth demanding: the
budget is two, and a learner who aims their first scan wrong needs a way
out.

**The walk-through needs somewhere to remember itself** — on `player.ts`,
next to the officer profile, so clearing your surveys doesn't resurrect it.
Store the furthest step reached rather than a boolean so it can resume.
Skippable and replayable; do not gate it behind "has never played", since
people re-read tutorials.

### 4 - Star Map 50% wider

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

Item 5 is the other half of the answer: if the map can be maximised on
demand, the docked size matters less.

### 5 - Maximize the Star Map (desktop only)

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

### 7 - Log, Help and Prototypes flick-scroll on a phone

They overflow 390x844 by 85px, 41px and 42px and fall back to the
hidden-scrollbar scroll inside `main`. That's allowed by the project rules —
content may scroll inside its own panel — and it was accepted knowingly. The
three are all long prose, so the fix, if wanted, is editorial (shorter copy,
or pagination the way the Survey Log does it) rather than layout.

## Gameplay

### 1, 2 - Rank and the clue vocabulary

Lives in **`win-conditions.md`** — the whole design, its build order, and
the two generation constraints (anchor separation, solvability) it depends
on. Not duplicated here.

Status as of 2026-08-02: outcomes, the filing budget (now scaled by rank),
withdrawal, the rank ladder, the officer record, per-rank filing marks and
generation-time solvability all ship. Metering the Sweep Scope was
considered and **closed as a non-problem** — free, unlimited readings are
not what made the game hard; the bookkeeping was, and the Manifest fixed
that. What is still open is —
having
`generateRegion()` read the officer's rank so the *regions* get harder as
you rise.

**Partly answered 2026-08-02.** The filing budget now scales with rank
(4 4 3 2 2), which was the cheaper half of "rank changes the work" and the
one that fixed the ladder: it separates an average player from a careful
one, which no threshold setting could. What is still missing is region
difficulty - a Chief of Survey draws exactly the same fields as a
technician. That is the other half of item 1, and it is also the lever the
tutorial region needs (item 3).

## Interaction

### 8 - The star map hover readout is dead on touch

`StarMap`'s readout uses `onMouseEnter`, which never fires on a touch device,
so it sits at `--` on a phone for the whole session. Accepted as-is: tapping
a cell places a signature, which is the actual interaction, and the readout
is a convenience on top. Only worth revisiting if the readout starts carrying
information you can't get any other way.
