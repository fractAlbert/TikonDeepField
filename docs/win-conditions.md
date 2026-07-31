# Win and loss conditions

Status: **mostly built** as of 2026-07-31. Outcomes, the filing budget,
withdrawal, the rank ladder and the officer record all ship. What's still
open is the *sensor* half of the allocation economy — Sweep Scope
references and quadrant censuses are still free and unlimited. See "What
shipped" below for the line between the two.

Companion to `puzzle-mechanics.md` (how a region works) and
`tikon-research-station.md` (the setting this all has to answer to).

## The problem

There was no way to lose, so there was no reason to think. You could file
guesses until one landed, and every instrument was free and unlimited, so a
region could simply be read off the sensors rather than deduced.

Two separate leaks, and the first is now closed:

1. **Verify was an oracle.** Fixed. Filing now returns a discrepancy count
   and nothing else, requires a complete board, and expires the moment you
   move a marker. See `puzzle-mechanics.md` for why the staleness is
   derived rather than cleared.
2. **Information is free.** Open. Sweep Scope references and quadrant
   censuses cost nothing and can be repeated forever. This is the bigger
   of the two.

## Where the stakes come from

Not invented — this is already in `tikon-research-station.md`:

> An unconfirmed quasar reading is just noise... Once it's confirmed, it
> becomes something every ship and station in the region can check its own
> position against.

So a **wrong filing is worse than no filing**. It doesn't sit harmlessly in
a file; it propagates, and ships navigate against it. The risk at Tikon is
to the catalog and to your standing as the officer who signed it off — not
to the crew. That is the right scale for a station with no defense role, no
trade function, and nothing beyond it worth passing through to.

## Three outcomes, not two

| outcome | when | effect |
| --- | --- | --- |
| **Confirmed** | filed, zero discrepancies | counts toward promotion |
| **Retracted** | filed, one or more discrepancies, allocation spent | counts against you |
| **Withdrawn** | allocation spent, region released unresolved | neutral |

Withdrawal is the load-bearing one. It makes failure a professional
judgment call — "I don't have enough to sign this" — rather than a loss
screen, which fits a station whose entire output is trustworthy reference
points. It also gives the player an honest out on a region they've misread.

It must stay *neutral rather than good*, or the optimal strategy is to
withdraw from everything. Neutral means withdrawing never demotes you but
never advances you either: play safe forever and you plateau. That is the
whole reason to ever take the risk.

## Rank

Rank is the long game, and it moves on **patterns, not single surveys**.
One bad filing should sting without being punishing; a run of them should
cost you the post.

### The ladder

Deliberately short, and framed as what the station actually staffs:

1. Survey Technician
2. Assistant Science Officer
3. **Science Officer** — the starting rank, and the one the lore names as
   the reason the post isn't automated
4. Senior Science Officer
5. Chief of Survey

Starting mid-ladder means there is somewhere to fall to that isn't game
over. Demotion below Survey Technician is the only true loss state, and it
should be reachable but rare.

### Review, not scoring

The station reviews your record periodically rather than reacting to each
filing — a **catalog integrity review**. Mechanically that's a rolling
window over your last N closed regions (N ≈ 8), evaluated when the window
is full:

- **Promotion** — enough confirmations in the window, with at most one
  retraction. Something like 5 of 8 confirmed.
- **Demotion** — retractions dominate the window. Something like 3 of 8.
- **Neither** — everything else, including a window heavy with
  withdrawals. Safe play holds your rank and stalls your career.

Exact thresholds want playtesting; the shape matters more than the numbers.
The window resets on a rank change so you don't get demoted twice for the
same stretch of bad work.

### What rank changes

Rank should alter the *work*, not just a label, or it's a scoreboard:

- Higher rank draws harder regions — more signatures, fewer briefing
  clues, anchors further apart.
- Lower rank draws easier ones, which makes demotion a recovery path
  rather than a spiral.
- Possibly a modest allocation bonus at the top, but difficulty is the
  main lever.

## Sensor allocation

The economy that makes information cost something.

Each region carries **~10–14 instrument passes**. Changing the Sweep Scope
reference costs one. A quadrant census costs one. A filing costs one.
Briefing clues are free — they're already on file. When the allocation is
spent you file or withdraw.

Lore fit is exact and needs no invention: Tikon is six decks built around a
sensor array that *dwarfs the hull*, with 40–60 crew who mostly work
sensors. Contended time on that array is the obvious scarce resource, and
it puts the pressure on the station's side of the glass where it belongs.

### Rejected: a countdown timer

Quasars are useful *precisely because* their position never shifts —
`tikon-research-station.md`, "Why It Matters". Nothing is drifting out of
view, so a timer would contradict the one physical fact the setting is
built on. Pressure comes from the schedule, not the sky.

## Generation constraints this forces

Both of these are currently unmet, and both become player-facing the moment
information costs something.

### Anchor separation: 2 to 5 — done

`generate-region.ts` had `ANCHOR_MAX_DISTANCE = 5` and **no minimum**, so
the two exact-coordinate anchors could land adjacent, wasting the pair —
they're meant to be a triangulation baseline, and two neighbouring points
barely constrain anything. `ANCHOR_MIN_DISTANCE = 2` is now in.

## How many regions are actually unsolvable?

Measured, not estimated: `scripts/analyze-solvability.ts`. **Unsolvable
regions are accepted by design** — the point of measuring is to size the
loss rate the rank system has to tolerate, not to drive it to zero.

"Solvable" = every signature is uniquely identified, i.e. exactly one
sector assignment is consistent with everything observable. Types are
excluded: the Star Map only checks sectors, so a region whose types stay
ambiguous is still winnable.

Note this is *not* `solveRegion()`, which asks the narrower question of
whether the briefing alone pins a region down. It doesn't, ever — see the
first row. The script instead enumerates assignments against all three
channels at once, which is why no deduction rule has to be modelled by
hand: any chain of reasoning a player could construct is subsumed by the
enumeration. "B is out of Sweep range from A, and the briefing puts B in
Quadrant II, and only one such sector qualifies" needs no special case —
those are just two filters on B's candidate list.

Across runs of 2000–3000 samples (±1.6pp), the rate lands at **19–20%**:

| information available | unsolvable |
| --- | --- |
| Briefing clues only | 100% |
| + Sweep Scope (full pairwise distance matrix) | ~27% |
| **+ Quadrant Survey (everything)** | **~19%** |
| *hypothetical:* Sweep Scope showing direction too | ~7% |

### Why they're unsolvable — it isn't clustering

The intuitive story is that a region fails when the anchors are close
together and the remaining signatures are all bunched up, so nothing
triangulates. **That is not what happens.** Measured over 1200 regions
(`scripts/explain-ambiguity.ts`, which re-verifies every counterexample
from scratch rather than trusting the search that found it):

- **0%** of ambiguities are global symmetries (mirror images about an
  axis). That was the obvious suspect and it never occurs, because the two
  fixed anchors almost always break any reflection.
- **72%** are *pure one-step diagonals* — every displaced signature moves
  exactly one ring and one segment.
- **42%** displace exactly **one** signature. The whole rest of the region
  is pinned precisely.

The cause is that `orthogonalDistanceSigned` is a Manhattan metric: ring
steps plus segment hops. Moving a signature one ring out and one segment
over leaves its distance to any reference lying the right way *completely
unchanged* — the two steps cancel. So a single signature can float between
two cells while every other signature in the region is nailed down, and no
amount of extra triangulation helps, because every instrument reports
identical readings for both candidates.

A worked example, re-verified independently — Ember Corridor, 6
signatures, anchors at R1S8 and R4S7. Five signatures are uniquely pinned.
SDSS 9932 is not: it is either **R2S7** or **R3S8**, and the distances to
all five known signatures are `1, 2, 3, 3, 2` either way. Both candidates
sit in Quadrant IV, so its quadrant clue doesn't separate them and the
quadrant totals are unchanged.

### Would a third known point fix it? (No — and this is the interesting part)

GPS trilateration needs three references: two distance circles intersect in
two points, and a third picks between them. The natural conclusion is that
the briefing should ship three exact-coordinate anchors instead of two.

Measured, it helps but does not solve:

| exact anchors given | unsolvable |
| --- | --- |
| 2 (current) | ~18% |
| 3 | ~12% |
| 4 | ~9% |
| 5 | ~4% |

**Three known points does not guarantee a unique fix, and neither does
five.** The Euclidean intuition fails because it depends on spheres being
*strictly convex* — two Euclidean circles meet at exactly two points
precisely because their boundaries curve. This field uses an L1 (Manhattan)
metric, whose spheres are diamonds with **flat faces**. Two flat faces can
coincide along an entire edge, so a whole set of positions can be exactly
equidistant from many references at once.

The Ember Corridor example above is the proof: SDSS 9932's two candidates
are equidistant from *all five* other signatures. Five reference points,
still ambiguous. Adding a sixth would only help if it happened to lie in
the one direction that breaks the tie.

So more anchors buy a real but sub-linear improvement, and each one costs a
signature the player would otherwise have deduced — with 6–8 per region, a
third anchor gives away a third of the puzzle to remove about 7 points of
loss rate. Not recommended. The signed sweep below is a better trade: it
removes ~12 points and gives away no answers.

### The scope already computes the sign and discards it

That also explains the hypothetical last row of the table. The scope
already computes a *signed* distance and throws the sign away before
display (`RelativeDistanceScope.tsx` calls `Math.abs`). Direction is
exactly what distinguishes a diagonal twin — from R2S8, the true cell is
one segment counter-clockwise while the impostor is one ring outward.
Showing it would cut the unsolvable rate from ~19% to ~7%. Whether that's
desirable is a design call, not a bug: unsigned readings are what make the
Sweep Scope require cross-referencing at all, which the lore leans on
("no single instrument is enough on its own").

Findings worth keeping:

- **The Quadrant Survey is worth 7.4 points.** Its per-quadrant totals are
  genuinely load-bearing, not decoration — they rule out assignments that
  reproduce every distance reading but distribute signatures wrongly.
- **Signature count matters more than the anchor rule.** Over 5000 samples:
  6 signatures → ~28% unsolvable, 7 → ~17%, 8 → ~13%. More signatures means more
  mutual distance readings, so *bigger regions are easier*. Raising
  `MIN_QUASARS` from 6 is the strongest lever available if the rate ever
  needs lowering — and it doubles as the difficulty knob rank pulls on,
  with the pleasant consequence that promotion makes regions larger and
  more tractable while the fewer clues make them harder.
- **The anchor floor is worth ~2–4 points**, sweeping it on fresh samples:
  1 → 20.5%, 2 → 16.5%, 3 → 15.9%, 4 → 15.1%. A floor of 2 captures most
  of the available gain; 3 buys almost nothing.

Two caveats on the number:

1. It measures whether a region is *possible*, assuming a player who reads
   the whole pairwise matrix by cycling the Sweep Scope through every
   reference. Real players will lose regions that are technically
   solvable, so ~19% is a floor on the loss rate, not the expected one.
2. The Quadrant Survey's per-*type* breakdown is excluded, because
   generation emits no `quasar-type` clues and a player therefore can never
   attach a type to a name. If type clues are ever emitted (15 of the 17
   clue kinds are implemented and unused), that breakdown becomes live
   information and this number drops again.

### Consequences for rank

A ~19% floor is the reason **withdrawal has to be rank-neutral and
first-class**. A player cannot tell an unsolvable region from one they
merely failed to crack, so if withdrawing carried a penalty the game would
be punishing people for its own generator. Promotion thresholds must also
assume roughly one region in five can't be confirmed at all — "5 of 8
confirmed" is comfortable against an ~81% ceiling; "7 of 8" would not be.

### Solvability checking is now optional, not required

The earlier plan called for `solveRegion()` gating generation so every
region was guaranteed winnable. That is no longer a prerequisite: losing is
allowed, and a ~19% impossible rate is a deliberate part of the design
rather than a bug to engineer away.

What it's still useful for is *labelling*. Knowing at generation time
whether a region was solvable lets the survey log distinguish "you missed
this one" from "nobody could have got this", which is worth having for the
review window even if the player is never shown it directly.

## Build order

1. ~~Filing returns a count, not an oracle.~~ Done.
2. ~~Anchor minimum distance of 2.~~ Done.
3. **Partly done** — the withdraw/file endgame and a *filing* budget ship;
   the sensor allocation does not. See below.
4. ~~Outcome recorded per region in `survey-log.ts`.~~ Done.
5. ~~Rank and the review window, on top of that history.~~ Done.
6. Optional: record solvability at generation time, so the log can tell a
   miss from an impossible region. Not started.

## What shipped

### The filing budget, not the sensor allocation

The economy landed in a deliberately narrower form than the design above.
Filing costs something (`FILING_LIMIT = 3` in `survey-log.ts`); reading
instruments still doesn't.

That split was chosen because rank needed *some* way to produce a
retraction, and the filing budget is the smallest thing that does it. It
also leaves the difficulty of information-gathering exactly where it was,
which is the part that had been measured and tuned.

Three filings is enough to act on a near-miss — the discrepancy count is
only useful if you get to use it — and nowhere near enough to enumerate
6–8 signatures over 40 sectors. The remaining work from step 3 is charging
for Sweep Scope references and quadrant censuses, which is a bigger change:
it makes every instrument read a decision, and the ~10–14 pass figure above
wants playtesting against real sessions rather than a guess.

### Rank

Implemented as designed. `ranks.ts` holds the ladder and the thresholds as
pure logic with no storage; `player.ts` owns the persisted profile and runs
the review; `use-player.ts` is the React binding. The three-way split is so
the thresholds — which *will* need playtesting — can be re-tuned without
touching anything that writes to disk.

The state machine is covered by `scripts/simulate-career.ts`, which feeds
sequences of outcomes and asserts where the ladder lands: promotion,
demotion, both thresholds at once, the window reset, falling off the
bottom, reinstatement, and the ceiling at Chief of Survey. Worth having,
because a review is invisible for eight regions and then fires — a wrong
threshold looks like nothing at all until it looks like a bug.

Being relieved is recoverable: the profile grows a **Request
Reinstatement** control that puts you back on as a Survey Technician with a
clean window. The record is kept — that's the point of it — but the stretch
that cost you the post isn't charged twice.

### The officer record

`ProfilePanel` (nav: "Officer"): identity card with an editable and
rerollable name, the ladder with your rung marked, the live review window
with its tally and what it still needs, career totals, and the rank
history — each promotion or demotion annotated with the window that
produced it, so a demotion never reads as arbitrary. `RankLadderModal`
lists every rank and the review rules.

The insignia (`RankInsignia.tsx`) is the survey field itself: five
concentric arcs, one lit per rung. It reuses the Star Map's own geometry,
so rank reads as *how far out you're trusted to classify* rather than as an
arbitrary pip count, and concentric arcs stay legible at 16px where five
separate pips would not. It appears anywhere the officer's name does —
currently the shell header and the profile.

### What rank does not yet change

The ladder's `duty` lines promise harder regions at higher rank ("more
signatures to place, less handed to you"). Nothing reads them yet:
`generateRegion()` doesn't know the officer's rank. That is the natural
next step, and the measured levers are already in hand — signature count is
the strongest one (6 → ~28% unsolvable, 8 → ~13%), with the pleasant
consequence that promotion makes regions *larger and more tractable* while
the thinner briefing makes them harder.

Re-run `npx tsx scripts/analyze-solvability.ts [samples]` after any change
to region size, clue count, anchor rules or `VISIBILITY_RANGE` — all four
move the unsolvable rate, and the rank thresholds are calibrated against
it.
