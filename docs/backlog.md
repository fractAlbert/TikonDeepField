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

Shipped 2026-08-11 and removed: **no `quasar-type` clues are ever emitted
(2)**, the oldest item on the list and the one repeatedly put off for needing
the most thought. The user's call to take it first: *"if we deal with 2, that
opens up more options for difficulty management."* That ordering was right -
built the other way round, 26 would have been built twice.

The vocabulary already existed. `quasar-type`, `type-quadrant`, `type-ring`
and the rest were wired through evaluation, briefing text and the solver;
generation simply never emitted any, so types sat in the solution as
write-only data revealed at close.

Two constraints shaped the answer. **Types repeat** - at least 3 distinct
across 6-8 signatures - and a `type-*` clue names no signature, so it pins
one down only when exactly one holds that type. And **nothing else in the
live game references types**: the Quadrant Survey, the only instrument with a
per-type breakdown, was replaced by the Ring Scan on 2026-08-01. A bare "OJ
502 is classified Blazar" is therefore inert - true, and useless.

It ships as a **chain** - a naming clue plus a positional clue about that
classification. It went through two designs in one afternoon, and the second
is the one in the code:

> Sensor signature OJ 502 is classified Ancient Relic.
> Ancient Relic signatures are confined to Quadrants II and IV.

**The first version was wrong and the user said so.** It named a single
quadrant and was emitted only for a type held by one signature, which made it
informationally identical to the direct clue - proved region by region, zero
mismatches. That was the flaw, not the feature: *"the pair chain doesn't add
complexity. it just adds what feels like an extra step. Especially if it's
always there."* Identical information in two lines is ceremony.

Their fix: *"I'm okay if the chain gives out more than one star... now I know
there are at least 2 of them. It does help but it also misleads a bit which
is nice for a puzzle."* So the second clue became `type-quadrant-set`, naming
every quadrant a classification occupies. It is truthful for a type held by
any number of signatures, and it is **strictly weaker** than the direct clue
it replaces.

Three consequences, all measured:

- **A chain is only generated when the type spans two or more quadrants.**
  The single-quadrant case is the pointless one, so it is never generated
  rather than merely rare - which also makes frequency vary on its own, 46%
  to 85% of regions by profile.
- **The definite article is gone**, which retired the uniqueness promise
  along with the assertion guarding it. "Confined to" states exclusivity
  without claiming a count, and the number of quadrants listed is a floor on
  how many signatures share the type, never a total. That is the productive
  misleading.
- **The cost is in search effort, not solvability.** Solvable rates move
  0.0-0.6 points, because `ranks.ts` already records that quadrant clues
  barely touch solvability and dominate effort. Measured where it lands: a
  direct quadrant clue leaves 10 of 40 cells open, a chain leaves 22.3.

`check-chain-equivalence.ts` was deleted rather than updated - it proved an
equivalence that is now deliberately false, so keeping it would mean
asserting a bug. `measure-chain-cost.ts` and
`measure-baseline-vs-chains.ts` replaced it and measure instead, the latter
asserting monotonicity directly: no region may become solvable by carrying a
chain.

The pre-type baseline, recorded because nothing else had it: briefing and
Sweep Scope alone give **90.4% solvable at Technician down to 70.0% at
Chief**, tracking quadrant clue count exactly. With two ring scans every rung
is 99.2% or better.

Closed 2026-08-11 and removed: **the text bar (25)**, on the user's call, one
turn after it was filed. The section headers stay.

Nothing was built and nothing is owed. It stays *measured* in
`lcars-style-notes.md` under "The text bar", because the measurement is the
expensive part and the reference image is committed either way - if it ever
comes back it is a build, not a study.

Worth recording the reasoning, since the entry had framed it as an open
question: there were three ways to head something here at once - shelf,
section header, text bar - and three is more than a small app needs unless
each has a clear job. Two have one. The third was a preference without a
role, and the user closed it rather than let it accumulate.

Shipped 2026-08-11 and removed: **header bars like thelcars.com's (24)**,
once the user pointed at the page they meant - *"the news section has a
header titled News/Updates. It's style and then the header for each news
item underneath is what I'm talking about."*

Two components in `LcarsShell`, written up in `lcars-style-notes.md` under
"The log-list idiom", and applied to the Survey Log because it is this
project's News/Updates: a dated list of entries.

`LcarsSectionHeader` is large right-aligned uppercase display type over a
run of bars. It is the *second* way LCARS heads a section and it does not
replace the shelf - a shelf labels a box you read the inside of, this labels
a stretch of page, and being type rather than a solid block it gets quieter
as the list under it gets longer. `LcarsLogItem` is their entry: a `::before`
ellipse at their exact **1.89:1**, a 50px inset, an underlined uppercase
title and a quiet meta line.

Sized by ratio, not by number - their 87px title is on a 1377px column and
our panels are half that, so ours is a `clamp`. Two deliberate departures:
the ellipse carries the accent colour and marks selection **by growing**,
34px to 52px, which retired the old accent bar and keeps to the rule that
selection is never a stroke; and it is centred on the title's first line so
a wrapping title cannot drag it into the middle of the block.

Built from measurements - none of their CSS is used. The user offered
credit and it is now a Credits section on Station Info, naming Michael Okuda
and Paramount for LCARS itself, TheLCARS.com for the documentation, and
Antonio as the stand-in for Helvetica Ultra Compressed.

Done 2026-08-11 and removed: **reviewing thelcars.com (23)**, written up in
`lcars-style-notes.md` under "A live source". The first source here that is
not a still image, so the grammar came out of computed styles rather than
out of pixels.

It confirmed four rules on evidence we did not produce: black is **76.8%**
of all painted area; **all 7 pills on the page are horizontal and none of
the 4 vertical runs is capped**, including a 1710px leg at `border-radius:
0`; 15 of 16 labelled blocks are right-aligned; and every tall block puts
its label against an edge at 5:1 or worse. The vertical-cap rule is the one
this project got backwards three times, and it is now 11 for 11 on an
independent source. Its font stack is `Antonio, "Arial Narrow"` - what we
picked separately.

Three things it taught us. A swept corner pushes the label to the end the
curve has not eaten. The gap in a run is a **7.33px black `border-right`**
rather than spacing, so the grout is structurally part of the segment. And
its horizontal-to-vertical thickness ratio reaches **8.6:1** against our
1.74 - recorded as range rather than as a target, since item 19 closed the
same day on the user's decision that our frames stay put.

**The written pages turned out to matter more than the CSS**, and the first
pass missed them. `/fonts.php` carries Michael Okuda's own answer for what
LCARS was set in - Helvetica Ultra Compressed, plus Letraset Compacta - so
Antonio is a documented *substitute* for an unavailable face, and the
tiebreak between two candidate type treatments is whichever is more
compressed. `/colors.php` publishes five named palettes, which means there
is no single "LCARS palette": Classic is the one this project imitates.

Two of our own decisions turn out to be corroborated there. Our `red
#cc6666` is a named LCARS colour, `red-copper` in their Nemesis Blue theme.
And the **two-reds split settled here on 2026-08-06 is in their taxonomy
too** - Classic carries both `red #cf4f4f` and `mars #ff2200` - which is the
strongest evidence yet that the distinction is real rather than a
rationalised accident.

Licensing is written up in the notes. Short version: the template is free
but **not** public domain - non-commercial, attribution with a link,
derivatives bound by the same terms. **None of it binds us, because none of
it is used here**; a search of `src/` for any trace returns nothing, and
measurements of a style are not the Template. The one thing to avoid is
adopting their named palette as a set, which is why the tan below is left
alone.

One open thread rather than a change: their most-used colour is a muted tan
(`almond`, 10.3% of the page) and we have no equivalent - our nearest is a
much more saturated salmon. If the user wants one, it should be picked
against the reference images the way every other colour here was.

Fixed 2026-08-11 and removed: **the Star Map readout being dead on touch
(8)**, after the user asked why an item calling itself "accepted" was
sitting in a list of open work. It was a fair hit and the answer was that it
should not have been.

The fix is one line in `handleCellPointerDown`, above every guard in it:
`if (e.pointerType !== "mouse") setHovered(sectorIdPressed)`. A press fills
the readout on any device without a hover to enter, and it then stays put
until the next press.

**The reason given for not doing it was wrong, and that is the lesson.**
This entry claimed a tap that fills the readout would also place a
signature, so the readout could only ever describe the cell you just acted
on. Reading `handleCellClick` shows it returns at `if (!armed) return` - a
tap on an empty cell with nothing armed does nothing whatsoever. The safe
inspect gesture the entry said did not exist had been there the whole time.
The claim was reasoned from the shape of the code rather than read off it.

Verified in the browser rather than argued: the readout goes `--` -> `R1S8`
with its detail line on a touch `pointerdown`; a `mouseleave` from a
different cell does not clear it (the existing `h === id` guard already
handled that); a second tap moves it; a *mouse* `pointerdown` is ignored so
the cursor still tracks live; and nothing was placed - 0/6, 3 of 3 filings,
save byte-identical afterwards.

One honest caveat: the original "`mouseenter` never fires on touch" premise
was never tested on a real device, and mobile browsers do emit a synthetic
mouse sequence on tap, so the readout may have half-worked already. What the
change guarantees is that it works deterministically and stays put, which
was not true either way.

Closed 2026-08-11 and removed: **frames whose horizontal and vertical runs
are too alike (19)** - the user's call, on their eye, which is exactly what
the entry was being held for.

Nothing changed at the time. The tokens stayed where they were: the hub's
shelf 45px against 40px legs and a 14px crossing, the Star Map's 32px shelf
against a 40px leg. The ratio argument stood on paper and was overruled in
the only court that matters - both numbers had been set by eye recently, and
the entry itself said changing them on arithmetic alone would be overriding
a judgement.

**The Star Map half reopened and was fixed the same day**, on the user's
eye rather than on the arithmetic: *"My biggest issue is the elbow on the
border and the vertical bar."* Its leg is now 56px against a 32px arm, a
ratio of 1.75 where the shell manages 1.74, and its elbow radius came down
from 64px to 32px. The 64 was the worse of the two faults - 1.6 times the
leg's own width, where the shell is 0.60 and thelcars.com's image frame is
0.67, so the sweep swallowed the leg and the corner read as a hook. The 56px
leg had been tried and reverted once at a 376px sidebar; it fits now because
backlog 4 took the sidebar to 400, verified at zero overflow on both axes and
at 320 and 390.

**The hub half stands as closed** - nobody has complained about it, and the
reason for leaving it is unchanged.

The general lesson is not "the arithmetic was right after all". It is that
the ratio argument could not say *which* of two numbers was wrong, and the
eye could: the complaint was about the elbow first and the bar second, and
the elbow was the fault that arithmetic had scored as merely second-worst.

Worth keeping the general rule separate from this instance: *"horizontal and
vertical runs are never the same thickness, and pairs match"* is still in
the style notes and still applies to anything new. It just does not get to
retune two frames that have been looked at and liked.

Shipped 2026-08-11 and removed: **the sweep's trail restarting at each turn
(20)**, built to the user's own proposal - *"the easy solution is to have to
trails, one for each direction. When the sweep turns around, have the old
trail keep moving off the screen while the 2nd starts moving with the scope
line."*

That is exactly what it does. There are two trail elements, one per
direction, and because direction alternates with `cycle % 2` a slot is
always the same direction - which also let the two gradients move out of the
frame loop and into the stylesheet. The pass that has just finished keeps
its trail and carries on travelling the way it was already going, at the
sweep's own speed, fading to nothing across exactly one pass; the other
grows behind the line. The scope's `overflow: hidden` does the clipping.

Both halves of that are load-bearing and both are checked by
`scripts/check-sweep-trail.mjs`: same speed is what makes it read as one
wake still moving rather than a second sweep, and reaching zero exactly as
the pass ends is what lets the element be reused without a pop. The handoff
at the turn is seamless by construction - the same element, same position,
same width, same opacity as one frame earlier. The clock was not touched, so
item 14 still holds.

Closed 2026-08-10 and removed: **the phone flick-scroll list (7)**. Only one
of the five was a defect and it is fixed; the rest are content scrolling
inside their own panel, which the project rules explicitly allow and which
this item had recorded as accepted since 2026-08-05.

The defect was the Sweep Scope. It fitted 390x844 by exactly 4px - bought
deliberately by tightening the phone's band gaps - and the title shelf spent
13 of them on 2026-08-06, leaving it 9px over. Panel padding is now `p-3`
below `md` against `p-4` above, which is worth 8px on every panel, and the
Sweep Scope's intro paragraph gives up 4 more. It fits again exactly: 660
into 660.

Everything else improved with it - Log 61 to 26, Officer 264 to 240, Star
Manifest 139 to 131 - and the two big ones are not layout problems at all.
Prototypes is 4725px because the pattern kit lives there (item 21) and is
doing its job. Help at 865px is long prose, and shortening prose is an
editorial call rather than a layout one.

Shipped 2026-08-10 and removed: **the side-bar divergence (12)**, which the
user raised as *"Their vertical runs look different than ours. They look
better"*. Closed by measuring the last open point rather than arguing it: a
117px labelled cell in `lcars-ultra` puts its label 52px from the top and 27
from the bottom, so a run's labels are bottom-weighted, not centred. The
rail's are now, via a `valign` prop. The other loose end - gap sizes - turned
out to be already right: the reference runs 10px gaps on ~380px cells, 2.6%,
against our 4px on 160px, 2.5%.

Shipped 2026-08-10 and removed: **the header overflow at 320px (10)**. Not
fixed by shrinking anything - the sound control moved to the phone hub, into
the spare slot the second group of six was carrying. It was 82px of a header
that had 42 too few, so moving it settled the item outright: the header now
needs exactly the 296px it has, against 350 before.

Decided 2026-08-10 and removed: **whether to close the shell frame at the
bottom (15)** - it stays a bracket. Two edges is a legitimate LCARS shape,
the references use open-sided corner brackets deliberately, and the elbow
already reads as framed. The evidence came from trying it: the Star Map got
a wrap-around bottom bar the same day and it was taken straight back out.
Closure turned out not to be clarity.

Shipped 2026-08-10 and removed: **the Star Map's resting width (4)**. 400px,
up from 360, with `main` landing at 839. Settled by putting a temporary
slider on it rather than by picking a figure - this entry had proposed "50%
wider" (540px) since 2026-08-02, and the answer was about a tenth of that.
The number and the two limits around it live in `--lcars-map-sidebar-w`'s
comment in `globals.css`.

Shipped 2026-08-07 and removed: **the phone hub's S-swoop (18)** - across
the top, down the left to halfway, across to the right, then off the bottom,
with the crossing dividing the two groups of six. Written up in
`mobile-layout-plan.md`.

Shipped 2026-08-07 and removed: **the header rework (17)**, built against
the user's mock-up and measured off it rather than eyeballed. The header and
the left rail are now one orange elbow: a 96px outer sweep at the top left, a
92px bar running off the right edge with no cap, and a leg carrying on 58px
below the bar before the nav buttons open a gap in it. Written up in
`lcars-style-notes.md`. Item 10 was *not* folded in - the mock-up was
desktop, and the 320px overflow is untouched.

Shipped 2026-08-07 and removed: **the commit-message hook (16)**, widened to
cover the browser preflight as well. Both live in `.claude/hooks/` and are
wired from `.claude/settings.json`, so they travel with the repo rather than
depending on one machine's memory.

Shipped 2026-08-07 and removed: **both Sweep Scope items (13, 14)** - the
reference palette identified signatures by colour alone where every other
surface gives them their glyph, and the sweep's position was derived from
total elapsed time over the *current* period, so moving the speed slider
rescaled the whole history and teleported the line. The record is the commit;
the phase change is simulated numerically in it.

Shipped 2026-08-07 and removed: **re-organising the phone hub's buttons
(11)**, written up in `mobile-layout-plan.md`. It settled as two runs of six
with a sweep between them - by way of a three-column version that was tried,
looked crowded, and is recorded there as the step that found the constraint.

Shipped 2026-08-05 and removed: **rank-conditioned region difficulty (1)**,
written up in `region-difficulty.md`. That doc is now the record of what was
built, why each lever behaves the way it does, and the one measured
follow-up that was deliberately not applied.

**"Accepted" does not mean fixed.** It means the thing is still broken and
we chose to live with it - the decision is recorded, the defect is not gone.
Nothing in this table is done; done things are removed from it. The state
column says what kind of open each item is.

| # | item | where | state |
| --- | --- | --- | --- |
| 21 | The LCARS pattern kit - a standing check, maybe nothing to do | Design | standing reminder |
| 22 | Faint arrows showing that a panel can still be scrolled | Interaction | open, waiting on the user's steer |
| 26 | Let the player choose a difficulty | Gameplay | open, now has a neutral lever to use |
| 27 | Make types observable through an instrument | Gameplay | open, the user has two designs |
| 28 | Two more difficulty levers: type ring clue, anonymous anchor | Gameplay | open, anchor is the strong one |

## Design

### 21 - The LCARS pattern kit, as a standing item

Numbered 2026-08-10 at the user's request, with the note that there may be
nothing to do: *"it's been very helpful since you made that page.. I just
want a number to keep it on my mind."* So this is a place to look, not a
defect to clear.

`components/prototypes/LcarsKitPrototype.tsx`, in the Prototypes panel: every
shape, colour, type step and composite block rendered in the app's own
components and captioned with the rule it demonstrates.

**Two specimens are known wrong**, both since 2026-08-06 and both left alone
deliberately while this was an open conversation:

- The "Vertical run" specimen caps its column top and bottom. No reference
  contains that shape, and the app itself no longer does - the rule is now
  "a cap belongs to a short segment, a tall block is square".
- That same specimen calls itself "the desktop nav rail", which it is not.
  `NavRail` stacks *horizontal* buttons capped on one outer side.

**And the sheet has fallen behind the app more generally.** Since it was
written the project has gained: the elbow at two scales with concave inner
corners, the title shelf, `alert` as a second red, black panels against a
separate control colour, bottom-weighted labels in a run, the S-swoop, and
the rule that horizontal and vertical runs are never the same thickness.
None of that is on the sheet.

The standing question is whether the sheet should track the app or stay a
record of what was read off the references. It has been most useful as the
second thing - a place to check a rule against - which argues for adding the
new rules rather than mirroring every component.

## Gameplay

### 27 - Make types observable through an instrument

Raised 2026-08-11, after item 2 shipped type clues as a briefing chain. The
user's two ideas, verbatim:

> "My thought was adding things like some sort of type filter. You would go
> look at it and it might give you information about the types that the
> filter can sense."

> "A differnet thought I had was some sort of constellation view that shows
> you a number of stars without the star map grid. It would be rotated
> arbritrarily so you won't necessarily know what is what. It would only
> include a few stars.. not all and it would give you star type information.
> So you can say, I have to ancient relics near each other and farther away
> at thrice the distance is some other type of quasar."

And their own reservation, which is correct: *"My ideas sound much harder to
balance"*.

**The constellation is the stronger of the two**, and it is worth saying why
rather than just agreeing. This game's entire deduction is already relative -
the Sweep Scope gives distances between signatures, never positions. A
constellation is that same relativity given a second dimension: a shape, with
types attached and no orientation. It fits the instrument the game already
teaches you to think in. It also sidesteps the constraint that forced item 2
into a chain, because it labels by type without needing a type to be unique.

**Why it is harder to balance, precisely.** Item 2 stayed cheap because a
chain only ever *narrows* an existing lever - it replaces a quadrant clue
with a weaker quadrant clue, so the effect is a number on a scale that was
already measured, and `measure-chain-cost.ts` reads it off in one run. A
constellation is a genuinely new information channel, so nothing about the
existing rates carries over. It needs a channel model in `analyze-solvability.ts` and the
rank profiles in `region-difficulty.md` re-measured, which is the work item 1
did and it was not small.

**The lever that decides how hard.** How much geometry the view shows:

- **Types only, positions redundant.** If the constellation's geometry is
  just the pairwise distances the Sweep Scope already gives, then the only
  new information is the type labelling, and balance is close to free -
  measurable as "the player learns the types of k signatures".
- **Types plus true shape.** If it shows angles - a real 2D configuration,
  rotated - that is strictly more than the distance matrix, because the
  field's metric is orthogonal and a distance matrix does not fix chirality
  or bearing. Richer, and it needs the full measurement.

That choice is the design decision, not an implementation detail, and it
should be made deliberately rather than falling out of how the view happens
to get drawn.

What a fix has to respect:

- **`analyze-solvability.ts` already has a channels architecture** (`rings`,
  `ringTotals` are optional channels), so this is the documented shape of the
  work rather than new machinery.
- **It has to be metered or targeted**, like the Ring Scan and unlike a
  census. A published constellation reads identically for every player, so it
  lowers the loss rate for everyone and measures nothing - the Ring Scan
  entry has the argument and the numbers.
- **The type filter idea is the cheaper cousin** and shares the ceiling: if
  it only reports which types it can sense, it is an anonymous partition
  unless something links a type to a name - which is exactly the problem
  item 2's chain exists to solve. The two would compose well.

### 28 - Two more difficulty levers the user proposed

Raised 2026-08-11, after the type chain shipped. Their words: *"How about a
quasar type ring clue? How about at higher difficulties instead of saying
which star appears in a space, just say that a certain type appears in a
space? These are all ideas to tweak difficulty."*

Both are buildable on what exists now. They are not equally strong, and the
first one moves the opposite way from how it reads.

**The unit to think in is candidate cells.** The field is 5 rings x 8
segments = 40. A quadrant is two segments across every ring, so 10 cells. A
ring is 8. That single fact decides most of what follows.

| clue | cells left open |
| --- | --- |
| exact sector anchor | 1 |
| **ring** | **8** |
| quadrant | 10 |
| ring set, 2 rings | 16 |
| quadrant set, 2 quadrants | 20 |

#### A type ring clue is a difficulty *reduction*

`type-ring` already exists in the vocabulary, unused. But a ring names 8
cells where a quadrant names 10, so swapping quadrant clues for ring clues
hands the player two cells back per clue - it makes the game **easier**,
which is the reverse of what "another kind of clue" suggests. As a *set* it
lands between the two: two rings is 16 cells against a two-quadrant set's 20.

There is also an overlap worth weighing before building it. **The Ring Scan
already sells ring information**, metered at two per region, and its entry
argues that metering is what makes it measure player judgment at all. A
briefing clue that gives ring information for free competes with the one
instrument whose scarcity is doing work.

#### An anonymous anchor is the strong lever

This is the better idea by some distance, because it attacks the strongest
clue in the game rather than the weakest. Anchors are the two exact-position
clues and the whole triangulation baseline - the measured spread from
Technician to Chief, 90.4% down to 70.0% solvable, is what varying *quadrant*
clues buys. Nothing has ever touched the anchors.

"An Ancient Relic signature is located at sector R1S2" tells the player a
cell is occupied and by what classification, but not by whom. It does not
constrain any *named* signature at all - it constrains the set. Combined with
the pairwise distance matrix it is still powerful, but the player has to work
out which signature sits there before the baseline is usable.

What a fix has to respect:

- **Only worth emitting for a shared type.** For a unique one it collapses
  straight back to the direct anchor, which is the same pointless case the
  chain rule already refuses to generate.
- **Never both anchors.** Two anonymous anchors may leave no baseline at all;
  this needs measuring before it is offered, not after.
- **It composes with the Test Bench's type filter**, which reports per-ring
  counts by classification - exactly the instrument for working out who is at
  R1S2. If both ship they have to be measured together, the same coupling
  already recorded against the chain.
- **`measure-baseline-vs-chains.ts` is the tool**, and its lesson applies:
  assess the same region both ways rather than sampling twice, and assert
  monotonicity, since an anonymous anchor can only be weaker.

### 26 - Let the player choose a difficulty

Raised 2026-08-11, in the user's words: *"add one option.. allow a player to
select difficulty"*.

Everything needed to build this already exists and is measured; what is
missing is a decision about what difficulty *means* here. Item 1 (shipped
2026-08-05, written up in `region-difficulty.md`) made region generation
scale with rank, so there is already a per-rung profile of signature count,
anchor separation and quadrant clue count, plus a filing budget that goes
4 4 3 2 2. A difficulty setting is that same machinery driven by a player
choice instead of, or alongside, their rank.

The design question is which of those it is, and they are materially
different games:

- **Difficulty replaces rank** as the input to generation. Simple, and it
  makes the setting honest - but it disconnects the ladder from the
  challenge, and the rank ladder is currently the progression.
- **Difficulty offsets rank** - a Casual/Standard/Exacting shift of one rung
  either way. Keeps progression intact, but the extremes clamp at the ends.
- **Difficulty is a separate axis**: rank keeps setting the region, and the
  choice moves only the filing budget. Smallest change, and probably the
  most legible - "how many attempts do I get" is a thing a player can
  actually feel.

What a fix has to respect:

- **The numbers move.** Item 1 measured a careful player reaching Chief of
  Survey 100% of the time before the difficulty work and 91% after, with the
  average player dropping 54% to 5%. Any new setting needs
  `analyze-solvability.ts` re-run per level rather than assumed, and
  `region-difficulty.md` updated with what was measured.
- **It has to be per-survey, not global-retroactive.** A region's difficulty
  is baked in when it is generated, so changing the setting cannot alter a
  survey already open - it applies to the next one.
- **Where the control lives.** Survey New Region is the natural point, since
  that is when the choice takes effect. There is no settings panel today and
  this does not obviously justify inventing one.
- **It interacts with item 2.** Type clues would make regions easier, so if
  both ship, difficulty is the natural place to put them rather than a
  global on.

## Interaction


### 22 - Faint arrows showing that a panel can still be scrolled

Raised 2026-08-11, in the user's words:

> "Let's have a faint arrow visible when scrolling is possible in a
> direction. When the user scrolls, those arrows dissapear. I have thoughts
> on the look."

**Ask for those thoughts before designing anything.** The last two times a
shape was specified rather than guessed at - the desktop elbow and the phone
S-swoop - the mock-up settled it in one pass, and the guesses before it did
not.

This lands directly on top of item 7's closure. Four panels scroll inside
themselves on a phone, and the project rules allow that but forbid a visible
scrollbar, which leaves nothing at all saying there is more below. That is
the gap this fills, so the affordance has to be the thing the scrollbar is
not: part of the console rather than a browser artefact.

What a fix has to respect:

- **Per direction, not per panel.** "Scrolling is possible in a direction"
  means up and down are independent - at the top only the down arrow shows,
  in the middle both, at the bottom only the up one.
- **The panels that scroll are the ones from item 7**: Log, Officer, Star
  Manifest, Help, Prototypes. The scrolling element is the `p-3 md:p-4`
  content div inside `LcarsPanel`, so this most likely belongs there rather
  than at five call sites.
- **`prefers-reduced-motion`** - if the arrows animate at all, they must not
  under it.
- Style rules: flat fill, no strokes, no glow. An arrow is a glyph, so it
  needs the user's steer on whether it is a chevron, a solid triangle, or
  something built from the run shapes already in the kit.

