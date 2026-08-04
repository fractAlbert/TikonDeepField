# The rank ladder

**This file is the spec. `src/lib/ranks.ts` is the implementation.** Edit
here, then the change gets applied there — the tables below are laid out so
every value has exactly one home in code, listed in *Where each field lands*
at the bottom.

Rationale lives in `win-conditions.md` ("Rank", and "The thresholds are a
weak lever"). It is deliberately not repeated here: this file is meant to be
edited, and a spec you have to argue with before changing is a spec nobody
changes. Where a number has a reason worth defending, this file says *that a
reason exists* and points at it.

---

## The rungs

`#` is the ladder position and the array index. Relieved is index −1 and is
not a rung at all — it is the **end of the career**, and has no entry of its
own in code, only fallbacks. See *Career end* below.

| # | Title | Short | Rung | Colour | Hex |
| --- | --- | --- | --- | --- | --- |
| −1 | Relieved of Survey Duty | — | — | (red) | `#cc6666` |
| 0 | Survey Technician | SVT | Technician | ice | `#cce6ff` |
| 1 | Assistant Science Officer | ASO | Assistant | lilac | `#cc99cc` |
| 2 | Science Officer | SCO | Officer | amber | `#ffcc66` |
| 3 | Senior Science Officer | SSO | Senior | orange | `#ff9900` |
| 4 | Chief of Survey | CHS | Chief | teal | `#66ccbb` |

- **Short** is the three-letter form, for places too tight for the title.
- **Rung** is the one-word form for the ladder strip. It exists because the
  three-letter codes are opaque and the first word of the title doesn't
  distinguish anything — "Science" names three different rungs.
- **Colour** must be a `ButtonColor` from `lcars-colors.ts`. Red is reserved
  for alert states, which is why only Relieved uses it.

**Starting rank: 2** (Science Officer). Mid-ladder on purpose, so there is
somewhere to fall to that isn't the end of the game.

---

## What actually differs per rank

These two columns are the whole mechanical difference between one rank and
the next. Everything else is copy.

| # | Rank | Filings per region | Filing marks |
| --- | --- | --- | --- |
| 0 | Survey Technician | 4 | yes |
| 1 | Assistant Science Officer | 4 | yes |
| 2 | Science Officer | 3 | yes |
| 3 | Senior Science Officer | 2 | yes |
| 4 | Chief of Survey | 2 | **no** |

**Filings** — attempts at a full classification before the entry is
retracted. Descending on purpose. Two constraints on editing it:

- The two lowest rungs are the ranks you *fall* to, so they are the most
  generous — demotion is meant to be a recovery path rather than a spiral.
- **Do not set the top to 1.** A single filing removes the cross-check
  entirely (you would learn the discrepancy count only by being retracted by
  it), which deletes a mechanic rather than tightening one. Two is one probe
  and one correction.

`scripts/tune-rank-thresholds.ts` simulates careers against whatever these
are set to. Re-run it after changing them.

**Relieved has no row here.** It used to, at 4 filings and marks-on, which
was never a decision — `RANKS[-1]` is `undefined`, so both values fell out
of the fallbacks in `filingsForRank` and `showsFilingMarks`. A relieved
officer never files again, so the question no longer arises. The fallbacks
stay as defensive defaults; they are not a spec.

**Filing marks** — whether a filing circles the signatures it got right, or
only reports how many were wrong. Bounded three ways already: filings are
budgeted, the marks come from a frozen snapshot so they cannot be walked
(see `StarMap.tsx`), and the top rank does not get them.

Relieved has no entry of its own — it falls back to index 0's filings and to
marks-on.

---

## Identical at every rank

Listed so it is obvious what is *not* currently a rank lever, in case one of
them should be.

| Thing | Value | Where |
| --- | --- | --- |
| Ring scans per region | 2 | `RING_SCAN_LIMIT`, survey-log.ts |
| Open surveys at once | 3 | `ACTIVE_SURVEY_LIMIT`, survey-log.ts |
| Review window | 8 closed regions | `REVIEW_WINDOW` |
| Promotion / demotion thresholds | see below | ranks.ts |
| Region difficulty | — | **not implemented**, see below |

---

## Review

Rank moves on patterns, not single surveys. The station reviews your record
every **8 closed regions**; the window resets on any rank change.

| Verdict | Condition | Constant |
| --- | --- | --- |
| Demote | ≥ **3** retracted | `DEMOTION_RETRACTED` |
| — | *a demotion at rank 0 ends the career — see* **Career end** | — |
| Promote | ≥ **6** confirmed **and** ≤ **1** retracted | `PROMOTION_CONFIRMED`, `PROMOTION_MAX_RETRACTED` |
| Hold | anything else | — |
| Pending | fewer than 8 closed | — |

**Demotion is tested first**, so a window bad enough to satisfy both cannot
promote.

**Withdrawn is neutral**, and has to stay that way: roughly 1% of regions
are provably unsolvable even with well-aimed scans, and a player cannot tell
those from ones they merely failed to crack. Neutral, not *good* — withdraw
from everything and you hold your rank forever without advancing.

Two numbers with defended reasons, both in `win-conditions.md`:

- **Promotion at 6** was raised from 5 when the Ring Scan shipped, to track
  ~77% of what is actually achievable as the solvable ceiling moved from
  ~81% to ~99%.
- **Demotion at 3** was left there deliberately. Raising it to 4 spares a
  player who never withdraws and files wrong classifications repeatedly —
  being relieved is the game teaching that lesson, so it should land.

---

## Career end

**Status: shipped 2026-08-04.** What it replaced is at the bottom of this
section.

A career ends in exactly two ways, and both are final. There is no way back
onto the ladder within a career — the game ends and you begin a new one.

| Ending | Trigger | Rank at close |
| --- | --- | --- |
| **Relieved of duty** | A failed review at rank 0 (Survey Technician) | −1 |
| **Retired** | The officer's own choice, at any rank | whatever they held |

Relief is the loss state and should stay reachable but rare. Retirement is
the way out that isn't losing: it exists *because* relief is now terminal —
without it the only way to end a career is to fail one, which makes the
ladder a thing you can only fall off.

### What ending a career does

- **Surveying stops.** No opening regions, no filing, no withdrawing. The
  app routes to a career-end screen the way it routes to the welcome
  screen — outside the normal panel gate, because there is no active
  assignment and never will be again.
- **Open surveys end with it.** They are not closed as withdrawn: the
  review is over, so feeding it outcomes would be meaningless. They simply
  belong to a career that is finished.
- **The record is closed and kept.** Name, service number, dates, final
  rank, career totals, the full rank history, and how it ended.

### What survives a career, and what doesn't

This is the part with teeth. A career is no longer the same thing as "the
save", so the two have to be separated.

| Survives | Dies with the career |
| --- | --- |
| Tutorial completion | Officer name and service number |
| The roll of past careers | Rank, outcomes, review window, rank history |
| Sound preference | The survey log and the region roster |
| | Star Map boards, observations, quasar colours |

**Tutorial completion has to move.** It currently lives on `PlayerProfile`
as `tutorial`, which means a new career would arrive with it undefined and
the walk-through would fire again — the one thing that must not happen. It
belongs on a record that outlives careers, alongside the roll below.

**Past careers should be kept and shown.** Not strictly required by
anything, but it is what makes retiring a decision rather than a delete
button: retire at Chief of Survey and the roll says so, permanently. One row
per career — name, dates, rank reached, confirmed/retracted/withdrawn, and
whether it ended in retirement or relief.

### The new career

- New random name and service number, rerollable and renameable exactly as
  today.
- Starts at rank **2**, as any first career does.
- Empty roster, empty log, clean review window.
- **No tutorial.** It is already done, and its state now lives outside the
  career, so this falls out rather than needing a special case.

### Controls

- **Retire** goes on the Officer panel, next to the record it closes. It is
  irreversible, so it takes the same two-click confirmation as Withdraw
  rather than a dialog — press once to arm, once to commit.
- **Begin a new career** is the only control on the career-end screen. From
  the roll it can also be reached after the fact, in case someone closes the
  screen and comes back.

### The three decisions, as answered

1. **Retire at any moment, including mid-survey.** The confirmation carries
   the weight; "you may not retire while you have work open" is a rule with
   nothing behind it.
2. **A new career always rerolls the officer.** A career is a person, and
   keeping the name blurs the roll. Renaming is one click away regardless.
3. **The roll is visible**, as a Service Record on the Officer panel and on
   the career-end screen. Without it, retirement's payoff is invisible.

### Two things the build settled that the spec didn't

- **Starting a new career reloads the page.** Half a dozen modules cache
  snapshots of the storage it wipes, and `AppShell` restores the region
  roster into React state once on mount — resetting each by hand is five
  chances to miss one and hand the new officer a stale board. A career
  change is deliberate and rare enough to afford it.
- **What a career owns is matched by storage *prefix*, not by a list.** Two
  of the keys are per-region (`starmap:<id>`, `observations:<id>`), so an
  exact list would be one more place to forget a new one — and the failure
  mode is a stranger's notes on your first board.

### What this replaces

Today, relief is not an ending at all. Nothing gates surveying on rank, so a
relieved officer keeps playing; `recordOutcome` bails out early for them, so
no review ever runs; and `requestReinstatement()` puts them back at rank 0
on a button press with a clean window. The net effect is that play while
relieved has no consequence in either direction — confirmations don't help,
retractions don't hurt, and everything done in that state is excluded from
the next review by the `windowStart` reset on reinstatement.

`requestReinstatement` goes away with this change. Its whole purpose was to
make relief recoverable, which is exactly what is being removed.

---

## Per-rank copy

Two strings each. Edit freely — nothing keys off them.

**`blurb`** — what the station thinks of you at this rank.

| # | Blurb |
| --- | --- |
| 0 | Instrument operator. You run the passes and hand the readings to someone else to sign off on. |
| 1 | Trusted to classify, not yet trusted to be the only one who did. Your filings are reviewed on the way out. |
| 2 | The post the station is actually built around. Your signature is the last one a catalog entry gets before it goes out to every ship in the region. |
| 3 | You get the regions that came back ambiguous the first time. Nobody double-checks you any more. |
| 4 | You set what the station works on. The catalog's accuracy is your name on it, region by region. |

**`duty`** — what changes about the work.

| # | Duty |
| --- | --- |
| 0 | Draws the station's smallest, most heavily briefed regions — the ones nobody is worried about getting wrong. |
| 1 | Regions still run small, with the full briefing allocation. |
| 2 | Standard survey load. The rank you were commissioned at. |
| 3 | Draws larger, thinner-briefed regions — more signatures to place, less handed to you. |
| 4 | Draws the fields nobody else has resolved. Full instrument allocation, minimum briefing. |

> **These `duty` lines are currently a promise, not a description.**
> `generateRegion()` contains no reference to rank or player, so a Chief of
> Survey draws exactly the same fields as a technician. That is backlog item
> 1, and it is the thing the ladder is actually missing: attempts are
> unlimited and the window resets on promotion, so every player who can
> clear the bar eventually does. Simulation says thresholds are a weak lever
> and difficulty is the strong one. Until it is built, the top of the ladder
> is a terminus rather than a position.
>
> If you edit these lines, either keep them vague enough to stay true, or
> treat the edit as a spec for item 1.

---

## Where each field lands

| This file | Code |
| --- | --- |
| Rungs table | `RANKS[]` in `src/lib/ranks.ts` — one object per row |
| Starting rank | `STARTING_RANK` |
| Relieved | `RELIEVED = -1`; title/hex come from the fallbacks in `rankTitle` / `rankHex` |
| Career end | `endCareer` / `retireCareer` / `beginNewCareer` in `player.ts`; `PlayerProfile.ended` is the game-over condition |
| Tutorial completion, the roll | `station.ts` — outlives careers, which is the whole reason it exists |
| Career-end screen | `CareerEndPanel.tsx`, gated in `AppShell` on `player.ended` |
| Retire control, Service Record | `ProfilePanel.tsx`, `ServiceRecord.tsx` |
| Filings column | `Rank.filings`, read through `filingsForRank` → `currentFilingLimit()` |
| Filing marks column | `Rank.filingMarks`, read through `showsFilingMarks` |
| Review window | `REVIEW_WINDOW` |
| Promote / demote thresholds | `PROMOTION_CONFIRMED`, `PROMOTION_MAX_RETRACTED`, `DEMOTION_RETRACTED` |
| Blurb / duty | `Rank.blurb`, `Rank.duty` |

**Adding or removing a rung** is the one edit that is not local. `TOP_RANK`
derives from the array length, and `STARTING_RANK` is an index — so changing
the number of rungs moves where a new officer starts unless it is updated
too. `RankInsignia.tsx` draws the survey field's five rings with rank
lighting them from the centre out, so a ladder that is no longer five rungs
needs that mapping revisited.

**After any change here**, run `npx tsx scripts/tune-rank-thresholds.ts` —
it simulates careers against the shipped logic and reports where players
land on the ladder.
