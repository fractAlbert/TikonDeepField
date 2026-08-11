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
| 10 | The header overflows horizontally at 320px | Design |
| 12 | Our side bars don't look like the reference ones | Design |

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

### 12 - Our side bars don't look like the reference ones

In the user's words, 2026-08-06, in two messages:

> "NOte that you never see vertical button rows like we have in our app."

> "Their vertical runs look different than ours. They look better"

That is the whole of what was asked. Everything below is analysis done
afterwards - five differences found by measuring the images - and it is
worth keeping the two apart, because the observation is the thing to satisfy
and the list is only one reading of how.

**Most of it has
since shipped as a side effect of other work**, so this entry was rewritten
on 2026-08-10 against the code rather than left as filed - the original five
points would send whoever picked it up chasing things that are already done.

Shipped, and not by intent:

- **A vertical run never ends in a rounded cap.** No `rounded-t-full` or
  `rounded-b-full` remains anywhere; the rail's filler is `shape="block"`.
  Fixed when the filler shipped as a 500px lozenge and the rule went into
  the style notes as "a cap belongs to a short segment, a tall block is
  square".
- **Cell heights vary within a run.** Buttons sit at their natural 40px and
  the filler stretches, which is the references' big-block/small-cell
  pattern. Came out of "let the fillers stretch, not the buttons".
- **Centring.** `LcarsButton` no longer carries `justify-center`; `align`
  derives from the segment's shape.

What actually remains, all of it cosmetic:

- **Labels are vertically centred, not tucked bottom-right in the cell**
  with the rest left as empty colour. This is the half of the centring point
  that did not ship.
- **Gaps.** `gap-1` between rows and the 48px gutter to `main`, against the
  references' hairlines. The rail is edge-anchored now, so only the interior
  spacing is at issue.

And one that is **not a defect but a disagreement**: the references vary
colour cell to cell down a rail, where ours uses one orange filler and
per-destination button colours. That was chosen, so that a colour means the
same thing in the phone hub as in the rail. Changing it would cost that.

Still worth doing alongside the `LcarsKitPrototype` conversation, since the
sheet's "Vertical run" specimen is still wrong in the way point one was.

### 10 - The header overflows horizontally at 320px

Found 2026-08-04 while measuring the menu hub, and confirmed pre-existing by
stashing that work and re-measuring: `#app-shell` reports `scrollWidth` 362
against a 320px viewport either way.

The overflow is the officer badge and the sound toggle. Both sit in a
`shrink-0` group beside a title block that will not give up enough room, so
the header's min-content lands at 338px inside 296px of available width.
Nothing is lost - `#app-shell` is `overflow-hidden`, so it clips rather than
scrolling - but "SOUND: ON" is cut in half, and the project rule is that
nothing scrolls to reveal chrome, which a clipped control fails in spirit.

Only at 320px. At 390x844 the header fits with room to spare, which is why
this went unnoticed: 320 is the floor the layout claims to support rather
than a width anyone tests on.

Worth knowing before fixing it: the sound toggle is a plain `<button>`, not
an `LcarsButton`, so it does not inherit the `size` prop added on
2026-08-04. The cheap fixes are dropping the toggle's label to an icon below
`sm`, or letting the badge collapse to its insignia earlier than `md`.

### 18 - The phone header as an S-swoop splitting the hub

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
