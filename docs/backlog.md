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

Shipped 2026-08-03 and removed from this list: the survey result report and
auto-archive on close (written up in `win-conditions.md`), and the first-run
tutorial (written up in `tutorial-plan.md`, which now records what was built
rather than what was planned). Remaining numbers were left where they were.

| # | item | where |
| --- | --- | --- |
| 1 | `generateRegion()` reads rank, so regions get harder as you rise | Gameplay |
| 2 | No `quasar-type` clues are ever emitted | Gameplay |
| 4 | Star Map 50% wider | Design |
| 5 | Maximize the Star Map (desktop only) | Design |
| 6 | Mobile menu hub is a wall of fat buttons | Design |
| 7 | Log/Help/Prototypes flick-scroll on a phone, accepted | Design |
| 8 | Star Map hover readout dead on touch, accepted | Interaction |
| 9 | Sweep Scope / Ring Scan don't dim a signature you've already placed | Interaction |

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
- **There is precedent now.** The survey result report (2026-08-03) drops
  the sidebar while it is open and draws the field into `main` at 392px
  against the sidebar's 260. It gets away with unmounting the map because
  the region behind it is closed; a maximise control cannot, which is
  exactly the remount hazard above. What it does establish is the shared
  geometry: `components/starmap/field.tsx` holds the dial's constants and
  its two inert chrome layers, so a second drawing of the field is now a
  small component rather than a copy of StarMap.

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
technician. That is the other half of item 1.

**Note for whoever builds it (added 2026-08-03).** The tutorial region is
now the one region in the game that is *deliberately* pitched, and it is
fixed rather than generated - so it is unaffected by this and must stay
that way. `Ember Verge` is baked, and its whole value is that the
walk-through's copy is written against its exact solution. Whatever reads
rank inside `generateRegion()` must not be able to reach it.

## Interaction

### 9 - Placed signatures should dim in the Sweep Scope and Ring Scan

Raised 2026-08-03. The Star Map's signature chips drop to `opacity-60`
once that signature is on the board, so "what have I still got left to
place" is answerable at a glance. The Sweep Scope's reference buttons and
the Ring Scan's signature buttons are the same list of clickable stars and
should read the same way.

**The catch is that neither panel knows about placements.** They live in
`StarMap`'s own state, written to `quasar-isolinear:starmap:<regionId>`;
Sweep Scope and Ring Scan are handed only the region. So this is either a
`loadStarMapSave` read in each panel - cheap, but a snapshot that goes
stale the moment a marker moves on a desktop where both are visible - or
placements get lifted into `AppShell` and passed down, which is the honest
fix and the larger one. The tutorial work already added an
`onPlacements` callback from `StarMap` to `AppShell` for its step
conditions, so the lifted state is now half-built.

Worth keeping in mind: dimming is *not* the same signal in these panels.
On the Star Map a dimmed chip means "already placed, nothing more to do
with it". On the Ring Scan a placed signature is still a perfectly
legitimate scan target - you may have placed it on a guess. So the dim
should read as "you have put this one down", not as "disabled".

### 8 - The star map hover readout is dead on touch

`StarMap`'s readout uses `onMouseEnter`, which never fires on a touch device,
so it sits at `--` on a phone for the whole session. Accepted as-is: tapping
a cell places a signature, which is the actual interaction, and the readout
is a convenience on top. Only worth revisiting if the readout starts carrying
information you can't get any other way.
