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

### The star map hover readout is dead on touch

`StarMap`'s readout uses `onMouseEnter`, which never fires on a touch device,
so it sits at `--` on a phone for the whole session. Accepted as-is: tapping
a cell places a signature, which is the actual interaction, and the readout
is a convenience on top. Only worth revisiting if the readout starts carrying
information you can't get any other way.
