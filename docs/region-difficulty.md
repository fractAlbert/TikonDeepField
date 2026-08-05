# Making the work harder as rank rises

**Backlog item 1.** `generateRegion()` draws the same field for a Chief of
Survey as for a technician. Every rung's `duty` line promises otherwise —
*"draws larger, thinner-briefed regions"*, *"the fields nobody else has
resolved"* — and nothing implements it.

Status: **planned, not built.** Every number below is measured by
`scripts/measure-difficulty-levers.ts`; re-run it after changing generation.

```
npx tsx scripts/measure-difficulty-levers.ts 2000
```

---

## Why this is the item that matters

`scripts/tune-rank-thresholds.ts` simulates careers against the shipped
review logic. Its finding, over 4000 careers per cell:

> **A careful player reaches Chief of Survey under every threshold tested**,
> including 7-of-8. Moving the promotion bar barely moves anyone except the
> average player.

That is structural rather than a badly chosen number. Attempts are
unlimited and the review window resets on promotion, so any player whose
confirm rate gives a non-zero chance of clearing the bar will eventually
string together a window that does. **No threshold fixes it.** The filing
budget (4 4 3 2 2) was the cheap half of the answer and did separate an
average player from a careful one; what it cannot do is make holding the
top rung *work*. Until the regions themselves change, the top of the ladder
is a terminus rather than a position.

## What "harder" has to mean here

Three bands, from `assessSolvability` — the app's own verdict, and the same
one the Log reads back after a region closes:

| Band | Meaning |
| --- | --- |
| **clean** | briefing plus bearings pin every signature |
| **needs a scan** | propagation stalls; a well-aimed Ring Scan closes it |
| **unsolvable** | two positions stay consistent with every reading |

**Difficulty should grow the middle band and leave the third alone.** The
needs-a-scan band is where the player's judgement decides the region —
working out *which* signature you are stuck on is itself the deduction, and
the Ring Scan is metered so that judgement costs something. The unsolvable
band is not difficulty at all; it is a tax, and it is the reason withdrawal
has to stay rank-neutral. Any change that raises it is a change that
punishes people for the generator's output.

---

## The levers, measured

Four things generation can turn. Two of them do not behave the way the
`duty` copy assumes.

### 1. Signature count — **runs backwards**

| | clean | needs a scan | unsolvable |
| --- | ---: | ---: | ---: |
| 6 signatures | 69.2% | **30.8%** | 0.0% |
| 7 signatures | 83.0% | 16.8% | 0.2% |
| 8 signatures | 86.0% | **14.0%** | 0.0% |

**More signatures make a region easier, not harder.** Every signature is
another unknown, but it is also another row and column of the pairwise
distance matrix the Sweep Scope hands you, and the readings win
comfortably. A 6-signature field is more than twice as likely to stall as
an 8-signature one.

So *"more signatures to place"* on the Senior Science Officer rung is
exactly backwards, and this is the single most important thing to know
before touching generation. It also explains why the tutorial region is
six: `Ember Verge` needed to hit a wall on purpose, and six is the size
that stalls.

### 2. Quadrant clues — **nearly worthless**

| | clean | needs a scan | unsolvable |
| --- | ---: | ---: | ---: |
| 0 quadrant clues | 76.7% | 22.7% | 0.7% |
| 2 quadrant clues *(today)* | 79.9% | 20.0% | 0.1% |
| 4 quadrant clues | 80.6% | 19.3% | 0.1% |

Removing the briefing's entire soft half moves the needs-a-scan rate by
**3.4 points**. "Fewer briefing clues" sounds like the obvious difficulty
knob and is almost nothing — a quadrant names one of four 10-cell blocks,
which the distance matrix mostly implies anyway.

Worth keeping in the mix for *feel* rather than difficulty: a briefing with
two exact positions and nothing else reads austere in a way the numbers
don't capture.

### 3. Exact anchors — **strong, but coarse**

| | clean | needs a scan | unsolvable |
| --- | ---: | ---: | ---: |
| 1 anchor | 58.6% | **41.1%** | 0.3% |
| 2 anchors *(today)* | 79.3% | 20.6% | 0.1% |
| 3 anchors | 88.4% | 11.6% | 0.0% |

The strongest single lever — and unusable at its low end. One anchor is not
a triangulation baseline at all: every distance is measured from a single
point, so it is a *different* puzzle rather than a harder one, and the
Sweep Scope's whole premise ("two distances from two known points pin a
third") stops applying. Two is the floor.

That leaves 2 or 3, which is one bit of difficulty, not a gradient.

### 4. Anchor separation — **the fine knob, and non-monotonic**

How far apart the two anchors are. Generation constrains this to 2–5 today.

| | clean | needs a scan | unsolvable |
| --- | ---: | ---: | ---: |
| 1 apart *(excluded today)* | 70.9% | 28.3% | 0.9% |
| 2 apart | 76.4% | 23.1% | 0.5% |
| 3 apart | 79.7% | 20.0% | 0.3% |
| 4 apart | 82.4% | 17.3% | 0.3% |
| 5 apart | 84.2% | **15.4%** | 0.3% |
| 6 apart *(excluded)* | 81.9% | 17.3% | 0.9% |
| 7 apart *(excluded)* | 77.3% | 21.8% | 1.0% |

Difficulty falls to a minimum at 5 and then **rises again** — because past
5 the two anchors are out of each other's Sweep Scope range, so the
baseline degrades exactly when it looks widest. The current cap of 5 is
sitting precisely on the easiest setting, which is a happy accident worth
knowing about.

Within the usable 2–5 band this gives a smooth ~8-point range, which is the
gradient the anchor *count* couldn't provide.

---

## The proposal

Three levers per rung — signature count, anchor separation band, quadrant
clue count — composed. Measured over 2,000 generated regions reshaped to
each profile:

| Rank | Signatures | Anchors apart | Quadrant clues | clean | **needs a scan** | unsolvable |
| --- | --- | --- | --- | ---: | ---: | ---: |
| 0 Survey Technician | 8 | 4–5 | 2 | 90.2% | **9.7%** | 0.1% |
| 1 Assistant Science Officer | 7–8 | 3–5 | 2 | 85.6% | **14.4%** | 0.1% |
| 2 Science Officer *(today)* | 6–8 | 2–5 | 2 | 82.0% | **17.8%** | 0.2% |
| 3 Senior Science Officer | 6–7 | 2–4 | 1 | 77.0% | **22.7%** | 0.2% |
| 4 Chief of Survey | 6 | 2–3 | 0 | 67.0% | **31.8%** | 1.1% |

**A 3.3× swing in the band that costs a scan**, monotonic across the
ladder, with the unsolvable rate held at or below ~1% throughout.

Three properties worth stating explicitly:

- **Rank 2 is today's generator.** The starting rung is unchanged, so an
  existing save notices nothing until it moves, and every number already
  measured elsewhere still describes the middle of the ladder.
- **It cuts both ways.** Ranks 0 and 1 draw *easier* fields than the game
  ships today, which is what makes demotion a recovery path rather than a
  spiral — the same reasoning that gave the two lowest rungs four filings.
- **The Chief's 1.1% unsolvable** is the one number that moved the wrong
  way, up from 0.2%. It is still at the documented ~1% floor for careful
  play, but it is the first thing to watch: if tightening the anchors
  further pushes it past ~2%, back the separation band off rather than
  accepting it.

### Combined with the filing ladder

The two compose, and that is the point. A Chief of Survey draws a field
that stalls three times as often *and* gets two filings to resolve it
against a technician's four. Neither alone creates an equilibrium; together
they should.

---

## What this must not break

- **Withdrawal stays rank-neutral.** Non-negotiable while any region can be
  unsolvable, and this plan deliberately does not raise that rate.
- **The unsolvable band stays ~1%.** It is a tax, not difficulty. Watch it
  at rank 4 in particular.
- **Two anchors is the floor**, at every rank. One is a different game.
- **`Ember Verge` must be unreachable from this.** The tutorial region is
  fixed and baked, and the walk-through's copy is written against its exact
  solution — *"CTA 118 is R1S7 or R2S8, and the two are indistinguishable"*.
  Whatever reads rank inside `generateRegion()` must not be able to touch
  it. It isn't generated, so this is a matter of keeping it that way.
- **`assessSolvability` still runs per region**, and its verdict still goes
  on the log entry. The Log's after-the-fact explanation is what separates
  "you missed this" from "nobody could have got this", and a difficulty
  gradient makes that distinction *more* load-bearing, not less.
- **Solvability is not gated.** Generation does not retry until it finds a
  solvable region; losing is allowed. That stays true.

## Levers deliberately not used

- **Ring scan budget** (`RING_SCAN_LIMIT`, flat 2). Scaling this by rank is
  probably the strongest remaining knob — it directly controls how much of
  the needs-a-scan band a player can close — but it lives in `survey-log.ts`,
  not generation, so it is a separate change with its own argument. Worth
  doing *after* this, and measuring together.
- **Sweep visibility range** (`VISIBILITY_RANGE`, 5). Almost certainly the
  most powerful lever in the game: it decides how much of the distance
  matrix exists at all. Not attempted here because it is an instrument
  constant that the scope's axis is drawn against, and because
  `solvability.ts` hard-codes it — measuring a rank-varying range means
  parameterising that module first.
- **Type clues.** Backlog item 2. Orthogonal to this and would *reduce*
  difficulty.
- **More signatures at high rank.** Measured backwards. See lever 1.

---

## Build order

1. **Parameterise generation.** `generateRegion({ difficulty })` taking
   signature range, anchor separation band and quadrant clue count. No
   caller passes it yet, so nothing changes; reviewable on its own, and
   `measure-difficulty-levers.ts` stops needing to reshape regions after
   the fact.
2. **A difficulty table keyed by rank**, next to the filing ladder in
   `ranks.ts`, and specified in `rank-ladder.md` alongside it — the two
   belong together, since they are the two things rank changes about the
   work.
3. **Wire it up** in `AppShell`'s generate handler, reading the current
   rank. One line, and the point at which `Ember Verge` must be verified
   untouched.
4. **Extend `tune-rank-thresholds.ts`** to consume a per-rank needs-a-scan
   rate instead of its current abstract `difficultyPerRank`, and re-run.
   This is the acceptance test: does a careful player still saturate at
   Chief of Survey, or does the top of the ladder finally hold?

Step 4 is the one that decides whether the numbers above are steep enough.
The existing simulation found a gradient of 0.06 per rank "barely dented
saturation", but its currency is an abstract accuracy penalty rather than a
scan-rate, so the two are not comparable as they stand.

## Open questions

1. **Is 3.3× enough?** Answerable only by step 4. If not, the next lever is
   the ring scan budget, not a steeper version of this.
2. **Should the player be told?** The `duty` line on each rung already says
   the work changes, but nothing says *how*. A Briefing that named its
   difficulty tier would make the gradient legible — at the cost of turning
   an atmospheric promise into a stat.
3. **Does a demotion feel like relief?** Dropping a rung now hands you a
   visibly gentler field. That is the intent, but it is worth watching that
   it does not read as the game going soft on you at the exact moment it
   has just told you off.
