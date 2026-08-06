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

**The rungs, the two per-rank levers and the review thresholds now live in
`rank-ladder.md`**, as tables meant to be edited. This section keeps the
*why*; that file holds the values, and it is the one to change.

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

**Superseded 2026-08-04 — relief now ends the career.** It is no longer
recoverable within a career: the game ends and you begin a new one, and
**Retire** joins it as the way out that isn't losing. Everything above still
holds about *reaching* it; what changed is what happens next. The spec is in
`rank-ladder.md` under *Career end*.

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

### The Ring Survey prototype is the strongest lever found so far

Same diagnosis, different remedy. If the ambiguity is a signature sliding
one ring out and one segment over, then simply *being told the ring* kills
half the move. Measured, it does exactly that — and then some:

| ring surveys allowed | unsolvable |
| --- | --- |
| 0 (today) | ~19% |
| 1 | ~12.5% |
| 2 | ~7.9% |
| 3 | ~3.6% |
| unlimited | ~0.1% |

Unlimited use effectively ends the problem, which is precisely why it is a
prototype (Prototypes panel) and not a panel. With every ring known, each
pairwise distance reduces to a segment hop by subtraction: 90% of
signatures then fall straight out of the two anchors with nothing chaining,
and the work drops from 133 candidate eliminations per region to 23.

A second variant avoids that entirely. **Ring Survey by type** — pick a
type, see which rings hold one and how many, naming nobody, exactly as the
Quadrant Survey does — takes unsolvable to **3.1%** with the eliminations
*unchanged at 133* and chains intact (22% of regions still need three
rounds). Being a global constraint it prunes dead ends instead of handing
out naked singles, so it fixes the loss rate without removing any of the
puzzle. That is the variant to ship, and unlike the by-signature one it
needs no budget.

See `backlog.md` for the full comparison and `measure-deduction-depth.ts`
for the method. Chain depth, not determinism, is the axis that matters:
Sudoku is fully deterministic and unique too, and is enjoyed for the grind.
What hurts is a region arriving 90% filled in.

Note this changes the calibration argument below. A ~19% floor is why
withdrawal has to be rank-neutral — but if the floor drops to ~4%, that
reasoning weakens and the promotion thresholds have more headroom than
they were set against. Withdrawal should stay neutral regardless (a player
still cannot tell an impossible region from one they misread), but the
thresholds are worth revisiting if this ever ships.

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

### Superseded 2026-08-01 — the floor is now ~1%, and skill-dependent

Everything below was calibrated against a ~19% floor of regions nobody
could solve. The **Ring Scan** (`instrument-analysis.md`) changed that: two
metered scans per region take a careful player to **~1% unsolvable**, and a
careless one to ~11%.

Three consequences, and the third is the important one:

1. Promotion thresholds have far more headroom than they were set against.
   "5 of 8 confirmed" was chosen to sit under an ~81% ceiling; the ceiling
   for careful play is now ~99%.
2. Withdrawal still has to be rank-neutral. ~1% of regions remain
   impossible, and misreading a solvable one is still the common failure.
3. **The loss rate is now skill-dependent, which it never was before.** A
   retraction increasingly reflects the player's judgment — chiefly whether
   they spent their two scans on the signatures they were actually stuck on
   — rather than the generator's luck. That is precisely what the review
   window was built to measure, and it only became true with this change.

**Re-tuned 2026-08-01.** `PROMOTION_CONFIRMED` went 5 → 6. Five was about
77% of what was achievable against the old ~81% ceiling; the same fraction
of a ~99% ceiling is ~6.1 of 8. `DEMOTION_RETRACTED` stays at 3 — raising
it to 4 takes a careless player's chance of being relieved from ~77% to
~41%, but the player that spares is one who never withdraws and files a
wrong classification instead, repeatedly. Being relieved is the game
teaching that lesson.

### The thresholds are a weak lever, and this is the interesting part

`scripts/tune-rank-thresholds.ts` simulates careers against the shipped
review logic (with a self-check that its mirror of that logic still
agrees). Three player profiles, 4000 careers each, 60 regions per career.
Mean final rank, on a scale where −1 is relieved and 4 is Chief of Survey:

| promote / demote | careless | average | careful |
| --- | ---: | ---: | ---: |
| 5 of 8 / 3 *(old)* | −0.47 | 3.85 | 4.00 |
| **6 of 8 / 3** *(now)* | −0.66 | 3.78 | 4.00 |
| 7 of 8 / 3 | −0.87 | 3.48 | 4.00 |
| 6 of 8 / 4 | 0.25 | 3.96 | 4.00 |

Read the last column. **A careful player reaches the top under every
threshold tested**, including 7 of 8. Moving the promotion bar barely moves
anyone except the average player, and the demotion bar only really governs
the careless one.

That is structural, not a bad choice of number: attempts are unlimited and
the window resets on promotion, so any player whose confirm rate gives a
non-zero chance of clearing the bar will eventually string together a
window that does. No threshold fixes that.

What would: **making the work harder as rank rises** — the `duty` lines on
the ladder already promise it, and nothing implements it. Simulating a
difficulty gradient of 0.06 per rank barely dented saturation (careful
still tops out 96–100%), so it would need to be considerably steeper than
that to create a real equilibrium where holding Chief of Survey is work.
Until then the top of the ladder is a terminus rather than a position.

**Planned 2026-08-04 in `region-difficulty.md`**, with every generation
lever measured. Two of them behave the opposite of how this document's
`duty` copy assumes — more signatures make a region *easier*, and stripping
the briefing's quadrant clues moves *solvability* by three points while
being the largest lever there is on how much searching a player does. That
second axis is not visible to `assessSolvability` at all. The proposal
reaches 3.1× on the band that costs a ring scan and 6× on the signatures
plain elimination cannot reach. Note the
currency mismatch: the gradient simulated above is an abstract accuracy
penalty, so `tune-rank-thresholds.ts` has to be taught to consume a
per-rank scan rate before it can say whether that swing is steep enough.

### Consequences for rank (written against the old ~19% floor)

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

### The survey cap — the other half of "closing costs something"

Shipped 2026-08-03. `ACTIVE_SURVEY_LIMIT = 3` in `survey-log.ts`, with
`activeSurveys(log)` defining what occupies a slot: **unarchived and not
closed**.

The filing budget makes a *wrong* answer cost something, but until this
landed, never answering cost nothing at all. You could hold a dozen
half-finished regions, and any one you were unsure about could simply sit
open forever — the review window only ever sees regions you chose to close,
so avoidance was a dominant strategy that the rank ladder couldn't see.
Capping the open set means reaching for a fourth region requires resolving
a third: file it, or withdraw it and take the neutral outcome deliberately.
That gives withdrawal a second job — it was the honest escape, and it is
now also the cheap one.

Three rather than one, because cross-referencing a stuck region against a
fresh one is legitimate play, and because generated regions survive a
reload (`5ebfa7d`) — the Briefing picker lists every unarchived survey, so
the cap keeps that row readable by construction rather than by good
housekeeping.

Two decisions worth keeping:

- **Archiving frees a slot.** It's the low-stakes way back under the cap,
  and it keeps the history rather than deleting it. The alternative —
  making only *closure* free a slot — turns the cap into a demand that you
  file on regions you'd rather abandon, which is exactly the coerced guess
  the filing budget exists to discourage.
- **Nothing is auto-archived.** Every existing save is over the cap on the
  first load after this ships. Those players keep everything and are only
  blocked from opening *more*, with the count and the reason shown on the
  Log. Silently tidying someone's board to enforce a rule introduced after
  they built it is not a fix.

  *Amended 2026-08-03, later the same day:* closing a region now archives
  it — see the next section. The rule that survived is the one that
  mattered: nothing is archived **retroactively**. It happens on the
  transition out of the open state and nowhere else, so a region that
  closed before this shipped keeps whatever archive state its player chose.

### The survey result report, and auto-archive on close

Shipped 2026-08-03. `closeEntry` in `survey-log.ts` sets `archived: true`
alongside the outcome; `SurveyReportPanel` is where you land.

The complaint was that a finished region sat in the Briefing picker until
you tidied it away by hand, so nothing in the app ever said *that one is
done*. Note what this is **not**: closed regions already didn't hold a slot
(`activeSurveys` excludes them), so this changes nothing about the cap. It
is about the picker, and about finishing feeling finished.

**The catch was structural, not cosmetic**, and it is the reason the two
halves are one change. `archived` is the same flag `noActiveAssignment`
keys off, and that flag forces every panel to the placeholder — so
auto-archiving on its own meant the moment you filed your last
classification the whole app cut to the station logo, and your board, the
outcome, the catalog reveal and any rank change all vanished in the frame
that produced them. Verified in the browser before building: setting
`archived` by hand on a closed region dropped the app to `NO ACTIVE
ASSIGNMENT` with the sidebar reading *"the field is shown for reference
only"*. The report is a prerequisite for the archive, not a nicety
alongside it.

Four decisions worth keeping:

- **A panel, not a modal.** The report is a view of a *closed log entry*,
  re-opened by a `Result` button on the Log. That gets "review and then
  return" for free and means a player who clicks past it too fast has lost
  nothing. It also gives the Log somewhere better to point than a read-only
  board.
- **Everything it shows lives on the entry.** The rank change in particular
  is now persisted as `SurveyLogEntry.rankEvent`, where it used to exist
  only in Star Map local state — state that closing now unmounts. A report
  opened a week later still shows the promotion it caused.
- **Return goes to the Log**, never to the blank page. That page is the
  thing this exists to stop you landing on.
- **Confirmed regions reveal the catalog too.** The Star Map's `revealed`
  rule excludes `confirmed`, on the reasoning that a correct board is
  already the catalog. True of *sectors* — but types are secret until close
  and are the actual payoff for finishing, so the report doesn't inherit
  that exclusion. `ResultField` decides per signature rather than per
  outcome (teal ring on a match, dashed catalog ring plus tether on a miss,
  dashed ring alone on one never placed), which also handles a withdrawal
  made with half the palette still unplaced — something the board's rule
  could not draw.

The dial itself was the other half of the point. The catalog reveal — the
dashed rings tethered to where you actually filed — is the best thing in
the endgame and it was being drawn into a 260px sidebar. `field.tsx` now
holds the geometry and the two inert chrome layers, shared by the Star Map
and the report, and the report drops the sidebar while it is open to spend
those 380px on the field: measured at **392px against the sidebar's 260**,
with ring and segment labels going from 10.6px to 16.0px.

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

> **Reversed 2026-08-04.** Relief ends the career outright, and
> `requestReinstatement` goes with it. The reason is that recoverable relief
> made the loss state weightless: nothing gated surveying on rank, no review
> ran while relieved, and the window reset on the way back — so play in that
> state had no consequence in either direction, and the "loss" was a button
> press away from being undone. Retirement is the replacement for the
> graceful exit reinstatement was standing in for. See `rank-ladder.md`.

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
