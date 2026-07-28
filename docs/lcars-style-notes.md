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
- No-scroll viewport shell - page never scrolls; any panel that could
  overflow falls back to a hidden-scrollbar flick-scroll instead of a
  visible scrollbar; the Survey Log specifically uses pagination

Not adopted (deliberately):
- Terse two/three-letter code labeling convention for nav - would hurt
  usability for panel names, though quasar designations (e.g. "PKS 753")
  already follow this convention naturally
