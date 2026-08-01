# Backlog

Known-imperfect things, deliberately deferred. Each entry says what's wrong,
why it was left, and what a fix would have to respect — so picking one up
doesn't mean re-deriving the constraint that made it awkward in the first
place.

Fixed things don't live here. They go in the doc for the work that fixed
them (`mobile-comments.md`, `mobile-layout-plan.md`).

## Design

### The mobile menu hub is a wall of fat buttons

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

### Log, Help and Prototypes flick-scroll on a phone

They overflow 390x844 by 85px, 41px and 42px and fall back to the
hidden-scrollbar scroll inside `main`. That's allowed by the project rules —
content may scroll inside its own panel — and it was accepted knowingly. The
three are all long prose, so the fix, if wanted, is editorial (shorter copy,
or pagination the way the Survey Log does it) rather than layout.

## Gameplay

### Win/lose, rank, and the sensor allocation

Lives in **`win-conditions.md`** — the whole design, its build order, and
the two generation constraints (anchor separation, solvability) it depends
on. Not duplicated here.

Status as of 2026-07-31: outcomes, the filing budget, withdrawal, the rank
ladder and the officer record all ship. Two things are still open —
charging for Sweep Scope and Quadrant Survey passes (the sensor half of the
allocation economy), and having `generateRegion()` read the officer's rank
so promotion actually changes the work.

### The starting puzzle is punishing, and only half of that is information

Raised 2026-07-31, from play. Two separate causes, and they need different
fixes:

1. **~19% of regions cannot be solved at all.** No amount of skill helps,
   and nothing tells you which ones they are. The **Ring Survey
   prototype** (live in the Prototypes panel) is aimed at this — see
   below.
2. **The bookkeeping is brutal.** Cross-referencing a 6–8 × 6–8 distance
   matrix means cycling the Sweep Scope one reference at a time and holding
   the readings in your head, because there is nowhere in the app to write
   anything down. This is a *UI* problem, and fixing it would make the game
   markedly less painful **without changing the difficulty at all** —
   arguably the better first move. A distance matrix view, or a scratchpad
   on the Star Map, would both qualify.

### Ring Survey — how much of it to allow

Prototype only, deliberately not in the navigation. A range gate walks
outward from the field's centre and the ring holding the selected signature
lights as it crosses. Reports a ring, never a segment.

It is a near-perfect antidote to the documented failure mode: the dominant
ambiguity is a signature sliding one ring out and one segment over with
every reading unchanged (`win-conditions.md`), and knowing the ring kills
half of that move. Measured over 3000 regions:

| ring surveys allowed | unsolvable |
| --- | --- |
| 0 (today) | ~19% |
| 1 | ~12.5% |
| 2 | ~7.9% |
| 3 | ~3.6% |
| unlimited | ~0.1% |

**The open question is the budget, not the instrument.** Unlimited hands
over half the coordinate: with every ring known, each pairwise distance
reduces to a segment hop by subtraction, and the puzzle collapses from
deduction to arithmetic. A small budget behaves completely differently —
*which* signature to spend it on is itself a deduction, and it converts a
dead end into a decision. That is the same shape as the sensor allocation
in `win-conditions.md`, and is probably the thing to build it into rather
than shipping it standalone.

## Interaction

### The star map hover readout is dead on touch

`StarMap`'s readout uses `onMouseEnter`, which never fires on a touch device,
so it sits at `--` on a phone for the whole session. Accepted as-is: tapping
a cell places a signature, which is the actual interaction, and the readout
is a convenience on top. Only worth revisiting if the readout starts carrying
information you can't get any other way.
