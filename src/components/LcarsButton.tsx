import { ReactNode } from "react";
import {
  ButtonColor,
  ButtonOrientation,
  ButtonShape,
  INTERACTIVE_FILL,
  shapeClasses,
} from "@/lib/lcars-colors";
import { playButtonClick } from "@/lib/sound";

export type { ButtonColor, ButtonShape, ButtonOrientation } from "@/lib/lcars-colors";

const base =
  "lcars-caps inline-flex items-center justify-center font-semibold tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";

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
  orientation = "vertical",
  size = "default",
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
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={() => {
        playButtonClick();
        onClick?.();
      }}
      disabled={disabled}
      className={`${base} ${SIZE[size]} ${shapeClasses(shape, orientation)} ${INTERACTIVE_FILL[color]} ${className}`}
    >
      {children}
    </button>
  );
}
