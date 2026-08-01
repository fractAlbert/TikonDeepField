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

### The census slices the wrong axis

**See `instrument-analysis.md` for the full comparison.** Headline: the
Quadrant Survey counts signatures per quarter of the field, and a quadrant
spans all five rings — so it says almost nothing about how far out anything
sits, which is the half of the ambiguity that actually matters. Counting
per *ring* instead takes unsolvable regions from 18.6% to 5.8%; reporting
both rings and quadrants takes it to 3.9%.

That is the largest single improvement available anywhere, it needs no new
instrument, and it gives away nothing — the census still names no
individual signature. It is the thing to do first.

### Ring Survey — two variants, and by-type is the better one

Prototype only, deliberately not in the navigation (Prototypes panel, both
variants live side by side). A range gate walks outward from the field's
centre and rings light as it crosses them. Reports a ring, never a segment.

**A - by signature.** Pick a signature, learn its ring.

**B - by type.** Pick a type, learn which rings hold one and how many,
naming nobody - the Quadrant Survey's idiom applied to rings. Modelled as
anonymous per-ring totals, and that reduction is exact: nothing observable
links a name to a type, so types may be permuted freely between names and
the only surviving constraint is the count per ring.

B is the better instrument, and not by a little:

| | unsolvable | resolves by propagation | mean rounds | eliminations/region | stuck |
| --- | --- | --- | --- | --- | --- |
| Today | 19.0% | 60.7% | 2.60 | 133 | 1.32 |
| **B, by type** | **3.1%** | 85.3% | 2.21 | **133** | 0.54 |
| A, budget 2 | 7.9% | 87.0% | 2.17 | 90 | 0.22 |
| A, unlimited | ~0% | 99.6% | 1.27 | 23 | 0.01 |

B does *the same amount of work* - 133 candidate eliminations, unchanged -
while cutting unsolvable from 19% to 3.1%. Being a global constraint it
prunes dead ends rather than handing out naked singles, so the chains
survive: 22% of regions still need three rounds of propagation, 3% need
four. A does the opposite, buying its solvability by removing work.

**Recommendation: ship B, unmetered.** It needs no budget, because it
never answers the question - it only rules things out. A stays parked.

Both work because they attack the documented failure mode directly: the
dominant ambiguity is a signature sliding one ring out and one segment over
with every reading unchanged (`win-conditions.md`), and any ring
information kills half of that move. Variant A's budget curve, for
reference: 1 survey ~12.5% unsolvable, 2 ~7.9%, 3 ~3.6%, unlimited ~0.1%.

**The axis that matters is chain depth, not determinism.** Deterministic is fine —
Sudoku is fully deterministic and is enjoyed for the grind. What separates
a good Sudoku from one that arrives 90% filled in is how many inference
steps chain, so that is what `measure-deduction-depth.ts` measures:

| | resolves by propagation | mean rounds | signatures at depth 1 | eliminations/region |
| --- | --- | --- | --- | --- |
| Today | 63.1% | 2.58 | 29% | 134 |
| Ring budget 2 | 87.5% | 2.16 | 54% | 91 |
| Ring budget 3 | 92.9% | 1.96 | 66% | 69 |
| Unlimited | 99.5% | 1.26 | 90% | 23 |

Unlimited does not make the puzzle deterministic; it already was. It makes
90% of signatures fall straight out of the two anchors with no intermediate
reasoning, and cuts the work done to a sixth. Today 45% of regions need
three rounds and 7% need four — that structure is the thing worth
protecting.

If variant A is ever wanted anyway, it needs a budget of about 2, folded
into the sensor allocation in `win-conditions.md`: that holds mean rounds
at 2.17 against today's 2.60 and keeps 38% of signatures at depth 2.
Variant B needs no such guard, which is the whole argument for it.

**Open question for B:** whether to emit `quasar-type` clues. Without them
a player cannot attach a type to a name, so B reads as anonymous per-ring
totals - which is what makes it safe, and also what caps it. Emitting type
clues would sharpen it and would need re-measuring.

## Interaction

### The star map hover readout is dead on touch

`StarMap`'s readout uses `onMouseEnter`, which never fires on a touch device,
so it sits at `--` on a phone for the whole session. Accepted as-is: tapping
a cell places a signature, which is the actual interaction, and the readout
is a convenience on top. Only worth revisiting if the readout starts carrying
information you can't get any other way.
