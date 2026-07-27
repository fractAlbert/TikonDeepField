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
  "lcars-caps inline-flex items-center justify-center px-6 py-2 font-semibold tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";

export function LcarsButton({
  children,
  color = "orange",
  onClick,
  disabled,
  type = "button",
  shape = "pill",
  orientation = "vertical",
  className = "",
}: {
  children?: ReactNode;
  color?: ButtonColor;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  shape?: ButtonShape;
  orientation?: ButtonOrientation;
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
      className={`${base} ${shapeClasses(shape, orientation)} ${INTERACTIVE_FILL[color]} ${className}`}
    >
      {children}
    </button>
  );
}
