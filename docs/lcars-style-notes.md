# LCARS Style Notes

Analysis of reference image `LCARS-2.jpg`, cataloging the style conventions that define the LCARS (Star Trek) look.

## Structure & Shape

- **Elbow/bracket macro-shapes** — the defining LCARS move: a block starts as a sharp rectangle and sweeps into a fully rounded end where it meets the panel's outer edge. Interior joints between adjacent segments stay flat/square — rounding is reserved for exposed outer edges only.
- **Jigsaw/asymmetric grid** — blocks are not a uniform grid. Widths and heights vary block to block, tiled together with no visible seams other than thin black gaps. Nothing is centered or symmetric as a whole composition.
- **Black as structural material** — pure black isn't just a background, it's the "grout" between every block. No borders/strokes are ever drawn; separation is done entirely by black gaps and touching color blocks.
- **Nested sub-panels** — smaller bordered black rounded-rect containers sit inside the larger overall composition, implying hierarchy/grouping.

## Color

- Muted, desaturated palette — terracotta/salmon, tan-orange, powder blue, dusty mauve, ice blue, blue-gray, occasional pink — nothing fully saturated or glossy. Retro-futuristic rather than "sci-fi neon."
- **Red is scarce and deliberate** — reserved for alert/critical status rather than decoration; appears only once in the reference image.
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

## Project rules

Conventions this project holds itself to, as distinct from observations
about the reference image above.

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

### Below `lg`, navigation is a hub

Phones get a menu of every destination plus a Back button on each panel,
not a persistent rail. Nine labels will not fit across 390px at a readable
size, and the rule above rules out scrolling to reach the rest. The trade is
one extra tap for ~58px back on every screen — which is most of what the
Star Map needed in order to fit. See `docs/mobile-layout-plan.md`.

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

Not adopted (deliberately):
- Terse two/three-letter code labeling convention for nav - would hurt
  usability for panel names, though quasar designations (e.g. "PKS 753")
  already follow this convention naturally
