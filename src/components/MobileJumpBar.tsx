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
 * ## Half a width, which half, and off the edge (2026-08-06)
 *
 * The run is half the *viewport* wide and pushed flush against one outer
 * edge, and which edge is the direction of travel: leaving an instrument it
 * sits on the right, on the Star Map it mirrors, so the way back sits on the
 * left. Leaning the way you are going is the one thing a two-stop shuttle
 * can say for free. The empty half is not wasted space; it is the gap the
 * reference leaves between a run and whatever is not next to it.
 *
 * Every segment is now **rounded on its inner side and flat on the side
 * facing the glass**, and the run touches the glass - the one place in the
 * app, along with the panel bar, that breaks the shell's 12px gutter, and
 * deliberately. It is the same rule as above followed one step further:
 * flat means the run continues, and here what it continues into is
 * off-screen. That only reads if it actually reaches the screen edge - flat
 * with a strip of black beyond it is the amputated look this bar had on its
 * first build. So the caps did not disappear, they changed ends, and the
 * whole thing reads as a strip running in from off-frame.
 *
 * Half the viewport rather than half the panel because the run has to line
 * up with the screen, not with the gutter: `w-[50vw]` plus a negative outer
 * margin lands it on 195-390 of a 390px phone exactly.
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
  side,
  onSelect,
  id,
}: {
  label: string;
  color: ButtonColor;
  fromColor: ButtonColor;
  /** Which outer edge the run is flush against - see "Half a width". */
  side: "left" | "right";
  onSelect: () => void;
  id?: string;
}) {
  const onRight = side === "right";

  // The reference's index tab: narrow, colour-coded, carries no text, and
  // takes the run's one rounded cap - which is at the *inner* end now, the
  // end that actually stops - so it swaps sides along with everything else.
  const stub = (
    <div
      key="stub"
      className={`w-10 shrink-0 ${onRight ? "rounded-l-full" : "rounded-r-full"} ${SOLID_BG[fromColor]}`}
    />
  );

  const button = (
    <LcarsButton
      key="button"
      color={color}
      /* Flipped rather than squared off. The cap did not disappear, it
         changed ends: rounded on the inner side, flat on the side facing
         the glass, same as the stub beside it. */
      shape={onRight ? "cap-start" : "cap-end"}
      orientation="horizontal"
      onClick={onSelect}
      /* Half a bar leaves 151px at 390 and 116px at 320, and the widest
         label ("Star Manifest") measures 80px - so the default padding is
         what breaks it, not the type. Compact padding plus `nowrap` keeps
         it to one line at 320 too, and looks identical at 390 because the
         label is centred with room to spare either way. Two lines here
         would be worse than tight: the bar is `shrink-0`, so every pixel
         it grows comes off the panel above it. */
      size="compact"
      className="flex-1 min-w-0 min-h-11 text-sm whitespace-nowrap"
    >
      {label}
    </LcarsButton>
  );

  return (
    // The negative margin cancels the shell's gutter on this one side only,
    // so the flat end lands on the glass. It has to track the shell's own
    // padding (`p-3 md:p-6`); the bar only exists below `lg`, so those are
    // the only two values it can meet.
    <div
      id={id}
      className={`flex shrink-0 ${
        onRight ? "justify-end -mr-3 md:-mr-6" : "justify-start -ml-3 md:-ml-6"
      }`}
    >
      <div className="flex items-stretch gap-1 w-[50vw] min-w-0">
        {onRight ? [stub, button] : [button, stub]}
      </div>
    </div>
  );
}
