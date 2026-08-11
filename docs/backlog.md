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

| # | item | where |
| --- | --- | --- |
| 2 | No `quasar-type` clues are ever emitted | Gameplay |
| 7 | Log/Help/Prototypes flick-scroll on a phone, accepted | Design |
| 8 | Star Map hover readout dead on touch, accepted | Interaction |
| 19 | Frames whose horizontal and vertical runs are too alike | Design |
| 20 | The sweep's trail restarts when it changes direction | Interaction |

## Design

### 7 - Log, Help and Prototypes flick-scroll on a phone

They overflow 390x844 by 85px, 41px and 42px and fall back to the
hidden-scrollbar scroll inside `main`. That's allowed by the project rules —
content may scroll inside its own panel — and it was accepted knowingly. The
three are all long prose, so the fix, if wanted, is editorial (shorter copy,
or pagination the way the Survey Log does it) rather than layout.

**The Profile panel joined them too**, found while measuring the title shelf
on 2026-08-06: 264px over at 390x844 and 621px at 320x568, of which the
shelf accounts for 39px (three panels at 13px each) and the rest predates
it. Same fix as the prose panels - it is a long single column of service
record, standing, and career history, and the honest answer is fewer things
on one screen rather than a tighter layout.

**The Star Manifest joined them**, found while measuring the jump bar on
2026-08-05. It overflows by 78px at 390x844 on a six-signature region, of
which 30px predates the bar — it is listed as fitting outright in
`mobile-layout-plan.md` and has not for some time. Different fix from the
other three, because this one is a list rather than prose and it grows with
the region: eight signatures is the technician's profile, so the worst case
is worse than what was measured. Pagination, or a denser row, rather than
shorter copy.

### 20 - The sweep's trail restarts when it changes direction

Raised 2026-08-10, in the user's words:

> "The sweep scope has a nice trail behind it and it fades over time.
> However, when the sweep reaches the end, the trail dissapears and starts
> again as it moves back in the opposite direction. Can we have the trail not
> dissapear as we change directions but continue to fade. That way it looks
> more natural."

The trail is not a decaying thing today, it is a shape recomputed every
frame from where the line currently is and which way it is going -
`RelativeDistanceScope`'s frame loop sets `trail.style.left`, `width` and a
`linear-gradient` whose direction flips with the sweep. So at the moment the
cycle flips, the whole gradient is rebuilt facing the other way and the old
one ceases to exist. It does not fade out; it is simply no longer drawn.

What a fix has to respect:

- **The clock must not restart.** Phase is carried frame to frame precisely
  so that changing the speed does not move the line (item 14). Anything
  built here has to advance off the same `dt`, not off a fresh timer.
- **Only picking a new reference restarts the sweep**, and that should keep
  clearing the trail - a new reference is a new reading.
- `prefers-reduced-motion` hides the trail entirely today, and should
  continue to.

The shape of the fix is that the trail has to become something that decays
on its own - the last N positions with an age each, or a canvas the line
paints into and which fades - rather than one element re-derived from the
current direction.

### 19 - Frames whose horizontal and vertical runs are too alike

Found 2026-08-10 in a sweep of the whole interface against the style guide,
and the only thing that sweep turned up which is not already tracked.

The rule, in the user's words on 2026-08-07: *"in every example I see, the
horizontal swoops and side swoops are never the same size. Top matches
bottom and left matches right."* The shell obeys it comfortably - a 92px bar
against a 160px leg, a ratio of 1.74, which is also how both new reference
images taper. Two frames do not:

- **The phone hub.** Its shelf is 45px and its legs are 40px. Those are
  near enough to identical that the rule is broken outright - a horizontal
  and a vertical run reading as the same weight. Its crossing is a third
  value, 14px, so the two *horizontal* runs do not match each other either.
- **The Star Map**, more mildly: a 32px shelf against a 40px leg, a ratio
  of 1.25 where the shell manages 1.74.

Not urgent, and deliberately not fixed on the spot. Every one of these
numbers is already a token, so the change is small - but the hub's leg was
doubled to 40 on the user's eye eight days ago, and the Star Map's leg was
tried at 56 and reverted the same day, so both have been *looked* at
recently and liked. Changing them on a ratio argument alone would be
overriding a judgement with arithmetic.

What a fix would have to respect: the map's leg cannot exceed 56px without
the sidebar widening (item 4's note has the numbers), and the hub's leg
comes straight out of the button columns at 320px.

## 18 - The phone header as an S-swoop splitting the hub

Raised 2026-08-07 alongside the desktop elbow (item 17, shipped). The user's
words, kept verbatim because the shape is the specification and a paraphrase
of a shape is worth nothing:

> "Mobile is going to look very different. I'm not sure how you will
> implement exactly but I think what I want is a swooping S shaped
> \"header\", Starts at the top, swoops down on the left halfway, then swoops
> to the right side and then straight down. The bottom of the S is missing.
> The swoop splits the two sets of buttons."

So: a bar across the top, turning down the left edge, running to about
halfway, then sweeping across to the right and continuing straight down the
right edge - with no return at the bottom. The crossing is the divider
between the hub's two groups of six.

What it replaces: `MobileMenu` currently draws that divider as a small knee
and arm between the two runs, which is the right idiom at the wrong scale.
This makes it structural and continuous with the header.

What it has to respect:

- **The hub is six rows of buttons in two groups**, and at 320x568 those
  rows want nearly the whole screen - the emblem is already hidden below a
  700px viewport height. An S that costs vertical space costs it from the
  buttons, which are at the 44px touch floor.
- **Below `lg` there is no left rail**, so the header's left block is a stub
  today. The S changes what that stub is for.
- The desktop elbow's tokens (`--lcars-elbow-outer-r`, `-inner-r`,
  `-leg-drop`) exist and the same curves should almost certainly be reused
  rather than a second set invented.

## Gameplay

### 2 - No `quasar-type` clues are ever emitted

Lives in **`win-conditions.md`** - the clue vocabulary design. Generation
emits only `quasar-sector` and `quasar-quadrant`, so a player never learns
any signature's classification until the region closes and the report
reveals it. That is why the Quadrant Survey's per-type breakdown was never
usable, and why `analyze-solvability.ts` deliberately leaves it out.

**Note it would make regions *easier*.** A type clue is another constraint,
and the difficulty work (item 1, shipped 2026-08-05) measured what that
does: more information means fewer regions that stall. If this ships, the
per-rank profiles in `region-difficulty.md` need re-measuring rather than
assuming they still hold.

**What item 1 settled, for the record.** The filing budget scales with rank
(4 4 3 2 2) and the *regions* now do too - signature count, anchor
separation and quadrant clue count, per rung. A careful player used to reach
Chief of Survey 100% of the time under every threshold tested; they now
reach it 91%, and the average player dropped from 54% to 5%. The full
argument is in `region-difficulty.md`.

## Interaction

### 8 - The star map hover readout is dead on touch

`StarMap`'s readout uses `onMouseEnter`, which never fires on a touch device,
so it sits at `--` on a phone for the whole session. Accepted as-is: tapping
a cell places a signature, which is the actual interaction, and the readout
is a convenience on top. Only worth revisiting if the readout starts carrying
information you can't get any other way.
