---
name: lcars-design
description: Use before designing, adding or changing ANY user interface in this project - panels, buttons, runs, rails, layout, colour, type, spacing or shape. Loads the LCARS house style, the binding layout rules, and the procedure for reading the reference images.
---

# LCARS design

This project's UI is a Star Trek LCARS console. The look is not decoration -
it is a grammar with rules, and the rules are counter-intuitive often enough
that guessing has repeatedly produced work that had to be rebuilt.

**This skill is a procedure and a pointer, not the knowledge.** The knowledge
is `docs/lcars-style-notes.md`. Do not restate it here; keep this file thin so
the two cannot drift.

## Do this first, before designing anything

1. **Read `docs/lcars-style-notes.md`.** Its "Project rules" section is
   binding; everything above it is read off the reference images and is
   guidance.
2. **Look at every image in `docs/reference/`.** List the directory rather
   than trusting remembered filenames - the user adds new ones. `.webp` and
   `.png` both read directly with the Read tool.
3. **Open the specimen sheet** if you are designing a control:
   `src/components/prototypes/LcarsKitPrototype.tsx`, visible in the app's
   Prototypes panel. Note its header for any specimen currently known to be
   wrong.

Doing this *afterwards*, as a review step, does not work. The cost of
retrofitting a control to house style is the whole control.

## Why the order matters

The notes are prose about images. Three separate passes over the phone jump
bar got the cap orientation backwards from re-reading the rule, and each fix
came from cropping the image and looking. The notes have since been corrected
*by* the images twice. So: **open the sheet before designing a control, and
the images before trusting the sheet.**

## Reading the images closely

Crop with nearest-neighbour so the corner radii stay measurable:

```sh
ffmpeg -v error -y -i docs/reference/<file> \
  -vf "crop=W:H:X:Y,scale=iw*3:ih*3:flags=neighbor" out.png
```

Sample colours rather than naming them by eye - `System.Drawing` from
PowerShell over a 3px grid is what produced the palette tables in the notes.

## Verify geometry numerically

Never eyeball whether a shape lines up. Compute the coordinates in a script,
or measure in the browser (`getBoundingClientRect`, `Range` for text widths,
`scrollWidth - innerWidth` for overflow). Eyeballing SVG geometry in this repo
has produced three wrong "fixes" in a row.

Widths that must be checked for any layout change: **320, 390, 768, 1280**.
320 is the floor the layout claims to support.

## The rules most often got wrong

Detail and evidence for all of these is in the notes - this is a checklist,
not a summary.

- **Rounded is where a run terminates; flat is where it continues.** The
  intuition runs backwards from this.
- **Flat toward the frame, rounded toward the content.**
- **A vertical run never ends in a rounded cap.** It ends flat, or turns a
  corner into a horizontal arm. The half-circle is a horizontal mark.
- **Moving a cap is a flip, not a cut** - a segment that turns to face the
  other way moves its rounded end, it does not lose it.
- **A run is for siblings; adjacency is not siblinghood.** A directory is a
  grid of separately capped pills, not a run.
- **Text hugs one edge of its pill**, consistently within a group. Centring
  is the most un-LCARS thing a control can do.
- **Nothing scrolls to reveal chrome**, at any width. Navigation never
  scrolls, ever. Content may scroll inside its own panel, without a visible
  scrollbar.
- **Colour encodes grouping**, not identity - repetition down a column is the
  signal, not a collision.
- **Black is structural.** Separation is black grout and touching blocks; no
  borders or strokes are ever drawn.
- **Flat fill only** - no gradients, shadows, bevels or glow.

## When you settle something new

Add it to "Project rules" in the notes with its worked example, and record
what the evidence was. If an image contradicts the notes, the image wins and
the bullet gets corrected and dated.
