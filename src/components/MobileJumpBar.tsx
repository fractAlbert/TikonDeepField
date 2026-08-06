"use client";

import { ButtonColor, SOLID_BG } from "@/lib/lcars-colors";
import { LcarsButton } from "@/components/LcarsButton";

/**
 * The one-tap hop between an instrument and the Star Map, on a phone.
 *
 * ## Why it exists
 *
 * Solving a region is a loop: read a bearing on the Sweep Scope or the Ring
 * Scan, go put a marker down, come back. On a desktop that costs nothing -
 * the map is a permanent sidebar next to whatever you are reading. On a
 * phone the hub made it three taps each way (Back, Star Map, then Back, then
 * the instrument again), which is the same navigation cost as visiting a
 * page you rarely open, for the thing you do most.
 *
 * So the four survey panels get a Star Map button, and the Star Map gets one
 * back to wherever you came from - the same slot, the same size, on all
 * five, so it stops being a thing you look for.
 *
 * ## Why the bottom, and not the panel bar at the top
 *
 * The obvious home was `MobilePanelBar`, which is already the fixed spot on
 * every phone panel and would have cost no height at all. It does not fit:
 * that bar carries the panel's *title*, which with no nav on screen is the
 * only thing saying where you are, and a third element squeezes it to a
 * truncated stub at 390px. Ergonomics agree with the measurement - this is
 * pressed dozens of times a survey, and the top-right corner is the hardest
 * place on a phone to reach with a thumb.
 *
 * Structurally it is the same move as the panel bar, mirrored: a `shrink-0`
 * sibling of `main` rather than anything inside it. `main` stays the only
 * scroller, so this never scrolls away - the standing rule is that chrome is
 * never something you scroll to reveal.
 *
 * ## Which end is round (rewritten 2026-08-05)
 *
 * The first build put the button on the left with its flat edge facing
 * right, into a `bg-lcars-panel` filler. It looked wrong, and the reason is
 * worth writing down because the shape rule alone does not catch it.
 *
 * Read the reference image's data rows closely (`docs/reference/LCARS-2.jpg`,
 * the centre columns). Each row opens with a narrow colour-coded stub that
 * is **rounded on its outer end and flat on its inner one**, then a label
 * flat at both ends, then a number, then a label flat on the inside and
 * rounded where the row stops. So rounded is where a run *terminates*, flat
 * is where it *continues* - and the black gaps do not break that, since flat
 * ends face each other across grout all through the image.
 *
 * By that rule the original shape was correct and the composition still
 * failed, because the block its flat edge was flat *against* was a near-black
 * tint on a black page. The cut had nothing visible to be cut against, so
 * the button read as a pill with its end amputated. A flat edge is a promise
 * that something continues; you have to be able to see the something.
 *
 * Hence: the button moved to the right, where it takes the run's rounded
 * outer cap and turns its flat edge inward, and the dark filler was replaced
 * by the reference's own row-opener - a narrow stub, solid colour, no text.
 * Small matters. A wide slab of colour across the foot of every panel is
 * loud, and the stub is what the image actually does.
 *
 * ## Why two colours
 *
 * The stub carries the colour of the panel you are **on**; the button
 * carries the colour of the panel you are going **to**, and its label names
 * it. So the bar reads as a trip - violet to amber leaving the Sweep Scope,
 * amber to violet coming back - rather than as a lone button with a
 * decorative lamp beside it. Worth being deliberate about, because a small
 * shape sitting against a button reads as *state* if you let it, and this
 * one is carrying information rather than pretending to.
 */
export function MobileJumpBar({
  label,
  color,
  fromColor,
  onSelect,
  id,
}: {
  label: string;
  color: ButtonColor;
  fromColor: ButtonColor;
  onSelect: () => void;
  id?: string;
}) {
  return (
    <div id={id} className="flex items-stretch gap-1 shrink-0">
      {/* The reference's index tab: narrow, colour-coded, carries no text,
          and takes the rounded cap at the run's outer edge. */}
      <div className={`w-10 shrink-0 rounded-l-full ${SOLID_BG[fromColor]}`} />
      <LcarsButton
        color={color}
        shape="cap-end"
        orientation="horizontal"
        onClick={onSelect}
        /* Everything the stub leaves, which is a deliberately oversized
           target: the whole point is that this is hit repeatedly,
           mid-puzzle, one-handed. */
        className="flex-1 min-w-0 min-h-11 text-sm"
      >
        {label}
      </LcarsButton>
    </div>
  );
}
