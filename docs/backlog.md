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
rather than what was planned).

Shipped 2026-08-04 and removed: maximising the Star Map (5), the menu hub
redesign (6, written up in `mobile-layout-plan.md`) and dimming placed
signatures in the Sweep Scope and Ring Scan (9). Numbers are never reused -
a freed number stays free, so nobody reading an old note lands on a
different item than the one it meant.

| # | item | where |
| --- | --- | --- |
| 1 | `generateRegion()` reads rank, so regions get harder as you rise | Gameplay |
| 2 | No `quasar-type` clues are ever emitted | Gameplay |
| 4 | Star Map 50% wider | Design |
| 7 | Log/Help/Prototypes flick-scroll on a phone, accepted | Design |
| 8 | Star Map hover readout dead on touch, accepted | Interaction |
| 10 | The header overflows horizontally at 320px | Design |

## Design

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

**Half-answered 2026-08-04.** Maximising shipped (the old item 5), and it
takes most of the pressure off: the map now expands to fill `main` on
demand, drawing the dial at ~460px against the docked 260 with every label
scaling to match, and it does that without touching a single width in the
docked layout. What is left of this item is only the *resting* size - is
260px enough for the map you spend the survey looking at - and the trade
above is unchanged. If the answer is no, the honest fix is still that `main`
or the rails have to give.

### 7 - Log, Help and Prototypes flick-scroll on a phone

They overflow 390x844 by 85px, 41px and 42px and fall back to the
hidden-scrollbar scroll inside `main`. That's allowed by the project rules —
content may scroll inside its own panel — and it was accepted knowingly. The
three are all long prose, so the fix, if wanted, is editorial (shorter copy,
or pagination the way the Survey Log does it) rather than layout.

### 10 - The header overflows horizontally at 320px

Found 2026-08-04 while measuring the menu hub, and confirmed pre-existing by
stashing that work and re-measuring: `#app-shell` reports `scrollWidth` 362
against a 320px viewport either way.

The overflow is the officer badge and the sound toggle. Both sit in a
`shrink-0` group beside a title block that will not give up enough room, so
the header's min-content lands at 338px inside 296px of available width.
Nothing is lost - `#app-shell` is `overflow-hidden`, so it clips rather than
scrolling - but "SOUND: ON" is cut in half, and the project rule is that
nothing scrolls to reveal chrome, which a clipped control fails in spirit.

Only at 320px. At 390x844 the header fits with room to spare, which is why
this went unnoticed: 320 is the floor the layout claims to support rather
than a width anyone tests on.

Worth knowing before fixing it: the sound toggle is a plain `<button>`, not
an `LcarsButton`, so it does not inherit the `size` prop added on
2026-08-04. The cheap fixes are dropping the toggle's label to an icon below
`sm`, or letting the badge collapse to its insignia earlier than `md`.

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

### 8 - The star map hover readout is dead on touch

`StarMap`'s readout uses `onMouseEnter`, which never fires on a touch device,
so it sits at `--` on a phone for the whole session. Accepted as-is: tapping
a cell places a signature, which is the actual interaction, and the readout
is a convenience on top. Only worth revisiting if the readout starts carrying
information you can't get any other way.
