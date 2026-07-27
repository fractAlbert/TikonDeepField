import {
  ButtonColor,
  ButtonOrientation,
  ButtonShape,
  shapeClasses,
  SOLID_BG,
} from "@/lib/lcars-colors";

/**
 * A decorative, non-interactive panel segment - same shape/color as a real
 * LcarsButton but rendered as a plain block: no button semantics, no
 * pointer/disabled cursor, no hover state. Used to fill out a rail with
 * unlabeled placeholder segments that aren't wired to anything yet.
 */
export function LcarsSegment({
  color,
  shape = "pill",
  orientation = "vertical",
  className = "",
}: {
  color: ButtonColor;
  shape?: ButtonShape;
  orientation?: ButtonOrientation;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`${SOLID_BG[color]} ${shapeClasses(shape, orientation)} ${className}`}
    />
  );
}
