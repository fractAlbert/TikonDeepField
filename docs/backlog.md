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

### Retire the Quadrant Survey

Decided 2026-08-01. The Ring Survey replaces it — see
`instrument-analysis.md`. Counting per quadrant is the weakest census
measured, and the ring census does the same job far better while keeping
the same anonymity.

Open choice: **replace or keep both.** Replacing gets unsolvable regions to
~5.8%; keeping both gets ~3.9%. Keeping both costs nothing mechanically but
leaves a panel that is now clearly the junior partner, and the whole point
of removing it is that the nav is full. Replacing is the cleaner call
unless the extra ~2 points turn out to matter in play.

What retiring it touches: the `survey` entry in both nav lists in
`AppShell.tsx`, `QuadrantSurveyPanel.tsx` and `quadrant-survey.ts`, the
Help panel's step 4, and the `quadrantTotals` channel in the analysis
scripts (keep the channel — it is still the baseline every other number is
measured against). `quasar-quadrant` **briefing clues are separate and
stay**: they are two of the four clues every region ships with, and nothing
here changes that.

### The Star Manifest carries no information

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

### Ring Survey - settled as an instrument, open on presentation

**Decided 2026-08-01: ship it, as an anonymous per-ring census.** It
replaces the Quadrant Survey. See `instrument-analysis.md` for the full
comparison; the short version is that it takes unsolvable regions from
~19% to ~6% (or ~4% keeping quadrants too) while leaving the amount of
deduction unchanged, because it prunes dead ends rather than answering
anything.

**Not rejected: the by-signature variant, if it is metered.** An earlier
version of this entry called it too strong outright, which overstated the
case - that is true of *unlimited* use, not of a budget. The work cost of a
single targeted scan is modest:

| | unsolvable (aimed well) | eliminations/region |
| --- | ---: | ---: |
| No lifeline | 18.6% | 134 |
| 1 scan | 1.6% | 113 |
| 2 scans | 0.2% | 90 |
| Unlimited | 0.1% | 23 |

One scan buys 17 points of solvability for about 16% of the work, which is
a real trade rather than a giveaway. Unlimited is the thing to avoid: 90%
of signatures then fall straight out of the two anchors with nothing
chaining.

The two are complementary in *feel*, not just in numbers. The census is
always-on and read as routine, like the Sweep Scope; the targeted scan is a
decision you make when stuck, and choosing the target is itself a deduction
step - aimed blind, one scan only reaches 11.7% rather than 1.6%, so
aiming it well is worth about 7x. Both are prototyped
(`TargetedScanPrototype.tsx` for the metered one).

The axis that matters here is **chain depth, not determinism**. Sudoku is
fully deterministic and unique and is enjoyed for the grind; what separates
a good one from one that arrives 90% filled in is how many inference steps
chain. `measure-deduction-depth.ts` measures exactly that, and the census
leaves it alone: 22% of regions still need three rounds, 3% need four.

#### Still open: the look

Four presentations are live in the Prototypes panel, all showing the same
census off the same data:

- **A - Sweep.** Returns flash as the gate crosses and fade behind it, like
  the Sweep Scope. Most characterful; you have to watch a whole pass and
  remember five numbers.
- **B - Sweep + hold** *(current default)*. Identical, except a crossed
  ring keeps its count, so one pass leaves the finished census on screen.
  Keeps the character without being a memory test.
- **C - Instant.** No animation. Honest about being a readout rather than a
  live sensor, and the fastest to use.
- **D - No dial.** One LCARS bar per ring. Most legible, least
  characterful, and it throws away the fact that rings *are* radial - on
  the dial a count maps onto the Star Map with nothing to translate.

An empty ring produces no return in every version, which is honest: the
instrument found nothing there. The count is still listed in the text
readout.

**Open question:** whether to emit `quasar-type` clues. Nothing currently
links a signature's name to its type, which is what makes a type-sliced
census reduce exactly to anonymous per-ring totals - safe, and also capped.
Emitting type clues would sharpen it and would need re-measuring.

## Interaction

### The star map hover readout is dead on touch

`StarMap`'s readout uses `onMouseEnter`, which never fires on a touch device,
so it sits at `--` on a phone for the whole session. Accepted as-is: tapping
a cell places a signature, which is the actual interaction, and the readout
is a convenience on top. Only worth revisiting if the readout starts carrying
information you can't get any other way.
