// Single source of truth for LCARS button/segment colors and the
// touching-run corner-cap shapes, shared by interactive buttons and plain
// (non-interactive) decorative segments so they render identically apart
// from behavior.

// Two reds, and the distinction is load-bearing (2026-08-06). Sampling the
// reference images rather than naming the colours by eye showed that the
// desaturated brick red is the *most-used* colour after black in
// `lcars-ultra-220809.png`, carrying whole rails as structure, while the
// scarce alarm red is a saturated one appearing on 0.6% of the image.
//
// So `red` (#cc6666) is the brick: it is the category colour for a bad
// outcome - retracted filings, relieved of duty, a wrong answer - and it is
// used freely in that role. `alert` (#ee3b22) is the saturated one, kept for
// something genuinely urgent and irreversible. Neither is in BUTTON_COLORS,
// because neither is a colour you hand out by rotation.
export type ButtonColor =
  | "orange"
  | "amber"
  | "violet"
  | "red"
  | "alert"
  | "salmon"
  | "ice"
  | "teal"
  | "lilac";

export const BUTTON_COLORS: ButtonColor[] = [
  "orange",
  "amber",
  "violet",
  "salmon",
  "ice",
  "teal",
  "lilac",
];

// Plain fill, no hover - used for non-interactive decorative segments.
export const SOLID_BG: Record<ButtonColor, string> = {
  orange: "bg-lcars-orange",
  amber: "bg-lcars-amber",
  violet: "bg-lcars-violet",
  red: "bg-lcars-red",
  alert: "bg-lcars-alert",
  salmon: "bg-lcars-salmon",
  ice: "bg-lcars-ice",
  teal: "bg-lcars-teal",
  lilac: "bg-lcars-lilac",
};

// Fill + hover state - used for real interactive buttons.
export const INTERACTIVE_FILL: Record<ButtonColor, string> = {
  orange: "bg-lcars-orange hover:bg-lcars-amber text-black",
  amber: "bg-lcars-amber hover:bg-lcars-orange text-black",
  violet: "bg-lcars-violet hover:bg-lcars-lilac text-black",
  red: "bg-lcars-red hover:bg-lcars-salmon text-black",
  alert: "bg-lcars-alert hover:bg-lcars-red text-black",
  salmon: "bg-lcars-salmon hover:bg-lcars-orange text-black",
  ice: "bg-lcars-ice hover:bg-white text-black",
  teal: "bg-lcars-teal hover:bg-lcars-ice text-black",
  lilac: "bg-lcars-lilac hover:bg-lcars-violet text-black",
};

/**
 * LCARS panel segments are either a standalone pill, or part of a touching
 * run - in a run, only the outer end is rounded; joints between segments
 * are cut flat. `orientation` picks which pair of ends "start"/"end" refer
 * to: vertical -> top/bottom, horizontal -> left/right.
 *
 * **`horizontal` is the default**, changed 2026-08-06. It used to be
 * `vertical`, which made the default meaning of `cap-start`
 * `rounded-t-full` - a rounded top on a vertical run, which is the one shape
 * no reference image contains anywhere. Every real call site was already
 * overriding it; the only code taking the default was the specimen that had
 * the shape wrong. The default was the bug.
 */
export type ButtonShape = "pill" | "cap-start" | "cap-end" | "block";
export type ButtonOrientation = "vertical" | "horizontal";

// Written out as full literal class names (not template-built) so
// Tailwind's content scanner can actually find and generate them.
const SHAPE_CLASSES: Record<ButtonOrientation, Record<ButtonShape, string>> = {
  vertical: {
    pill: "rounded-full",
    "cap-start": "rounded-t-full",
    "cap-end": "rounded-b-full",
    block: "rounded-none",
  },
  horizontal: {
    pill: "rounded-full",
    "cap-start": "rounded-l-full",
    "cap-end": "rounded-r-full",
    block: "rounded-none",
  },
};

export function shapeClasses(shape: ButtonShape, orientation: ButtonOrientation): string {
  return SHAPE_CLASSES[orientation][shape];
}

/** First/last item in a touching run get one rounded outer cap; everything between is cut flat. */
export function runShape(index: number, length: number): ButtonShape {
  if (length === 1) return "pill";
  if (index === 0) return "cap-start";
  if (index === length - 1) return "cap-end";
  return "block";
}

/**
 * Where a label sits along its segment.
 *
 * The style notes have said since the first analysis that text hugs one edge
 * of its pill rather than being centred, and until 2026-08-06 no control in
 * this project did. Centring is the most un-LCARS thing a button can do: it
 * is what makes a run read as a row of web buttons rather than as a readout.
 */
export type ButtonAlign = "start" | "end" | "center";

// Applied to the button's own flex row, so these are horizontal regardless
// of `orientation` - which only decides which pair of corners get rounded.
const ALIGN_CLASSES: Record<ButtonAlign, string> = {
  start: "justify-start",
  end: "justify-end",
  center: "justify-center",
};

export function alignClasses(align: ButtonAlign): string {
  return ALIGN_CLASSES[align];
}

/**
 * **Text hugs the flat end** - the end the segment continues into, rather
 * than the rounded end where it stops.
 *
 * Both new reference images agree on this, and it falls out of the cap rule
 * rather than being a second thing to remember: a segment rounded on its
 * left (`cap-start`) is flat on its right, and its label sits right. The
 * Food Service left column and `lcars-ultra`'s left grid are the same shape
 * with the same alignment. `LCARS-2`'s closing pills mirror it.
 *
 * `pill` and `block` have no flat/rounded asymmetry to read, so they take
 * the majority answer: every free-standing pill in `lcars-ultra` (`01`,
 * `02`, `ESC`) and every unrounded grid cell right-aligns.
 */
export function defaultAlign(shape: ButtonShape, orientation: ButtonOrientation): ButtonAlign {
  // A vertical run's caps are top and bottom, so they say nothing about
  // where the text goes across the segment.
  if (orientation === "horizontal" && shape === "cap-end") return "start";
  return "end";
}
