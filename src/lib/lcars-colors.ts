// Single source of truth for LCARS button/segment colors and the
// touching-run corner-cap shapes, shared by interactive buttons and plain
// (non-interactive) decorative segments so they render identically apart
// from behavior.

// "red" is kept scarce by design - real LCARS reserves it for alert/critical
// states, not routine navigation, so it's deliberately not in BUTTON_COLORS
// below and only ever applied directly (Reset, incorrect-verify, ruled-out).
export type ButtonColor = "orange" | "amber" | "violet" | "red" | "salmon" | "ice" | "teal" | "lilac";

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
