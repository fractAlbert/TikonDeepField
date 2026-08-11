import { ReactNode } from "react";
import {
  ButtonAlign,
  ButtonColor,
  ButtonOrientation,
  ButtonShape,
  ButtonVAlign,
  INTERACTIVE_FILL,
  alignClasses,
  defaultAlign,
  vAlignClasses,
  shapeClasses,
} from "@/lib/lcars-colors";
import { playButtonClick } from "@/lib/sound";

export type { ButtonAlign, ButtonColor, ButtonShape, ButtonOrientation, ButtonVAlign } from "@/lib/lcars-colors";

const base =
  "lcars-caps inline-flex font-semibold tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";

/**
 * Padding is a prop rather than something a caller overrides through
 * `className`: two padding utilities on one element are settled by the
 * order Tailwind happens to emit them in, not by the order they are
 * written, so "just pass px-3" is a coin toss.
 *
 * "compact" is the style notes' sub-run size - tighter padding, one text
 * step down - and exists for runs held in a narrow column. The phone menu
 * hub is the case that forced it: two columns of a 320px screen leave about
 * 116px of usable width, and 24px of that going to horizontal padding is
 * what pushed "Survey New Region" onto three lines.
 */
const SIZE: Record<"default" | "compact", string> = {
  default: "px-6 py-2",
  compact: "px-3 py-1.5",
};

export function LcarsButton({
  children,
  color = "orange",
  onClick,
  disabled,
  type = "button",
  shape = "pill",
  orientation = "horizontal",
  size = "default",
  align,
  valign = "center",
  className = "",
}: {
  children?: ReactNode;
  color?: ButtonColor;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  shape?: ButtonShape;
  orientation?: ButtonOrientation;
  size?: "default" | "compact";
  /**
   * Where the label sits. Omit it and the label hugs the segment's flat
   * end, which is what the references do; pass one only where the shape
   * cannot say what you mean - `center` in particular has to be asked for,
   * since centring is the thing this default exists to stop happening by
   * accident.
   */
  align?: ButtonAlign;
  /** Vertical placement of the label. See `vAlignClasses`. */
  valign?: ButtonVAlign;
  className?: string;
}) {
  const resolvedAlign = align ?? defaultAlign(shape, orientation);

  return (
    <button
      type={type}
      onClick={() => {
        playButtonClick();
        onClick?.();
      }}
      disabled={disabled}
      className={`${base} ${SIZE[size]} ${alignClasses(resolvedAlign)} ${vAlignClasses(valign)} ${shapeClasses(shape, orientation)} ${INTERACTIVE_FILL[color]} ${className}`}
    >
      {children}
    </button>
  );
}
