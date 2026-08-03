"use client";

import { useId } from "react";

/**
 * A signature, drawn the one way it is drawn anywhere.
 *
 * Before this, a quasar was eight different pictures: a blurred halo with a
 * solid core on the Star Map, a CSS `boxShadow` glow in the Star Manifest,
 * and a flat `rounded-full` dot in the Log, the Ring Scan, the Star Map's
 * own chip row and both colour pickers. The same object read as a star in
 * one panel and as a bullet point in the next, which made the colour the
 * only thing tying them together - exactly the thing the recolour feature
 * exists because players cannot always tell apart.
 *
 * The geometry is the Star Map marker's, kept in proportion: core radius
 * 3.6 against halo 6.4 is the shipped 4-against-7, and the blur scales with
 * it. So the map did not change; everything else came to meet it.
 *
 * ## Why this glows when the style notes say nothing does
 *
 * `docs/lcars-style-notes.md` is emphatic - zero gradients, shadows or
 * glow, depth only ever from layering. That rule is about *chrome*: the
 * panels, rails and buttons the console is built from, which are flat
 * opaque colour in the reference image because they are physical surface.
 *
 * A signature is not chrome. It is the sky the console is looking at, and
 * the reference image draws its content - the schematics on the right-hand
 * side - as its own thing rather than as more panelling. A star rendered
 * flat would read as a UI bullet, which is precisely the failure being
 * fixed here. The glow is confined to depicted sky and never leaks into a
 * control's own surface.
 */

/** Box side in user units. Only sets padding - see the size math below. */
const BOX = 24;
const CORE_R = 3.6;
const HALO_R = 6.4;
const BLUR = 2.4;

/**
 * Rendered core diameter for a given `size`, in px:
 *   (CORE_R * 2 / BOX) * size  =  0.3 * size
 * So `size={20}` paints a 6px core - close to the flat 8px dots this
 * replaces once the halo around it is counted.
 */
export function quasarStarCorePx(size: number): number {
  return ((CORE_R * 2) / BOX) * size;
}

export function QuasarStar({
  color,
  size = 20,
  className = "",
  title,
}: {
  color: string;
  /** Box side in px. The core paints at 0.3x this. */
  size?: number;
  className?: string;
  title?: string;
}) {
  // Filter ids share a document namespace, and this renders many times per
  // screen - a fixed id would make every star use the first one's colour
  // region and blur.
  const filterId = useId().replace(/:/g, "");

  return (
    <svg
      viewBox={`0 0 ${BOX} ${BOX}`}
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      <defs>
        <filter id={filterId} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation={BLUR} />
        </filter>
      </defs>
      <circle
        cx={BOX / 2}
        cy={BOX / 2}
        r={HALO_R}
        fill={color}
        filter={`url(#${filterId})`}
        opacity={0.85}
      />
      <circle cx={BOX / 2} cy={BOX / 2} r={CORE_R} fill={color} />
    </svg>
  );
}
