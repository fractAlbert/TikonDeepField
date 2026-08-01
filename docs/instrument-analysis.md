# Which instrument should the station have?

Plain-English write-up of the measurements behind three open questions:

1. The Quadrant Survey counts signatures per **quarter of the field**. Would
   counting them per **ring**, per **segment**, or per **sector** be better?
2. Should the player get a **ring scan**, or a small number of expensive
   **high-energy pinpoint scans** they aim themselves?
3. Do those two overlap enough that one makes the other pointless?

Every number here comes from one run of `scripts/compare-instruments.ts` over
**2500 generated regions**, so the figures are directly comparable to each
other. Re-run it with `npx tsx scripts/compare-instruments.ts 2500`. Expect
±1.5 points of wobble between runs.

Throughout, the number being measured is **the share of regions that cannot
be solved at all** — where two different answers produce identical readings
on every instrument, so no amount of skill gets you there. Lower is better.

---

## First: why are any regions unsolvable?

This is the whole story, and everything below follows from it.

Distance in this field is **rings crossed plus segments hopped**. So take
any signature and move it *one ring outward and one segment over*. It
crossed one more ring and hopped one fewer segment — or the other way
round — and the two changes **cancel exactly**.

```
        the signature is really here ──┐
                                       ▼
              ring 3   · · · · · · · · ●  · · ·
              ring 2   · · · · · · ●  · · · · ·
                                   ▲
        ...but here reads identically
```

Every distance reading to every other signature comes out the same. The
Sweep Scope cannot tell these apart. Neither can anything else that only
measures distance.

Measured over 1200 regions (`scripts/explain-ambiguity.ts`), **72% of all
ambiguities are exactly this move**, and 42% of the time it displaces just
one signature while the rest of the region is pinned perfectly. It is not
clustering, and it is not mirror symmetry — mirror symmetry accounts for
**0%**.

**So: anything that tells you how far out a signature sits kills half of
this move, and the ambiguity dies with it.** That single fact explains every
result below.

---

## Question 1 — how finely should the census slice the field?

The Quadrant Survey asks "how many signatures are in this part of the
field?". A quadrant is a quarter — two segments, all five rings. But the
same question can be asked at other resolutions, and along a different axis.

*Sweep Scope always on. Lower is better.*

| census | unsolvable | |
| --- | ---: | --- |
| No census at all | 25.9% | `█████████████` |
| **Quadrants — 4 buckets (today)** | **18.6%** | `█████████` |
| Segments — 8 buckets | 6.0% | `███` |
| **Rings — 5 buckets** | **5.8%** | `███` |
| Quadrants + rings | 3.9% | `██` |
| Segments + rings | 2.7% | `█` |
| Single sectors — 40 buckets | 2.3% | `█` |

### What this says

**Switching the census from quadrants to rings takes unsolvable regions
from 18.6% to 5.8%.** That is the largest single improvement available
anywhere in this document, and it needs no new instrument — it is a change
to a panel that already exists.

The reason is the diagonal above. A quadrant spans **all five rings**, so
knowing a quadrant's headcount tells you almost nothing about how far out
anything sits — and "how far out" is precisely the half of the ambiguity
that matters. A ring census attacks it head on.

Two things worth noticing:

- **The axis matters more than the resolution.** Rings are only 5 buckets
  and segments are 8, yet they score the same (5.8% vs 6.0%). Meanwhile
  quadrants — also an angular slice, just coarser than segments — score
  three times worse at 18.6%. Slicing the *radial* axis at all is what
  helps.
- **Two axes beat one.** Rings + segments (2.7%) beats either alone,
  because they constrain different dimensions. Going all the way to
  single-sector resolution (2.3%) barely improves on that, and would hand
  over an occupancy map of the whole field.

---

## Question 2 — the lifeline: ring scan or high-energy pinpoint?

Two candidate ways to rescue a player who is stuck.

- **Ring scan** — aim it at one signature, learn which ring it is in.
- **High-energy pinpoint** — aim it at one signature, learn its exact
  sector. Expensive, so two or three per region at most.

Both are measured twice: **aimed well** (the player picks the target that
actually resolves the region) and **aimed blind** (they pick without
thinking about it). That gap is the skill in the mechanic.

*Sweep Scope + today's quadrant census always on.*

| lifeline | aimed well | aimed blind | |
| --- | ---: | ---: | --- |
| None (today) | 18.6% | 18.6% | `█████████` |
| Ring scan ×1 | **1.6%** | 11.7% | `█` |
| Ring scan ×2 | 0.2% | 7.5% | |
| Ring scan ×3 | 0.1% | 4.1% | |
| Pinpoint ×1 | **1.5%** | 11.7% | `█` |
| Pinpoint ×2 | 0.1% | 7.5% | |
| Pinpoint ×3 | 0.0% | 4.1% | |
| Ring census by type (names nobody) | 3.9% | 3.9% | `██` |

### The finding that matters

**A ring scan and a pinpoint scan are equally powerful. One scan, aimed
well: 1.6% versus 1.5%.** They are the same number.

That is not a coincidence, and it follows directly from the diagonal. When
you are stuck on a signature, **the ring is the only part you were missing**
— you could already work out the segment from the distance readings. The
pinpoint hands you the segment as well, and the segment was never the
problem. You are paying for information you did not need.

So the answer to "does the pinpoint scan preclude the ring scan?" is: **no,
it is the other way round.** They rescue the same regions, but:

- a ring scan gives away **one of five rings** for that signature
- a pinpoint gives away **the entire answer** for that signature

Same benefit, roughly five times the cost.

### The skill gap is real

Aimed well, one scan takes you from 18.6% to 1.6%. Aimed blind, the same
scan only reaches 11.7%. **Using it carefully is worth about 7×** — which
is exactly the mechanic you were after. Choosing the target *is* the puzzle
step, and a player who understands why they are stuck will pick the right
signature.

---

## Question 3 — stacking a ring census with a lifeline

| configuration | unsolvable |
| --- | ---: |
| Today | 18.6% |
| Ring census added | 3.9% |
| Ring census + 1 pinpoint, aimed well | 0.0% |
| Ring census + 2 pinpoints, aimed well | 0.0% |

A ring census plus a single well-aimed pinpoint scan resolves **every region
in the sample**. A second pinpoint adds nothing measurable.

---

## Question 4 — do they overlap?

| | share of regions |
| --- | ---: |
| Solvable with ring census alone | 96.1% |
| Solvable with 2 well-aimed pinpoints alone | 99.9% |
| Solvable with either | 96.0% |
| **Beyond help from both** | **0.0%** |

The overlap is almost total — the pinpoint's coverage essentially contains
the ring census's. They are not complementary tools solving different
problems; they are two prices for the same solution.

---

## Question 5 — what a pinpoint actually costs

A pinpoint hands over one of the answers outright. With regions running 6–8
signatures, that is a large fraction of the puzzle:

| region size | one pinpoint gives away | two give away |
| --- | ---: | ---: |
| 6 signatures (33% of regions) | 17% | 33% |
| 7 signatures (32% of regions) | 14% | 29% |
| 8 signatures (35% of regions) | 13% | 25% |

Two pinpoints is a quarter to a third of the region simply handed to you.
That is the real argument against making them the primary lifeline — not
that they are too powerful, but that they are **overpriced for what they
fix**.

---

## Recommendation

**1. Change the census from quadrants to rings — or report both.**

This is the big one, it is nearly free, and it gives away nothing: the
census names no individual signature, exactly as the Quadrant Survey
doesn't today.

- Rings instead of quadrants: 18.6% → **5.8%**
- Rings *and* quadrants: 18.6% → **3.9%**

Reporting both costs nothing and is strictly better, so report both. The
ring scope animation already prototyped (Prototypes panel) is a good way to
present it — a range gate walking outward, rings lighting as it crosses
them.

**2. Keep the high-energy pinpoint, but as a rare last resort, not the main
tool.**

With a ring census in place the remaining ~4% is small, and one well-aimed
pinpoint closes it completely. Its cost — a whole answer given away — is now
a genuine decision rather than a routine move, which is what makes it
interesting. One per region looks right; two is measurably pointless.

**3. If you want a lifeline aimed at a named signature, use a ring scan
rather than a pinpoint.**

Identical rescue rate, a fifth of the giveaway. The only reason to prefer
the pinpoint is fiction — "high-energy scan, expensive, limited" is a better
story than "ring scan, also limited" — and that is a legitimate reason, just
not a mechanical one.

### What this does to difficulty

Worth being explicit: this makes regions **more solvable, not easier**. The
work involved barely changes. Measured separately
(`scripts/measure-deduction-depth.ts`), an anonymous ring census leaves the
number of candidate eliminations per region **unchanged at 133**, and 22% of
regions still need three rounds of chained reasoning. It removes dead ends
without removing deduction.

A per-signature ring scan used without limit is the one option that *does*
flatten the puzzle — it drops the work from 133 eliminations to 23, with 90%
of signatures falling straight out of the two anchors. That is the version
to avoid.

---

## Caveats

- **Every figure assumes a player who reads the whole distance matrix**, by
  cycling the Sweep Scope through every reference and remembering the
  results. Real players will lose regions that are technically solvable, so
  these are floors on the loss rate, not predictions of it.
- **"Aimed well" is a best case.** It asks whether *some* choice of target
  resolves the region, not whether a human would find it. The truth for a
  thoughtful player sits between the two columns.
- **The by-type ring census is modelled as anonymous per-ring totals**, and
  that reduction is exact today: nothing in the game links a signature's
  name to its type, so types can be permuted freely between names and only
  the per-ring count survives. If `quasar-type` clues are ever emitted, this
  becomes sharper and needs re-measuring.
- **Sample noise is about ±1.5 points** at 2500 regions. Differences of a
  point or two are not real; the 13-point gap between quadrants and rings
  very much is.

## Related

- `win-conditions.md` — rank, filing, and why the loss rate matters
- `puzzle-mechanics.md` — how the field and the instruments actually work
- `backlog.md` — the open design questions this feeds
