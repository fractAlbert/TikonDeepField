// A signature's *shape*, as a second identity channel alongside its colour.
//
// Adopted 2026-08-03 from the Marker Identity Trial in the Prototypes panel,
// which put six candidates side by side; four shipped. The two that didn't
// were Six-spike and Four-spike-rotated, both of which separate from the
// four-spike only by counting arms or reading their angle - real
// differences on a swatch, invisible at 4px on a dial.
//
// Two constraints from the trial carry over and must not be relaxed:
//
// **It has to look like a sky.** Diamonds, triangles and squares are more
// legible than any of this and are deliberately absent: they turn the dial
// into a chart of shapes. Every variant below is a way an actual point
// source differs through an actual instrument - how tight the core is, how
// far the bloom spreads, whether the optics throw diffraction spikes.
//
// **It cannot key off type.** `region.solution[q.id].type` is secret until
// a region closes, so drawing Binary-Class as a double would hand over the
// answer. Glyphs are assigned by the signature's position in the region's
// quasar list, exactly like colour, and say nothing about what the thing is.
//
// Unlike colour there is no player override, so this is a pure function of
// the index rather than a store. That is also why it is safe as a prop
// where colour was not (see the note in `quasar-colors.ts` about a colour
// that changes everywhere except the Sweep Scope): a caller that has the
// index can always derive it, and TypeScript makes the prop required at
// every call site so it cannot be quietly forgotten in one of them.

export type QuasarGlyph = "pinpoint" | "bloom" | "spike4" | "ringed";

/**
 * Assignment order. Adjacent indices always differ, which is what matters:
 * the palette's hardest pairs to tell apart sit a few places apart in
 * `QUASAR_HEX` (cyan/sky blue, yellow/orange), so they never collide here.
 *
 * Four glyphs against 6-8 signatures means the shape does repeat within a
 * region - the pair (colour, shape) is what separates two signatures, not
 * the shape alone. That is the same bargain the reference image makes with
 * colour, where repetition down a column is the grouping signal rather than
 * a collision to avoid.
 */
const GLYPH_ORDER: QuasarGlyph[] = ["pinpoint", "bloom", "spike4", "ringed"];

export function quasarGlyph(index: number): QuasarGlyph {
  return GLYPH_ORDER[index % GLYPH_ORDER.length];
}

/** Display names, for the legend in the Star Manifest and for the trial. */
export const GLYPH_NAMES: Record<QuasarGlyph, string> = {
  pinpoint: "Pinpoint",
  bloom: "Bloom",
  spike4: "Four-spike",
  ringed: "Ringed",
};
