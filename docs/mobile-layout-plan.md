# Mobile layout

Status: **built** (2026-07-29). Planned earlier the same day; the plan and
the diagnosis that produced it are kept below, followed by the three places
reality differed from it.

## What happens today

Below `lg` (1024px) the star map stops being a permanent sidebar and becomes
a panel like any other, both nav rails are replaced by a **menu hub** with a
Back button on each panel, and the shell does not scroll. At `lg` and above
nothing changed — verified at 1280px, where the rails, `main` and the
sidebar measure exactly what they did before.

Measured at 390×844: no horizontal overflow anywhere
(`documentElement.scrollWidth == 390`), the page never scrolls, and exactly
one `StarMap` mounted at any time. Briefing, Star Map, Star Manifest, Sweep
Scope, Quadrant Survey and every Station Info section **fit outright**; Log,
Help and Prototypes overflow by 85/41/42px and flick-scroll inside `main`.
The map renders 318px wide instead of 260px, putting the ring/segment labels
at 13.0 painted px instead of 10.6.

### The first attempt scrolled, and that was wrong

The version first built made the shell itself the vertical scroller and put
both rails into one horizontally scrollable strip. Both violate a standing
project rule that had been recorded only as an implementation note rather
than a rule — see "Project rules" in `docs/lcars-style-notes.md`, now
promoted and expanded. The fix was the hub: trading a persistent nav for one
tap returns ~58px on every screen, and a smaller header another ~57px, which
is what let six panels fit outright rather than merely scroll less. The
lesson worth keeping: **budget the chrome first.** At 390px the old header
plus strip plus gutters came to 214px of an 844px screen before any content,
and the Star Map was missing the cut by 19px.

## The problem it fixed

`AppShell.tsx` used to lay the app out as one flex row that never stacked:

```
NavRail (primary) | main | star map sidebar | NavRail (utility)
```

Measured in Chrome at a 501px viewport, and again by emulating 390px:

| column | width at 390px | offset from left |
| --- | --- | --- |
| primary nav | 160px | 0 |
| **main content** | **0px** | 232 |
| star map | 342px | 252 |
| utility nav | 144px | 642 |

The row demanded 762px inside 342px — overflowing by 420px. `main` was the
only item that could shrink (`flex-1 min-w-0`), so it collapsed to **zero
width**, and the utility rail sat entirely off-screen. `overflow-hidden` on
both `body` and `#app-shell` clipped the excess rather than letting you
scroll to it. The visible result was a header, part of the nav, a clipped
star map, and no content at all.

### Four distinct causes

1. `#starmap-sidebar` was `w-full lg:w-[360px]` **with `shrink-0`**. Below
   `lg`, `w-full` meant "100% of the row" while `shrink-0` forbade giving
   any of it back. The single biggest contributor.
2. The four-column row had no stacked variant.
3. Fixed chrome exceeded a phone before any content: 128 + 48 + 20 + 112 +
   48 = **356px** of rails and gutters on a 390px screen.
4. `overflow-hidden` turned the overflow into invisible content rather than
   scrollable content.

## How it works

- `PanelId` gained `"starmap"` and `"menu"`, both phone-only and both
  resolving to Briefing on desktop. Initial state is `"menu"`, so a phone
  lands on the hub and desktop still opens on Briefing without needing to
  know the viewport during the first render.
- `MobileMenu.tsx` is the hub: all 9 destinations as one touching vertical
  run, stretched to fill the height the way the desktop rail's fillers do.
- `MobilePanelBar.tsx` gives every phone panel a title and a Back. The title
  matters as much as the button — with no nav on screen there's otherwise
  nothing saying where you are. Titles come from the menu entries, so the
  two can't drift.
- `main` goes full width. The shell keeps `h-full overflow-hidden` at every
  width; `main` is the only scroller, exactly as on desktop. `layout.tsx` was
  not touched.
- Station Info hides its own header block on mobile (`showHeader={false}`),
  since the panel bar already carries the name and a Back.

### The one load-bearing decision

The breakpoint **is** a real JS media query, not CSS visibility.

`StarMap` owns placement state and persists it to `localStorage` (see
`starmap-storage.ts`). Rendering both a mobile and a desktop copy and hiding
one with CSS would put **two live instances writing the same key** — that
corrupts placements rather than merely wasting work. Exactly one instance
may be mounted at a time, so `useMediaQuery` (`src/lib/use-media-query.ts`)
gates which branch renders.

## Where reality differed from the plan

1. **`useSyncExternalStore` doesn't work for this.** The plan specified it,
   built on `matchMedia` with a `getServerSnapshot` of `false`. It failed in
   the browser: a phone loaded the *desktop* layout and only corrected
   itself after the first resize. `change` fires on transitions only, so a
   query that already matched at load never notified. The hook now reads
   `matchMedia` in an effect body on mount, which is the part that can't be
   skipped.
2. **A phone's first paint is server-rendered desktop**, because the server
   has no viewport to measure — and that layout is the zero-width-`main` one
   described above, so it looks broken rather than merely wrong. The three
   desktop-only columns therefore also carry `max-lg:hidden`, which only
   ever applies to that pre-hydration frame (once hydrated they aren't
   rendered below `lg` at all). It renders as header + full-width content
   until the strip appears.
   - This is why `BELOW_LG` is spelled `not all and (min-width: 64rem)`
     rather than the usual `max-width: 63.99rem`: it has to be *exactly*
     what Tailwind compiles `max-lg:` to. A width where CSS says "phone" and
     the hook says "desktop" would hide the rails with no strip to replace
     them.
3. **No redirect effect.** The plan called for redirecting away from the
   `starmap` panel when the window grows past `lg`. Doing that in an effect
   trips `react-hooks/set-state-in-effect`, so the panel is derived instead:
   state holds `requestedPanel`, and `panel` resolves `starmap` to
   `briefing` while wide. Nicer behavior too — it's reversible, so narrowing
   the window puts you back on the map.

## Decisions taken up front

- **Star map got *bigger*, not smaller.** Its `max-w-[260px]` existed only
  because it lived in a narrow sidebar; below `lg` it's capped at 420px
  instead and lands at 318px on a 390px screen. `LABEL_SIZE` needed no
  change: the whole viewBox scales together, so a wider map buys bigger
  labels without crowding the dial. The amber gutter and panel padding also
  shrink below `md` — 64px of a 390px screen the map would rather have.
- **The hover readout is not a problem.** It uses `onMouseEnter`, which
  never fires on touch, so it sits at `--` on a phone. Accepted as-is —
  tapping a cell places a signature, which is the real interaction.

## Verified on a real device

Rotating a phone across the breakpoint works (2026-07-30). That was the one
thing this doc previously listed as untested — the cold-load paths at both
widths were checked directly, and the panel resolution is pure (derived, not
an effect) so it was correct by construction once a render happened, but the
transition itself had only been reasoned about. It holds.

What that pass *did* turn up is that the menu hub looks wrong on a phone —
nine buttons stretched to fill the height read as fat and crude. Layout, not
mechanics; logged in `backlog.md`.

Worth knowing if you pick this up: a **minimized** Chrome window dispatches
no `resize` or `matchMedia` `change` events at all, and starves React's
commits besides — an instrumented iframe resize from 390 to 1280 logged zero
events, and a stale render sat uncorrected indefinitely because the query
never transitioned. That is a testing artifact, not app behavior, but it will
waste an hour if you don't know it. Bring the window forward first.

Chrome also won't size a real window below ~500px. To get a true 390px
viewport, a same-origin harness page in `public/` holding
`<iframe src="/" width="390">` works, and an iframe can be *wider* than the
window too, which is how desktop was checked at 1280px inside a 560px
window.

## The menu hub, redesigned (2026-08-04)

The "fat and crude" note above was backlog item 6, and it stayed open long
enough to become a blocker: by the time Station joined on 2026-08-02 the run
was **full**. Measured on a cold load at 320x568, all eleven buttons landed
at exactly 44px - the `min-h-11` touch floor, with nothing left over. It
fitted, and it fitted by nothing, so a twelfth destination either scrolled
or broke the floor.

What changed, and why each part:

- **Two columns, not one.** Six rows of two at the touch floor is 294px of
  the 480px `main` gets at 320x568, so there is now 186px of headroom and a
  twelfth entry costs one row rather than the whole layout.
- **The buttons stopped stretching.** `flex-1` on a vertical run is the
  desktop rail's idiom, and the rail earns it by being permanent chrome at
  the edge of a busy screen. A landing page does not, and the direction
  agreed on the day was explicit: small buttons with generous empty space
  are fine here, because this is the one screen with nothing competing for
  the room.
- **Each row is a run, with its own caps.** `runShape` per row, per the
  style notes' wrapped-run rule, so a row reads as one bracket rather than
  as two loose pills. The odd item at the end comes back as a full pill,
  which is what `runShape(0, 1)` already says should happen.
- **A titled sub-panel around it.** A colour block with "Main Menu" resting
  at its bottom-left (the reference image's shelf move), over a
  `bg-lcars-panel` body. The body colour is load-bearing: a black tint over
  a black page is invisible, and without it the empty space below the
  buttons reads as a void instead of as room the layout is deliberately
  leaving.
- **`LcarsButton` gained a `size` prop.** Padding could not be overridden
  through `className` - two padding utilities on one element are settled by
  the order Tailwind emits them in, not the order they are written. Two
  columns of a 320px screen leave about 116px of usable width, and 24px of
  that going to horizontal padding is what pushed "Survey New Region" onto
  three lines.

Verified at 320x568 and 390x844 in the iframe harness described above: hub
present, eleven buttons, every one at 44px, nothing scrolling in either
direction.

## The jump bar, and pills instead of pairs (2026-08-05)

Two changes from playing the thing on a phone, plus the bug that playing it
turned up.

### The hub's buttons no longer touch

The rows were touching runs taking their caps per row. Correct rule, wrong
subject: a run is for siblings you read as one group, and Briefing and Star
Map are unrelated destinations that happen to be adjacent. Joining them said
they belonged together. They are separate pills in a gapped grid now, which
is also straight off the reference image - its lower-left blocks are exactly
that. Nothing else changed; all eleven still land at exactly 44px at
320x568, with the run still fitting outright.

### Getting to the map and back is one tap

Solving a region is a loop - read a bearing, go place a marker, come back -
and on a desktop that loop is free, because the map is a permanent sidebar
beside whatever you are reading. Through the hub it was three taps each way.
So the four survey panels (Briefing, Star Manifest, Sweep Scope, Ring Scan)
carry a Star Map button, and the Star Map carries one back to whichever of
them you arrived from. `MobileJumpBar.tsx`; the origin is recorded in
`AppShell`'s `mapOrigin`, computed on every navigation so a later trip in
from the hub can't still be offering the instrument you left two visits ago.

Reaching the map any other way - from the hub, or because the walk-through
navigated there - leaves the bar off, since the panel bar's Back already
goes exactly where you came from.

**Which end is round.** The bar's first build put the button on the left
with its flat edge facing right, into a `bg-lcars-panel` filler, and it
looked wrong. Reading the reference image's data rows closely settles why,
and inverts the obvious intuition: each row opens with a narrow colour-coded
stub rounded on its *outer* end and flat on its inner one, carries labels
flat at both ends through the middle, and stops with a label rounded where
the row ends. **Rounded is where a run terminates; flat is where it
continues** - and the black gaps do not break that, since flat ends face
each other across grout all through the image.

By that rule the original shape was correct and the composition still
failed, because the block its flat edge was flat *against* was a near-black
tint on a black page. The cut had nothing visible to be cut against, so the
button read as a pill with its end amputated. A flat edge is a promise that
something continues, and you have to be able to see the something.

So the button sits at the right, taking the rounded outer cap and turning
its flat edge inward, and the dark filler was replaced by the reference's
own row-opener: a narrow stub, solid colour, no text. It carries the colour
of the panel you are **on** while the button carries the colour of the panel
you are going **to**, which is meant to keep it from reading as a decorative
state lamp beside a button - a small shape sitting against a button will
read as state if you let it, and this one is carrying the trip. (It did not
survive contact: see "Half a bar" below, where the stub comes back out.)

**Why the bottom and not the panel bar.** The obvious home was
`MobilePanelBar`, which is already the fixed spot on every phone panel and
would have cost no height at all. It doesn't fit: that bar carries the
panel's title, which with no nav on screen is the only thing saying where
you are, and a third element squeezes it to a truncated stub at 390px.
Reach agrees with the measurement - this is pressed dozens of times a
survey, and the top-right corner is the worst place on a phone for that.

Structurally it is the panel bar mirrored: a `shrink-0` sibling of `main`,
never inside it, so `main` stays the only scroller and the bar cannot scroll
out from under the thumb reaching for it. The label is always the
destination and the fill is always that destination's own colour, so the bar
reads as "one tap puts you here" rather than as a back button that happens
to be labelled.

**What it cost, measured at 390x844.** 44px of touch floor plus a gap, so
52px. That pushed the Sweep Scope from fitting outright to overflowing by
4px, so the phone column's gaps went from 12px to 8px - two of them, which
hands back 8 and leaves the Scope fitting with room.

The number that matters is per *region size*, though, which is the thing
this doc previously had no reason to think about and item 1 has since made
vary. At six signatures Briefing, Ring Scan, Sweep Scope and the hub all fit
outright and the Star Manifest overflows by 78px. At eight - the Survey
Technician's profile, so a real and in fact the *most common* case at the
bottom of the ladder - the Scope has only 16px of slack before the bar and
overflows by 36px after it, and the Manifest by 264px.

So: the bar costs the Sweep Scope its outright fit on large regions, and
that was accepted. 36px is a nudge rather than a scroll, the rules allow
content to scroll inside its own panel, and the alternative was giving up
the one-tap hop that motivated the whole thing. The Manifest is a different
problem and is not the bar's - 30px of it predates this work, and this doc
has listed the Manifest as fitting outright since 2026-07-29 when it has
not for some time. Logged as part of backlog item 7.

### Half a bar, leaning the way you go (2026-08-06)

The full-width bar was more bar than the trip needed, so the run is now half
the viewport and pushed flush against one edge - **right** on the way out to
the map, **left** on the way back. Which half it occupies is the direction of
travel, which is the one thing a two-stop shuttle can say for free, and the
empty half is not wasted: it is the gap the reference leaves between a run
and whatever is not next to it.

Half the *viewport*, not half the panel. The run has to line up with the
screen rather than with the gutter, so it is `w-[50vw]` inside a wrapper with
a negative outer margin - 195-390 of a 390px phone, exactly.

That margin is the deliberate part. The outer end is flat now **and touching
the glass**, which is the shape rule above followed one step further: flat
means the run continues, and what it continues into here is off-screen. It
only reads that way if it genuinely reaches the edge - flat with a strip of
black beyond it is exactly the amputated look this bar had on its first
build.

Everything is therefore **rounded on its inner side and flat on the side
facing the glass**, mirrored when the bar changes sides. Worth stating as a
flip rather than as a squaring-off, because that is the correction that
produced it - a cap that disappears is not a flip, it is a cut, and a run
needs its rounded end somewhere to say where it starts.

**And the stub is gone.** The bar was a two-part run for a day: a narrow
colour-coded stub carrying the colour of the panel you were *on*, against a
button carrying the colour of the panel you were going *to*, meant to read as
a trip. At full width the stub read as the reference's row-opener. At half
width, pushed against the screen edge with a button beside it, it read as
exactly the thing it was warned about when it was designed - a small shape
parked next to a button, which the eye takes for a state lamp. So the bar is
one button now. Where you are is the panel bar's job, at the top of the
screen; where one tap takes you is the button's.

The panel bar at the top of every phone panel got the same treatment on the
same day: Back's cap moved from its right side to its left, and its right
edge runs off the screen, with the strip's `-mr-3 md:-mr-6` cancelling the
shell's gutter on that side only. Back keeps its 72px and the *title* gains
the 12px, which is the right way round - the title is the thing that
truncates at 390px. These two bars are the only places in the app that break
the 12px frame, and they break it on purpose.

One thing measured on the way: with the stub in place the button was 151px at
390 and 116px at 320, and the widest label ("Star Manifest") is 80px, which
put it one line short of wrapping at 320 on the default padding. Dropping the
stub gives the whole 195/160 back, so the padding went back to default and
`whitespace-nowrap` stayed as insurance. Two lines would be worse than tight
here, because the bar is `shrink-0` and every pixel it grows comes off the
panel above it.

### The map froze in Rule Out and Maybe

Found by the same pass, and older than any of it. Arming a signature in an
annotation mode set `touch-action: none` on the dial, which is what a
drag-paint needs to stop the browser claiming the gesture as a scroll - and
on a phone the map is a full-width panel taller than the screen, so the
panel stopped scrolling for as long as a signature was armed. The comment
on the line said it was only on "while a rule-out sweep is actually
possible", which is exactly the state you are in while using the feature.

A finger marks one cell per tap now, and only a mouse or a stylus sweeps.
The tap is handled on `pointerup` rather than `click`, which is what tells a
tap from a scroll for free: the moment the browser decides a touch is a
scroll it sends `pointercancel` and never sends `pointerup` at all, so a
drag down the panel leaves no marks behind it without anything here needing
to know about distances or thresholds. Verified by dispatching synthetic
pointer events at every branch - touch-down alone marks nothing, touch-up
marks, touch-down-then-cancel marks nothing, mouse-down still marks
immediately so a sweep starts on the press, and the click that follows a
mouse stroke does not toggle it back off.

**One thing an earlier pass found and did not fix.** At 320x568 the *header*
overflows horizontally - `scrollWidth` 362 against a 320 viewport, from the
officer badge and sound toggle, which are `shrink-0` next to a title that
will not give up enough room. Confirmed pre-existing by stashing the hub
work and re-measuring: identical 362. It is clipped rather than scrollable
(`#app-shell` is `overflow-hidden`), so nothing is lost, but "SOUND: ON" is
cut in half. Logged as backlog item 10.

### Three columns, a blank, and the emblem (2026-08-07)

Backlog item 11, closed. The hub's buttons were re-organised on the user's
prompt: *"they are very wide and have all the text right aligned... I propose
having three columns with some blank buttons or space between."*

**Why two columns looked wrong.** Each pill was ~170px against a label of six
or seven characters, so a button was mostly empty pill with its word pinned
to one end. The pinning arrived with the align default on 2026-08-06 (text
hugs the segment's flat end), which is right for a rail whose cells are wider
than their labels and wrong for a cell nearly four times its word. The
proportion was the problem; the alignment only made it visible.

**Three columns costs less height, not more.** The labels wrap, so the
buttons go to `min-h-14` - but four rows of 56px is about 50px *shorter* than
six rows of 44px. The denser grid is the smaller one, which is the opposite
of what the two-column note assumed when it said the run was full at eleven.

Measured at both sizes: cells are 113px at 390x844 and 89px at 320x568, every
button clears the 44px touch floor at 56, and `main` has no vertical overflow
at either. The horizontal 42px at 320 is backlog item 10 and unchanged.

**The blank slot.** Eleven entries into twelve cells leaves one over. It goes
second-to-last, which drops Survey New Region into the final cell on its own
- the only entry that *does* something rather than going somewhere. That is
`lcars-ultra`'s device: its left grid leaves one cell of six empty and the
gap reads as unassigned rather than as a mistake.

**Centred labels, asked for explicitly.** `align="center"` overrides the
hug-the-flat-end default, because at three columns the cell is barely wider
than its word and the label often wraps. The references support it in exactly
this case: the word cells in `Lcars menu`'s foot grid (`ORD 3R`, `COM B6`,
`SUB ST`) are centred where the numeric cells beside them are not. Alignment
follows the cell's proportion, not a global preference.

**The emblem.** The reclaimed space plus what was already going spare now
carries `OutpostLogo` and the station's name - the same emblem the
no-assignment placeholder uses, so the hub and an empty Briefing read as the
same station rather than as two dark screens. It is decoration, not a
control: Station is already a button three rows up, and a second silent route
to it would be a worse affordance than none. It shrinks first when height is
short, 180px at 390 and 135px at 320, and the grid above it never moves.

**Sized off the container, not a breakpoint (same day).** The first pass
fixed the rows at 56px, which is right at 320x568 and looks lost on an 844px
handset. The obvious fix - let the rows share the height available - was
tried and immediately rejected on sight: at ~92px the pills became
near-square tiles and drew the same "too fat" objection the stretched
two-column hub drew in August.

So the split is: **the buttons stay pills and the emblem takes the space.**
Rows are capped at 60px via `--lcars-hub-grid-max`, which keeps every cell
wider than it is tall at every phone width (2.1 at 430, 1.88 at 390, 1.49 at
320), and the emblem gets everything left over - 260px on a tall handset,
shrinking to 113px at 320 where the grid needs the room. What makes the page
feel bigger is the label and the crest, not the controls.

The label is `--lcars-hub-label`, 13px, up from 11. It had been written
`text-[11px] sm:text-xs`, and **`sm:` is a 640px breakpoint that no phone
ever reaches** - so every handset had been getting the base size while the
larger one only ever appeared on tablets. Worth remembering generally: on
this screen, breakpoints are the wrong tool, because the thing that varies
is the height of the container rather than the width of the viewport.

### Two runs of six, with a sweep (2026-08-07, final)

Three columns was tried first and rejected on sight as crowded. It is worth
recording why, because the numbers say the opposite of the eye: three columns
gave cells of 89-126px against 60px of height, a ratio of 1.49 to 2.1, which
is close enough to square that the pill stops being a pill. Two columns gives
2.37 to 3.2. **A pill has to be visibly wider than it is tall or it reads as
a fat tile**, and that ratio is the thing to check, not the column count.

So: **two runs of six, with a sweep between them.** The split is what you do
with the entry - the first six are working a survey (Briefing, Star Manifest,
Star Map, Sweep Scope, Ring Scan, Log), the second six are the station and
your record. The first group's order pairs the two catalogue panels on one
row and the two instruments on the next.

**The sweep** is a thick knee with a rounded outer corner turning into a thin
arm that runs to the panel's edge - the move the second and third references
use wherever a run of controls changes subject. It says "different set" with
a piece of structure rather than a drawn rule, which is the one thing the
notes forbid outright. The interior corner where knee meets arm stays square:
rounded terminates, flat continues, and that joint continues.

**The crest comes off on small screens.** Six rows want nearly all of a 568px
phone, so `.lcars-hub-crest` is hidden below a 700px viewport height and
shown above it. This is one of the few places a media query is the right tool
here - what actually runs out is the viewport's height, which is exactly what
the query measures. At 320x568 the hub is buttons alone; at 390x844 and above
the emblem returns.

Measured at 430x932, 390x844 and 320x568: eleven buttons, rows 58-60px, every
one clear of the 44px touch floor, no vertical overflow, crest shown at the
top two and hidden at the smallest.

### The S-swoop (2026-08-07)

Backlog 18, to the user's description: *"a swooping S shaped header, Starts
at the top, swoops down on the left halfway, then swoops to the right side
and then straight down. The bottom of the S is missing. The swoop splits the
two sets of buttons."*

The frame does the dividing. The hub's two groups used to be separated by a
small knee-and-arm drawn between them - the right idiom at the wrong scale,
since it was a decoration *between* two runs rather than a piece of the thing
containing them. Now one orange path runs across the top, down the left past
the first six, across between the groups, and down the right and off the
bottom edge. The buttons sit in the two pockets it leaves.

Three inner corners, facing three different ways, which is why
`.lcars-elbow-notch` grew orientation modifiers rather than being copied.
The outer corners are the opening sweep (2.5rem, about the shelf's height,
the same ratio the shell and the Star Map use) and the turn out of the left
leg (1.25rem, about the leg's width).

**Rows are sized against the viewport's height, not stretched.** Stretching
was tried first and left a void: the grid capped its own height inside a
pocket that did not, so the crossing floated a long way below the group it
was meant to divide. Each pocket hugs its buttons now and the crest absorbs
the slack, which is the only thing on this screen that should. The row token
steps 48 / 56 / 60px at viewport heights of <700 / 700 / 860, so six rows
plus the shelf plus the crossing still fit 320x568 without scrolling - the
rule that navigation never scrolls is the binding constraint here, not
taste.

Measured at 430x932, 390x844 and 320x568: eleven buttons, rows 60/56/48, all
clear of the 44px touch floor, three notches each, no vertical overflow at
any size, and the right leg landing flush on the panel's edge.

**Corrected the same day, on the user's eye.** Three things were wrong and
all three are the same rule: *flat is where a run continues, rounded is where
it stops.*

- The top bar's right end was capped. It runs off the side, so it is flat.
- The right leg's foot was capped. It runs off the bottom, so it is flat.
- The turn from the crossing into the right leg was a right angle. A sweep
  that arrives at 90 degrees is not a sweep - it now has the same outer
  radius as the turn out of the left leg.

Only the opening corner is rounded now, which is the one place the shape
genuinely begins.

The legs doubled to 40px, behind `--lcars-hub-leg-w` because that number is
expected to move again. And the crest came out: it was there because the hub
had space going spare and nothing to do with it, and the swoop now occupies
that room structurally - a crest underneath read as a second, competing
centre.

**The crest came back, small (same day).** Removing it outright was a step
too far - on a tall handset the space under the second group is real, about
305px at 390x844, and leaving all of it empty was not better. It returns at
104px behind `--lcars-hub-crest-max`, gated on a 700px viewport height so it
never appears at 320x568 where the space is about 30px.

Two things kept from the removal, though. The caption is gone: the emblem
alone is a mark in the corner of the screen, where "TIKON RESEARCH STATION"
underneath made it an announcement, and announcing is the swoop's job now.
And the cap is well below what the space would allow, because the point is
that it sits in the corner rather than competing for the centre.

One trap worth recording: `OutpostLogo` renders an svg carrying both `width`
and `height` attributes, so capping only the width squashes it - it came out
104x160 before `h-auto` was added alongside `w-auto`.
