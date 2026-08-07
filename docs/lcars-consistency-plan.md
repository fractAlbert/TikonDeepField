# Making the app consistently LCARS

A review of the whole interface against `lcars-style-notes.md` and the three
images in `docs/reference/`, done 2026-08-06 with the `lcars-design` skill,
and a plan for closing the gaps without touching every panel three times.

## What has been built (2026-08-06)

Phases 1, 2, 3a and 3b all shipped the day this plan was written. What is
left is phase 5 (new vocabulary, opt-in per panel), phase 4 (vertical rails,
gated on the `LcarsKitPrototype` conversation), one open question, and the
checker script.

| commit | what |
| --- | --- |
| `e9b22b2` | Phase 1 - `align` derived from shape, horizontal default, the two reds |
| `c160c82` | Phase 2 - all 16 stroke sites replaced with blocks, lamps and colour swaps |
| `3afa92d` | Rails: fillers stretch, buttons stay at their natural height |
| `38b95b9` | Phase 3a - header block and nav rail become one column |
| `0169ed4` | Regression fix found by measuring: `shrink-0` had cost 40px of header min-width |
| (this one) | One long filler bar, and phase 3b - the title shelf |

**Measured, not assumed.** At 390 every panel that fitted before still fits,
including the Sweep Scope, which `mobile-layout-plan.md` records as fitting
by exactly 4px and which was the thing most likely to break. At 320 the
Sweep Scope, Star Map and Ring Scan overflow into their flick-scroll, by 331,
298 and 112px respectively - all far larger than the 13px the shelf adds, so
they pre-date it. The Briefing fits at 320 with four shelves on it.

**Still open:** whether to close the frame at the bottom, and whether that is
everywhere or desktop-only. Deferred by the user for a weekend decision. See
the end of **Phasing**.

Two things this turned up that are not in the findings below:

- **The Profile panel flick-scrolls** and is not recorded anywhere as doing
  so - 264px over at 390, 621px at 320. Added to backlog item 7.
- **`align` derived from shape pays off twice.** Because the two nav rails'
  caps face opposite ways, the left rail right-aligns its labels and the
  right rail left-aligns them, so both lean toward `main` with no per-site
  configuration. That would have needed two explicit settings under a
  constant default.

## How the survey was done

Every `.tsx` under `src/` was read or grepped for the specific things the
rules forbid or require, rather than skimmed for general impression: drawn
strokes, container shapes, title treatment, cap orientation, text alignment,
colour tokens. Counts below are real counts, so "10 places" means ten.

The honest summary: **the grammar is right and the vocabulary is thin.** The
shape logic, the run rules, the no-scroll rule, colour-as-grouping and the
flat-fill rule are all implemented and mostly respected. What is missing is
that the app only speaks in *pills and cards*, where the references speak in
frames, sweeps, rails, lamps and numerals. The gaps below are more about
what we never built than about what we built wrong.

## Findings, ranked by how much they repeat

### 1. The panel title bar, 34 call sites

`LcarsPanel` draws its title as a **full-width coloured caption bar across
the top** of the panel, dark text, left-aligned. Every panel in the app uses
it. No reference image contains this shape.

What the references do instead, and they are consistent about it across all
three: a section title sits at the **bottom-left of its colour block** -
`EMERGENCY OVERRIDE`, `MODE SELECT`, `IMPULSE SYSTEMS`, `POWER DISTRIBUTION`
in the first reference; `AA-1524`, `ONE`, `03-111968` bottom-**right** in the
third. The block is a shelf the label rests on, not a caption above content.
`Lcars menu` does the other variant: the title large on bare black with a
square starter block to its left and the frame butting flat against its last
letter.

This is the single most-repeated non-LCARS element in the interface, and it
is one component.

### 2. Cards, where the references have a frame - 24 uses of `bg-lcars-panel`

`--lcars-panel` is `#10121a`, a dark navy, and `LcarsPanel` is
`rounded-xl overflow-hidden`. So the app is a stack of uniformly rounded
cards in a slightly-lighter-than-black fill, floating on `bg-lcars-black`.

The references invert this. **The content region is black and the colour is
the frame around it** - a rail along the top, down one side and back along
the bottom, with the black region's corners cut *concave* into the colour.
Nothing is a card. The rounding that exists is large and asymmetric and
belongs to the frame, not to a container.

**This one has a real counter-argument on the record**, in
`MobileMenu.tsx`: a nested sub-panel has to be lighter than the page, because
black over black is invisible and the empty space stops reading as
deliberate. That is true and was learned the hard way. So this is not
"delete `bg-lcars-panel`" - it is a question about which black each level
uses, and it is the decision most likely to be expensive.

### 3. Drawn strokes as the selection vocabulary - 16 places, 9 files

`ring-*` and `border-t` are how the app currently says "this one is
selected", "this one is being previewed" and "a section ends here":

| where | what it draws |
| --- | --- |
| `StarMap.tsx` x2 | `ring-2 ring-lcars-teal`, `ring-2 ring-lcars-ice` |
| `StarManifestPanel.tsx` x2 | `ring-2 ring-lcars-ice ring-offset-2` |
| `LogPanel.tsx` | `ring-2 ring-lcars-amber` on the previewed entry |
| `RankLadderModal.tsx` x2 | `ring-1` on the current rank and on relieved |
| `ProfilePanel.tsx` x4 | two `border-t border-white/10`, two `ring-1` |
| `RingScanPanel.tsx`, `TargetedScanPrototype.tsx` | `ring-1` on the active target |
| `PrototypesPanel.tsx` x2, `WelcomePanel.tsx` | `border-t border-white/10` |

The rule is absolute in the notes: no borders or strokes are ever drawn,
separation is black grout and touching blocks. And the references show
exactly what to use instead, which is the part that makes this fixable rather
than merely wrong:

- **For selection, swap two things at once.** `Lcars menu`'s selected row
  changes its lamp from filled to hollow *and* its text from lilac to amber.
  Nothing is outlined, nothing moves.
- **Or bulge an indicator.** Which `NavRail` already does - a half-circle
  pushing out toward the content. It is the house-correct selection pattern
  and it is used in exactly one place.
- **For separation, use a gap or a bar**, not a hairline. `border-t
  border-white/10` is a web rule; the LCARS equivalent is black space or a
  short coloured segment.

The two form fields (`ProfilePanel`, `StarManifestPanel`) are a separate
case - `ring-1` there is a focus affordance, and `globals.css` already argues
for `outline` over `ring` on layout grounds. Worth keeping the affordance and
changing the mechanism.

### 4. Every button centres its text

`LcarsButton`'s base class list contains `justify-center`. That is every
button in the app.

The notes have said "text hugs one edge of its pill rather than being
centred" since the first analysis, and it has never been applied to a
control. The third reference right-aligns without exception - `01`, `02`,
`ESC`, `J-001`, `AA-1524`, and the numbers in every rail cell. The first
reference left-aligns its pills. Neither centres anything.

This is the cheapest visual change with the largest reach, and it must be a
prop with a default rather than a global find-and-replace, because a handful
of places (the sub-run tabs, the phone hub) may genuinely want centring and
should have to say so.

### 5. The wrong default orientation

`LcarsButton` defaults to `orientation="vertical"`, which makes the default
meaning of `cap-start` **`rounded-t-full`** - a rounded top edge on a
vertical run, which is the one shape no reference contains anywhere.

Every real call site passes `orientation="horizontal"` explicitly. The only
code taking the default is `LcarsKitPrototype`'s "Vertical run" specimen -
which is precisely the specimen already known to be wrong. **The default is
the bug.** Flipping it to `"horizontal"` is a two-line change that makes the
easy path the correct one.

### 6. The palette is hotter than any reference, and our red is the wrong red

Sampled from the images rather than named by eye:

| ours | nearest reference | note |
| --- | --- | --- |
| `--lcars-orange #ff9900` | `#EE7F31`, `#F58C3A` | ours is fully saturated |
| `--lcars-violet #9999ff` | `#7A87F7` | close |
| `--lcars-red #cc6666` | `#CC504A` | **this is the structural brick red** |
| `--lcars-salmon #ff9c7a` | `#F3AE95` | ours is hotter |
| `--lcars-teal #66ccbb` | absent | in no reference image |

The red is the interesting one. `#cc6666` is a desaturated brick - which in
the third reference is the **most-used colour after black**, carrying whole
rails as structure. The scarce, alarm-carrying red there is `#EA3E25`,
saturated, at 0.6% of the image. So the app enforces scarcity on a colour
that does not need it, and has no true alarm colour at all. Adding one and
letting `red` relax is closer to the source than the current rule.

`teal` appears in no reference. That is deliberate and documented - it is the
tutorial's voice, deliberately outside the game's palette - and should stay.

### 7. Vocabulary we simply do not have

Present in the references, absent from the app. These are additions rather
than corrections, and they are where the look would actually change:

- **The sweep that becomes a row of buttons.** A trunk turning a large radius
  into a thinner arm that continues as coloured cells. We have no elbows at
  all; the closest thing is the header's `rounded-tl-[2rem]`.
- **Corner brackets** around an instrument - four elbows, sides left open.
  The Star Map and both scopes are the obvious homes.
- **The lamp-headed directory row** - a large filled circle, two lines of
  text, a number pill on the right. The Star Manifest and the Log are lists
  of exactly this shape.
- **Corner numerals** - a small number tucked in the corner of a block
  (`451`, `927`, `2247`). Pure texture, and cheap.
- **Vertical rails with varying cell heights and bottom-right labels** -
  backlog item 12.

## The two gating decisions, settled 2026-08-06

Both were put to the user before any of phase 3 was designed, because both
could make the app *worse* if guessed at.

### Titles go on a bottom-left shelf

`LcarsPanel`'s caption bar becomes a **solid colour block with the title
resting on its bottom-left**, content on black below it. This is the answer
all three references agree on - `EMERGENCY OVERRIDE`, `MODE SELECT`,
`IMPULSE SYSTEMS`, `POWER DISTRIBUTION` in the first; `AA-1524`,
`03-111968` bottom-*right* in the third, which is the same rule mirrored.

What this costs, and it is the thing to watch: **the block needs real height
to read as a shelf.** A label sitting at the bottom of a 30px bar is still a
caption bar. That height comes out of panel content, and several panels are
already measured to the pixel at 320x568 - the phone hub was fitting "by
nothing" when it was eleven buttons in a run. So the shelf height is a
measurement exercise, not a taste one, and it must be checked at all four
widths before the sweep of 34 call sites, not after.

Open sub-question for when it is built: shelf height probably cannot be one
constant. A full-screen panel can afford a tall shelf; a `shrink-0` picker
strip like the Briefing's Active Assignment cannot. Expect a `size` prop
rather than a number.

### Hybrid - the frame goes at the shell level

The colour moves to a **frame around `main`**, at the shell, and inner
panels stay lighter-than-black containers. Not the full inversion.

This is the right call for a reason already on the record: `MobileMenu`
learned that a nested sub-panel has to be lighter than its page, because
black over black is invisible and the empty space stops reading as
deliberate. Full inversion would have re-fought that everywhere. The hybrid
puts the references' structure where it actually shows - the outer edge of
the screen, which is what you read as "console" - and leaves the inside of
panels alone.

It also means phase 3 is **one structural change at one level** plus a
title sweep, rather than a rebuild of every panel's internals. `AppShell`'s
header already has the beginnings of it: `rounded-tl-[2rem]` on a colour
block beside the title bar is half an elbow, and the frame can grow out of
that rather than being bolted on beside it.

## Every tunable number is a token, not a literal at a call site

Raised by the user 2026-08-06 on the shelf mockup, and it applies to the
whole plan rather than to that one number: **heights and widths we expect to
retune go in a custom property and a class, so one edit moves all of them.**

The reason is specific to what is coming. Several of these numbers cannot be
settled from a desktop mockup - shelf height, the shell frame's thickness,
rail cell heights - and will want adjusting once they are seen on a real
phone. If shelf height is written at 34 call sites, that adjustment is 34
edits and a re-measure; if it is `--lcars-shelf-h` in `globals.css` behind a
`.lcars-shelf` class, it is one.

The pattern is already in the repo and should be followed rather than
invented: `globals.css` holds the `--lcars-*` colour tokens and the
`.lcars-caps` / `.no-scrollbar` / `.tutorial-anchor` classes, and
`lcars-colors.ts` is the single source for fills and cap shapes. New
dimensions join them.

Concretely, for the phases below:

- **Shelf height** - `--lcars-shelf-h` and a taller `--lcars-shelf-h-lg` for
  panels that own a whole screen, applied through `LcarsPanel`'s `size`
  prop. No panel passes a pixel value.
- **Frame thickness** - one token for the shell frame, since it costs width
  on both sides of `main` and will certainly be retuned once seen.
- **Rail cell heights** - a token per size class rather than per rail.
- **What stays a literal**: one-off geometry that is not part of a set. A
  token that is used once is worse than a number, because it implies a system
  that is not there.

`LcarsButton`'s existing `SIZE` record is the model - padding is a prop with
named values precisely so callers cannot pass their own and have Tailwind
settle the conflict by emission order. Do the same for anything else that
turns out to want tuning.

## Phasing

Ordered so that no call site is edited twice, and so the cheap high-reach
changes land before the expensive structural ones.

**Phase 1 - primitives, no call-site churn.** Flip `LcarsButton`'s default
orientation to horizontal (finding 5). Add an `align` prop, default
right-or-left per the decision, with `justify-center` available explicitly
(finding 4). Add the alarm-red token and let `red` relax (finding 6). All of
this is `LcarsButton`, `LcarsSegment` and `lcars-colors.ts`; the visual
change is app-wide but the diff is three files.

**Phase 2 - one selection primitive, then delete the strokes.** Build the
indicator `NavRail` already has as something reusable, plus the lamp-and-text
swap for list rows. Then replace all 16 stroke sites (finding 3). Doing this
before phase 3 means the panels get opened once, for both.

**Phase 3 - panel chrome.** The big one, and the one that makes the app look
different. Two independent pieces, and they should ship as two commits:

- **3a, the shell frame.** Grow a colour frame around `main` out of the
  header's existing `rounded-tl-[2rem]` block. Touches `AppShell` and
  `LcarsShell` only; no panel changes. Measure at 320/390/768/1280 first -
  the frame costs width on both sides and `main` is only ~452px at 1280
  before it takes any.
- **3b, the title shelf.** Rework `LcarsPanel`'s title into a bottom-left
  shelf with a `size` prop, then sweep the 34 call sites. Measure the shelf
  height against the panels that are already tight before the sweep, not
  after.

**Phase 4 - vertical rails.** Backlog item 12, done together with the
`LcarsKitPrototype` conversation, since one specimen has to change with it.

**Phase 5 - new vocabulary, opt-in and per-panel.** Sweeps, brackets, lamp
rows, corner numerals (finding 7). Not a sweep-the-codebase phase; each one
gets applied where it earns its place, and each gets a specimen in the kit
before it gets a call site.

## Keeping it consistent afterwards

The plan above closes today's gaps. It does not stop new ones, and the
history of this repo says they arrive quietly - `ring-2` is easy to reach for
at 11pm.

Propose `scripts/check-lcars-style.ts`, alongside the five `check-*.ts`
scripts already in `scripts/`, failing on the mechanical rules only:

- no `ring-*`, `border-*`, `shadow-*` or `gradient` utilities in
  `src/components/**` outside an allowlist of documented exemptions
  (`RelativeDistanceScope.module.css` and `RingScope`'s filter are depicted
  *instruments*, which is the same exemption `QuasarStar` already has)
- no `rounded-t-full` / `rounded-b-full` anywhere - the vertical cap that no
  reference contains
- `.lcars-caps` on anything using a `text-lcars-*` colour at heading sizes

Only the mechanical ones. A checker that tried to judge whether a run is
"siblings" would be wrong often enough to be ignored, and an ignored check is
worse than none.

## Deliberately not changing

- **`teal` outside the palette.** The tutorial's voice, on purpose.
- **`outline` for focus** (`globals.css`) - chosen over `ring` because
  outline does not participate in layout, and the shell never scrolls, so a
  focus ring that nudged layout could push content out of a panel that
  exactly fits. Better reasoning than the style rule it bends.
- **The scopes' CSS gradients** - `RelativeDistanceScope.module.css` draws a
  depicted instrument screen, covered by the `QuasarStar` exemption.
- **Terse two/three-letter labels for nav.** Already recorded as not adopted;
  it would hurt usability for panel names.
