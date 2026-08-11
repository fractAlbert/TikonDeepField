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

Nothing changed. The tokens are where they were: the hub's shelf 45px
against 40px legs and a 14px crossing, the Star Map's 32px shelf against a
40px leg. So the ratio argument stands on paper and was overruled in the
only court that matters - both of those numbers had been set by eye
recently, and the entry itself said changing them on arithmetic alone would
be overriding a judgement.

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
| 2 | No `quasar-type` clues are ever emitted | Gameplay | open, needs a design call |
| 21 | The LCARS pattern kit - a standing check, maybe nothing to do | Design | standing reminder |
| 22 | Faint arrows showing that a panel can still be scrolled | Interaction | open, waiting on the user's steer |
| 24 | Header bars like thelcars.com's | Design | open, needs the page confirmed first |

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

### 24 - Header bars like thelcars.com's

Raised 2026-08-11, in the user's words: *"todo: header bars like the lcars
theme page. They look nicer."*

**Confirm which page and which element before building anything.** There are
two plausible readings and they are different jobs:

- `thelcars.com/themes/`, meaning the striped multi-colour **bar rows** that
  run under the elbow - segmented runs of different-coloured blocks.
- `thelcars.com/text-bar.php`, its documented "LCARS Text Bar", which is a
  bar *containing* text and is the nearer analogue to our panel shelves.

Our current equivalent is `LcarsPanel`'s shelf - one solid block of accent
with the label at its bottom-left - so if the answer is the second, this is
a change to one component and lands everywhere at once.

What the 2026-08-11 review already established, so it does not need
re-measuring:

- Their bars are **28px** tall, against 240px vertical legs.
- The gap between segments in a run is a **7.33px black `border-right`**,
  not spacing, with `box-sizing: border-box`; the last segment has none.
- **A run can step down in thickness mid-row** - one 28px row contained a
  14px segment, exactly half.
- Segment colours come from the named palette, and repetition down a run is
  normal rather than a collision.

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

