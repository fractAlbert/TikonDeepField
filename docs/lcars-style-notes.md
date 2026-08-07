# LCARS Style Notes

Analysis of the reference images, cataloging the style conventions that
define the LCARS (Star Trek) look.

> **There is a skill for this.** `.claude/skills/lcars-design/SKILL.md` is
> the procedure - what to read, in what order, how to crop the images, how to
> verify geometry, and the checklist of rules most often got wrong. It is
> deliberately thin and points back here. **This document is the source of
> truth; the skill is the trigger.** When a rule changes, change it here, and
> only touch the skill if the *procedure* changed.

## The reference images

**Look at them before designing or changing any UI in this project** - they
are the thing every rule below was read off, and the rules are a summary,
not a replacement. All three live in `docs/reference/`, so the analysis and
its sources travel together.

| file | what it is best for |
| --- | --- |
| `LCARS-2.jpg` (1920x1271) | data rows, gauges, the dense-directory feel |
| `Lcars menu.webp` (1024x1024) | titles, sweeps that turn into button runs, lists with lamps |
| `lcars-ultra-220809.png` (3786x2022) | a whole page: rails, brackets, grids, framed content |

The two newer ones were added 2026-08-06 and are read in **More options,
from the second and third references** below. That section is additive - it
does not overturn anything here, but it does answer questions this one was
too small a sample to answer, and it is where to look first for a *layout*
rather than a control.

`.webp` reads directly, no conversion needed. For crops, `ffmpeg -i in -vf
"crop=w:h:x:y,scale=iw*3:ih*3:flags=neighbor" out.png` - nearest-neighbour,
so the corner radii stay crisp enough to measure.

### The first reference

![LCARS reference panel](reference/LCARS-2.jpg)

It lived outside the repo until 2026-08-02, which is why these notes cited
a filename that resolved to nothing. Now committed.

A few specifics from it that the summary below is too general to carry:

- **Section titles sit at the bottom-left of their colour block**, not
  centred and not at the top - the block is a shelf the label rests on.
- **Numbers keep their leading zeros**: `008`, `017`, `007`, `061`, `03`.
  Fixed-width readouts, never trimmed, which is what makes a column of them
  scan as instrument output rather than as text.
- **A data row reads index tab, label pill, big number, label pill.** The
  number is the anchor and is roughly twice the label's size; the small
  stub tab that opens each row is colour-coded and carries no text.
- **The same colour repeats freely down a column.** Grouping is the job
  colour is doing, so repetition is the signal, not a collision to avoid.

## Structure & Shape

- **Elbow/bracket macro-shapes** — the defining LCARS move: a block starts as a sharp rectangle and sweeps into a fully rounded end where it meets the panel's outer edge. Interior joints between adjacent segments stay flat/square — rounding is reserved for exposed outer edges only.
  - Said the other way round, because the intuition runs backwards: **rounded is where a run *terminates*, flat is where it *continues*.** The centre columns are the clearest case — each data row opens with a narrow stub, carries labels flat at both ends through the middle, and stops with a label rounded where the row ends.
  - **Corrected 2026-08-06 by cropping the image**: this bullet used to say the opening stub was rounded on its *outer* end. It is the other way round — the stub is flat on the side facing the block's edge and rounded on the side facing the row, and so is every closing pill, mirrored. Flat toward the frame, rounded toward the content, which is independently where the phone bars ended up. `LcarsKitPrototype`'s "Data rows" section is the measured reproduction.
  - **A flat edge does not have to touch its neighbour.** Flat ends face each other across a black gap all through the image; the grout is separation, not a break in the run. What a flat edge does require is that the neighbour be *visible* — a cut against something you cannot see reads as an amputation rather than as a joint. That is the trap `MobileJumpBar` fell into on its first build (see `mobile-layout-plan.md`).
  - **The screen edge is a legitimate thing to continue into**, and the strongest one available: a run that ends flat *on the glass* reads as carrying on off-frame. It only works if it genuinely reaches the edge, so the two phone bars (`MobilePanelBar`, `MobileJumpBar`) cancel the shell's gutter on that one side with `-mr-3 md:-mr-6`. They are the only places in the app allowed to break the 12px frame.
  - **Moving a cap is a flip, not a cut.** When a segment turns to face the other way, its rounded end changes sides; it does not simply vanish, leaving both ends square. Both phone bars ended up with every segment rounded on its inner side and flat on the side facing the glass.
- **Jigsaw/asymmetric grid** — blocks are not a uniform grid. Widths and heights vary block to block, tiled together with no visible seams other than thin black gaps. Nothing is centered or symmetric as a whole composition.
- **Black as structural material** — pure black isn't just a background, it's the "grout" between every block. No borders/strokes are ever drawn; separation is done entirely by black gaps and touching color blocks.
- **Nested sub-panels** — smaller bordered black rounded-rect containers sit inside the larger overall composition, implying hierarchy/grouping.

## Color

- Muted, desaturated palette — terracotta/salmon, tan-orange, powder blue, dusty mauve, ice blue, blue-gray, occasional pink — nothing fully saturated or glossy. Retro-futuristic rather than "sci-fi neon."
- **Red is scarce and deliberate** — reserved for alert/critical status rather than decoration; appears only once in the first reference image. Refined by the third: a *desaturated* brick red is structural there and used heavily, while the saturated red stays scarce. See **The palettes, sampled** below.
- Color appears to encode category/grouping (system type) rather than being random per-button.

## Typography

- Condensed, all-caps, geometric sans-serif (Swiss/Helvetica-Condensed family) used throughout — no serif or decorative fonts.
- Labels are terse alphanumeric codes (two-to-three-letter fragments) rather than descriptive English — reinforces a "dense technical directory" feel over a consumer UI feel.
- Large embedded numeric readouts sit directly inside rows next to labels, at noticeably larger scale/weight than the label text — numbers are treated as primary content, not just decoration.
- Text/numbers hug one edge of their pill (flush against the rounded cap) rather than being centered — creates directional reading flow along a row.

## Flat Rendering

- Zero gradients, shadows, bevels, or glow — everything is flat, opaque color fill. Depth is implied only by layering/overlap, never by lighting.

## Recurring Motifs

- Vertical "gauge" bars with tick-mark scales — an analog-instrument metaphor rendered in flat vector style.
- Thin outline ship/technical schematics rendered in a single accent color as line art, used as functional-looking decoration within an otherwise abstract panel.
- Stacked short color pills along edges acting as index/legend strips, distinct from the interactive-looking buttons.

## More options, from the second and third references

Added 2026-08-06. `Lcars menu.webp` is a single dense panel ("FOOD SERVICE");
`lcars-ultra-220809.png` is a full page template. Everything below was read
off nearest-neighbour crops rather than remembered, and where a claim is
about colour it was sampled rather than eyeballed.

Three things they carry that `LCARS-2.jpg` does not: a **title treatment**,
a **sweep that turns into a row of buttons**, and enough vertical runs to
say what one actually looks like.

### The title is a block, a name, and a shelf

`FOOD SERVICE` at the top left, and it is three separate objects on one
line, not a heading in a bar:

1. A **solid rectangle, square on all four corners**, about as tall as the
   title's cap height and rather wider. It carries no text. It is a full
   stop in reverse - it starts the line.
2. The **title itself, set on black**, in the light lilac, at maybe four
   times the body size. Nothing behind it. This is the only place in either
   image where large text sits on bare black rather than on a colour.
3. Immediately to its right, with no gap, the **head of the top-right sweep**
   - a big orange mass whose left edge is flat and butts against the end of
   the title's last letter. The title looks like it is resting against the
   frame, or holding it back.

Inside that mass, bottom-aligned and small, sits a **subordinate label in
dark text on the colour**: `REPLICATOR`. So the pair inverts twice over -
the title is large, light, on black; its qualifier is small, dark, on
colour. Two levels of heading and only one line of vertical space spent.

`lcars-ultra` does titles differently and both are worth having: big
condensed caps, right-aligned against the frame, on black, using **` • ` as
the separator** rather than punctuation - `LCARS • ONLINE`, `WELCOME TO
LCARS ULTRA • CLASSIC THEME`. The bullet is doing the work a colon or a dash
would do in ordinary type, and it is the one non-alphanumeric mark either
image uses.

### The sweeping border that becomes a row of buttons

This is the move worth stealing, and it appears in both images.

A thick vertical trunk sweeps around a large-radius corner into a
**horizontal arm that is much thinner than the trunk** - a taper, not a
constant-width elbow. The arm runs out flat, and then, after a hairline of
black, **it keeps going as a row of segments in different colours**: same
height as the arm, flat at both ends, irregular widths, hairline gaps.

```
   ####\
   #####\____________________  __ _______ ____________ ___
   ######                     |  |       |            |   |
   ######    <- trunk           ^ arm continues as a run of cells
```

In `lcars-ultra` two of these stack, blue above red, and their segment
breaks do **not** line up between the rows - each row keeps its own rhythm.
In `Lcars menu` the same thing happens vertically: the sweep comes down and
the descending trunk is subdivided into stacked coloured cells, one of which
carries a label (`203 UT5`) and is therefore a button.

What this buys is the thing our layout keeps paying for separately: the
frame and the controls are the same object. There is no "nav area" with a
border round it - the border *is* the nav, and where it has nothing to do it
is just filler cells. It also means a run can change thickness mid-course
without breaking, which the flat-continues rule already permits but nothing
in the app currently uses.

### Vertical runs, and why theirs look better than ours

Both images use vertical runs heavily, and they are built quite differently
from `NavRail`. The differences, in rough order of how much they matter:

- **A vertical run never terminates in a rounded cap.** Checked at every
  column end in both images: a vertical column either stops **flat** (it runs
  off the frame, or hands over to the next block) or it **turns a corner**
  into a horizontal arm. The half-circle cap is a *horizontal* mark. This is
  the sharpest new rule here, and `LcarsKitPrototype`'s "Vertical run"
  specimen - caps top and bottom, made by rotating the horizontal grammar 90
  degrees - is a shape neither reference contains.
- **Cell heights vary enormously within one run.** `lcars-ultra`'s left-hand
  column runs one huge cell, then three shallow ones, then another huge one.
  Ours are all one height, which is what makes them read as a list of
  buttons rather than as a panel that has buttons in it.
- **The label sits in the bottom-right corner of its cell**, small, dark, with
  the rest of the cell left as empty colour - `AA-1524`, `ONE`, `TWO`,
  `03-111968`. Ours are `justify-center`. Centring is the single most
  un-LCARS thing about our buttons, and the old "text hugs one edge" bullet
  under **Typography** already said so without ever being applied to a
  control.
- **Colour varies cell to cell** down the run - red, peach, salmon, lilac,
  blue - rather than one colour per destination-with-meaning. Grouping is
  still colour's job elsewhere, but a *rail* is treated as decoration that
  happens to be clickable, so it is free to be a stripe of colours.
- **Edge-anchored, hairline gaps.** The run is flush to the frame with no
  outer margin, and the black between cells is a hairline rather than the
  4px we use.

Where ours does match: a **column of horizontal pills, each capped on the
same outer side and flat toward the content**, is exactly the Food Service
left column (`39451`, `6 7860`, `203 H74`, ...) and the `lcars-ultra`
left-hand grid. The cap side is uniform for the whole column - it is not
computed per position. `NavRail` is right about that, and the kit specimen
is describing a different shape than the one `NavRail` builds.

### Grids of flat cells

`lcars-ultra`'s left blocks are two columns by three rows; `Lcars menu`'s
foot is seven by three. Both are directories, not runs, and the grammar is:

- **Every interior corner is square.** No cell is capped against its
  neighbour in either axis.
- **The outward edge gets the cap.** In the two-column grid, only the
  left-hand column is rounded on its left; the right column is square all
  round because the block continues into the frame. In the seven-column
  grid nothing is capped at all - it is bounded on both sides.
- **An empty cell is allowed and says something.** One slot in the
  `lcars-ultra` grid is simply missing - black where a cell should be - and
  it reads as unassigned rather than as a mistake.
- **Text right-aligns** in the numeric cells; the few word cells (`ORD 3R`,
  `COM B6`, `SUB ST`) sit centred. Numbers and codes are not the same thing.

### Lists with lamps

The Food Service body is a directory list, and it is not built from pills at
all:

```
(O)  IDENT67T   PLOMEEK SOUP   NUTRI588        [ 39451 ]
     VULCAN VEGAN COMFORT FOOD
```

- A **large filled circle** at the head of each entry, two lines tall,
  coloured per entry. This is the index-tab job done as a lamp, and it is
  legitimate here precisely because it heads *a row of things* - which is the
  distinction the jump bar learned the hard way (see below).
- **Two lines of text, same size, same colour**, the first a run of codes and
  a name separated by wide spaces rather than punctuation, the second a plain
  descriptive subtitle. The wide inter-field spacing is doing the work a
  table's columns would.
- A **pill on the far right**, rounded on the outer side, flat toward the
  list, number right-aligned.
- **State is carried by swapping the lamp and the text colour together.** One
  row of five has a *hollow ring* instead of a filled circle, and that row's
  text is amber where every other row is lilac. Nothing is dimmed, nothing is
  outlined, nothing moves - two colour changes and the row is selected.

`lcars-ultra`'s status list is the same idea at small size: a squashed
ellipse as the bullet, `LABEL: VALUE` in caps beside it, and the one line
whose state differs (`OPTICAL DATA NETWORK: REROUTING`) changes both bullet
colour and text colour while the other three stay orange.

### Framing content rather than sitting beside it

`lcars-ultra` insets its prose into the frame instead of putting it in a
panel: a black region with **large rounded corners cut into the surrounding
colour**, with a rail running along the top, down the right side, and back
along the bottom. From the colour's point of view the content's corners are
concave. The right-hand leg of that C is itself a stack of cells, one of
which is labelled (`2247`), so the frame is again also the controls.

Two smaller devices in the same crop:

- **The double rule.** Where the top rail ends, a second, shorter, thinner
  bar sits just below it. The run's open end is stepped rather than capped -
  a ragged terminus that says "continues" without needing something to
  continue into.
- **Corner brackets.** Four L-shapes around a waveform display, each an elbow
  with concentric inner and outer radii, and each bracket's straight leg
  subdivided into two or three colours. Sides left open. A viewport frame
  distinct from a panel, and cheap - four corners imply a box that is never
  drawn.

### Number fields

`lcars-ultra`'s top-centre block is eleven columns by six rows of bare
figures on black - no cells, no rules. What makes it read as instrument
output rather than as noise:

- The **first column is a plain sequence** (`101 102 103 104 105 106`).
  One ordered column is enough to make the other ten look like data.
- **Right-aligned columns**, fixed width, **leading zeros kept** (`044`,
  `0222`, `001`, `05`).
- **One row in white** among five coloured ones. The highlight is a whole
  row, not a cell, and it is the only white text in the image.

### The palettes, sampled

Most-frequent non-black colours, sampled on a 3px grid.

`lcars-ultra-220809.png` - 61% pure black, then:

| swatch | share | reads as |
| --- | --- | --- |
| `#CC504A` | 8.8% | brick red |
| `#7A87F7` | 7.6% | periwinkle |
| `#F5BEAD` | 3.8% | pale peach |
| `#F3AE95` | 3.7% | salmon |
| `#C28BF8` | 3.6% | lilac |
| `#EE7F31` | 3.5% | orange |
| `#8E49F6` | 1.6% | violet |
| `#EA3E25` | 0.6% | signal red |
| `#F5F6FA` | 0.06% | white, the one highlighted row |

`Lcars menu.webp` is warmer and much narrower - orange `#F58C3A`, burnt
orange `#C75501`, amber `#F6AB0E`, hot orange `#FD7D07`, and lilac `#AE9CD0`
as effectively the only cool colour in the panel.

**Note what red is doing in `lcars-ultra`.** Brick `#CC504A` is the single
most-used colour after black - it is a *structural* colour there, used for
whole rails. The scarce, deliberate red is the brighter `#EA3E25`, at 0.6%,
which is the waveform. So "red is scarce" survives, but only if the two reds
are held apart: a desaturated brick can carry structure, a saturated one
cannot carry anything but alarm. Our palette has `salmon` for exactly this
reason, and this is the evidence for it.

Both images support the existing muted-palette rule, but note that
`lcars-ultra` is noticeably more saturated than `LCARS-2.jpg` - full-strength
periwinkle and violet. The muting is a property of the era being imitated
rather than of LCARS as such.

## Project rules

Conventions this project holds itself to, as distinct from observations
about the reference images above.

### Nothing scrolls to reveal chrome

The viewport shell never scrolls, at any width. More specifically:

- **Navigation must never scroll.** If a set of nav buttons doesn't fit, the
  navigation is wrong — shorten it, wrap it into rows, or move it behind a
  hub. Never a swipeable strip. A control you can't see is a control that
  isn't there, and a sideways-scrolling rail reads as a web page rather than
  a console.
- **Content may scroll, but only inside its own panel, and never with a
  visible scrollbar.** Use `overflow-y-auto no-scrollbar` so it degrades to
  a flick-scroll. Prefer making it fit; the Survey Log uses pagination
  instead, which is the better answer where content is a list.
- **Wrapped runs get per-row caps.** A run split across rows computes
  `runShape` per row, so each row reads as its own bracket. Wrapping a
  single flat run leaves square ends mid-air where the break lands.

### A sub-run is the same run, held smaller and at a fixed column count

When a section needs tabs of its own inside a panel that already has a tab
run, use the same touching-run language rather than inventing a second
control style — but distinguish the level three ways:

- **Fixed columns.** The parent run is responsive (three up, six at `lg`).
  A sub-run stays at three at every width, so it can never line up as a
  second peer row of six on desktop.
- **Smaller.** Down a text step, tighter padding. Still `min-h-11`, since
  the touch floor is not negotiable.
- **One colour for the whole group**, the section's own accent, with
  unselected slots dimmed. The reference image uses colour to encode
  grouping, so six colours here would read as six unrelated destinations
  instead of one set of siblings.

Per-row caps still apply — `runShape(i % 3, 3)` gives each row its own
bracket. The expanded body below goes in a black rounded container, which
is the reference image's nested-sub-panel move and says "this belongs to
the block above" without drawing a border.

Station Info's Quasars section is the worked example.

### A section title rests on a shelf, and text hugs the flat end

Both adopted 2026-08-06 from the second and third references, and both are
now in the primitives rather than at call sites.

**The title.** `LcarsPanel` draws a solid block of the accent colour with
the label sitting at its **bottom-left**, not a caption bar across the top.
The height is `--lcars-shelf-h` in `globals.css`, set to the measured floor
(4.45x the label's cap height, ~45px at `text-sm`), with `size="lg"` for
panels that own a whole screen. The floor is what a phone can afford: four
of these stack on the Briefing and the Profile, and the literal reference
proportion of 13.6x does not fit past two.

**The text.** `LcarsButton`'s `align` defaults to the segment's *flat* end -
the end it continues into - rather than to centre. It derives from `shape`,
so it needs no setting at a call site and it self-corrects when a run is
mirrored: the two nav rails cap opposite ways, so their labels lean toward
`main` from both sides without being told to. `center` still exists and has
to be asked for.

### Selection is a swap, an indicator or a lamp - never a stroke

No border, ring or outline is drawn to mark state. The three devices, all
read off the references and all now used in the app:

- **Swap two things at once.** `Lcars menu`'s selected row changes its lamp
  from filled to hollow *and* its text from lilac to amber. The rank ladder
  and the Ring Scan's used targets work this way.
- **Push an indicator out** toward the content - `NavRail`'s half-circle,
  and the Log's previewed entry swelling its own accent bar from 8px to
  20px.
- **A lamp**, a solid bar beside or beneath the thing. Used where the thing
  is too small or too round to mark otherwise: the manifest's colour
  swatch, the colour picker, the rank strip's current rung. It never has to
  contrast with what it marks, which a ring does.

Two exemptions, both on layout grounds rather than taste: form fields keep a
visible edge, and the walk-through's anchor keeps its teal outline. Both use
`outline` rather than `ring` because outline is drawn outside the box and
cannot shift a panel that exactly fits.

### Below `lg`, navigation is a hub

Phones get a menu of every destination plus a Back button on each panel,
not a persistent rail. Nine labels will not fit across 390px at a readable
size, and the rule above rules out scrolling to reach the rest. The trade is
one extra tap for ~58px back on every screen — which is most of what the
Star Map needed in order to fit. See `docs/mobile-layout-plan.md`.

### The specimen sheet

`components/prototypes/LcarsKitPrototype.tsx`, in the Prototypes panel. Every
shape, colour, type step and composite block above, rendered in the app's own
components and captioned with the rule it demonstrates — including the
side-by-side wrong versions (a wrapped run without per-row caps, centred text
in a data row, six colours where two would group).

These notes are prose about a JPEG, which is enough to argue from and not
enough to build from: three passes over the phone bars got the caps backwards,
and each fix came from cropping the reference rather than from re-reading the
rule. **Open the sheet before designing a control, and the image before
trusting the sheet.**

**Two things in it are now known to be wrong**, found 2026-08-06 when the
second and third references arrived, and left in place pending a
conversation about the sheet as a whole:

- Its "Vertical run" specimen caps the column top and bottom. No vertical
  run in any of the three references does that - they end flat or turn a
  corner. See **Vertical runs** above.
- That specimen also calls itself "the desktop nav rail", and it is not.
  `NavRail` stacks *horizontal* buttons each capped on the same outer side,
  which is the shape the references actually use.

## Status in Tikon: Deep Field

Implemented:
- Elbow/touching-run shape logic (rounded outer caps, flat inner joints)
- Black-gap separation between blocks - card/list borders replaced with flat
  accent-bar + solid-fill blocks (StarManifestPanel, LogPanel, PrototypesPanel,
  QuadrantSurveyPanel, Star Map signature chips)
- Flat fill, no gradients/shadows
- Large embedded numeric-readout pattern (Briefing signature/bearing counts,
  Quadrant Survey census count, Log page indicator)
- Sparing, single-purpose use of red - added `salmon` as its own button color
  and moved Quadrant Survey off red, so red now only appears on Reset,
  incorrect-verify, and ruled-out marks
- No-scroll viewport shell at every width, including phones - see Project
  rules above. Station Info's section tabs were the last holdout: they were
  one `flex-nowrap` run with `overflow-x-auto`, which scrolled (with a
  visible scrollbar) even on desktop, since `main` is only ~452px at 1280px
  wide against roughly 600px of buttons. Now wrapped into rows of three.
- Nested sub-runs - Station Info's Quasars section tabs its six
  classifications with a smaller, fixed-three-column run in the section's
  own salmon, over a black nested sub-panel. See Project rules above.
- Signature *shape* as a second identity channel, alongside colour -
  Pinpoint, Bloom, Four-spike and Ringed, adopted 2026-08-03 from the
  Marker Identity Trial in the Prototypes panel. `lib/quasar-glyph.ts`
  assigns them by list position exactly as colour is assigned, and
  `components/QuasarMarker.tsx` is the single drawing, so a Four-spike in a
  14px Log chip is the same picture as one on the dial.

  This is depicted sky, not chrome, so it is covered by the `QuasarStar`
  exemption above rather than being a new departure from the flat-rendering
  rule. What it deliberately avoids is geometric glyphs - diamonds,
  triangles, squares - which separate better and turn the dial into a chart
  of shapes. Every variant is a way a real point source differs through a
  real instrument.

  Two measurements worth keeping, both in
  `scripts/check-marker-clearance.ts`: nothing grew to make room (all four
  fit a cell's 15.5 units at the core the map already used), and the rings
  drawn *around* a marker had to move outward - the Ringed glyph's own ring
  sits at 9.2, which was exactly where the catalog reveal used to be.

  Extended to the Briefing's Logged Bearings on 2026-08-04, which was the
  one place a signature was named in prose and left for you to find. Every
  other panel drew it as colour plus shape; now "Mrk 633 is at R2S7" and the
  marker you are about to place are recognisably the same thing before you
  have read either. The glyph slot is reserved even on the bearings that
  name no signature - the built-in regions have clue kinds that describe
  "the Dormant Core signature" without saying which one - so the text stays
  in one column instead of stepping left.

- Leader callouts on the Star Map - the station schematic's idiom (a thin
  line, an elbow off the label's edge, a small dot where it lands) reused by
  the walk-through to point at one cell of the dial. Teal, which is already
  the tutorial's colour, so it reads as the walk-through talking rather than
  as a new piece of game state. `components/starmap/TargetCallout.tsx`; the
  label's position is measured by `scripts/check-tutorial-callout.ts`
  against every label the dial already draws, because the corners are the
  only empty space in the box and the quadrant labels are in them.

- The phone hub as a titled block, not a stretched column - see
  `mobile-layout-plan.md`. A nested sub-panel has to be lighter than the
  page, because black over black is invisible and the empty space stops
  reading as deliberate.

  Its rows were touching runs until 2026-08-05 and are separate pills now,
  which sharpens the wrapped-run rule below rather than breaking it: **a run
  is for siblings, and adjacency is not siblinghood.** Briefing and Star Map
  sat next to each other because eleven entries wrap at two columns, not
  because they are related, and joining them said otherwise. The reference
  image runs both languages - continuous runs where a set continues into
  itself, grids of individually capped pills in its lower-left blocks where
  it is a directory. Ask which one you have before reaching for `runShape`.

- **A phone panel's chrome is a `shrink-0` sibling of `main`, never inside
  it.** The panel bar above and the Star Map jump bar below are the same
  move mirrored, and that is what keeps them honest against the no-scrolling
  rule: `main` remains the only scroller, so neither bar can scroll out from
  under the thumb reaching for it. Where a bar is worth its 44px, the height
  comes out of the gaps rather than out of the touch floor - see the Sweep
  Scope's 4px in `mobile-layout-plan.md`.

  As of 2026-08-06 the jump bar is a single button, half the viewport wide
  and flush to one edge, and which edge is the direction of travel: right on
  the way out to the map, left on the way back. It briefly carried the
  index-tab motif beside it - a narrow colour-coded stub for the panel you
  were on - and that is the cautionary tale: **a small shape parked next to
  a button reads as a state lamp**, whatever you intended it to mean, and a
  lamp that indicates nothing is worse than no lamp. The tab motif belongs
  at the head of a *row of things*, which is what the reference uses it for.

- **Touch is not a small mouse.** A drag-paint needs `touch-action: none`,
  and `touch-action: none` on anything taller than the screen means the
  panel has stopped scrolling. Where both are wanted, split by
  `pointerType`: sweep on a pointing device, one tap per cell on a finger,
  and take the tap on `pointerup` rather than `click` - a touch the browser
  reinterprets as a scroll gets `pointercancel` and never gets `pointerup`,
  so the distinction comes for free. `starmap/StarMap.tsx` is the worked
  example.
- **Dimming means "you have already put this one down."** The Star Map's
  signature chips drop to 60% once placed, and as of 2026-08-04 so do the
  Sweep Scope's reference buttons and legend and the Ring Scan's targets. It
  is a note about the board, never a disabled state: a placed signature is
  still a legitimate scan target, since the placement may have been a guess.
  Which is why the Ring Scan says so in as many words, and why the Sweep
  Scope never dims the *active* reference - the whole readout is measured
  from it, so fading it would read as the instrument going stale.
- Maximising the Star Map (desktop). The dial scales with its box - the
  viewBox is 440 units and every label size is in user units - so a larger
  box buys larger labels with no second set of sizes to keep in step. Two
  constraints shaped it: the map may not be **remounted** on the way (it
  owns the board and persists it, so the expansion is a restyle of the
  sidebar and `main` is hidden rather than unmounted), and the dial has to
  be capped by *height* as well as width, or maximising hands you a bigger
  map you have to scroll to see.

Not adopted (deliberately):
- Terse two/three-letter code labeling convention for nav - would hurt
  usability for panel names, though quasar designations (e.g. "PKS 753")
  already follow this convention naturally
