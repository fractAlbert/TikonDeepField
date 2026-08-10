"use client";

import { LcarsButton } from "@/components/LcarsButton";
import { LcarsSegment } from "@/components/LcarsSegment";
import { NavItem } from "@/components/NavRail";
import { OutpostLogo } from "@/components/OutpostLogo";
import { OUTPOST_NAME } from "@/lib/copy";

/**
 * The phone landing view: every destination, as a titled block of separate
 * pills.
 *
 * Phones get a hub rather than a persistent nav because eleven labels will
 * not fit across 390px at a readable size, and the style notes forbid
 * scrolling to reach the rest - a nav you have to swipe sideways through is
 * the one thing the LCARS shell rules out. Spending a tap to get anywhere
 * buys back the ~58px a strip costs on every single screen, which is most
 * of what the Star Map needed to fit. Each panel carries a Back button home.
 *
 * ## Three columns, a blank, and the emblem (2026-08-07)
 *
 * Two columns made every button ~170px wide against a label of six or seven
 * characters, so each one was mostly empty pill with the text pinned to one
 * end - which is what the align default does to a cell far wider than its
 * word. Three columns fixes the proportion at the cost of the labels
 * wrapping, and the wrap is cheaper than it sounds: at `min-h-14` the grid
 * is four rows of 56px where two columns were six rows of 44px, so the
 * denser layout is *shorter* by about 50px.
 *
 * That reclaimed space plus the space already going spare is the emblem's,
 * which is what the room at the bottom of this screen is now for.
 *
 * ## Why this is not two columns and no longer stretches
 *
 * It was one vertical run with every button on `flex-1`, which is the
 * desktop rail's idiom - its filler segments stretch so the rail reads as a
 * solid edge. The rail earns that by being permanent chrome at the edge of
 * a busy screen; a landing page does not. Blown up to a ninth of an 844px
 * screen each, the buttons read as fat and crude rather than as a system,
 * and by the time Station made it eleven the run was *full*: measured on a
 * cold load at 320x568, every button landed at exactly 44px - the `min-h-11`
 * touch floor, with nothing left over. It fitted, and it fitted by nothing.
 *
 * So the buttons are small and the leftover space is simply left empty,
 * which is the one screen in the app that can afford to. Six rows of two at
 * the touch floor is about 300px of a 568px screen, so a twelfth
 * destination now costs one row rather than the whole layout.
 *
 * ## Every button is its own pill (changed 2026-08-05)
 *
 * The rows used to be touching runs with per-row caps, on the reasoning that
 * a run reads as one bracket rather than as two loose pills. That is the
 * right rule for a *run* - a set of siblings you read as a group - and these
 * are not siblings. Briefing and Star Map are unrelated destinations that
 * happen to be adjacent, and joining them said they belonged together.
 *
 * Separate pills in a gapped grid is not a departure from the reference
 * image either: its lower-left blocks are exactly that, grids of individually
 * capped pills with black grout between them. Runs are for things that
 * continue into each other; this is a directory.
 */
export function MobileMenu({
  groups,
  onSelect,
  className = "",
  id,
}: {
  /** Two groups of six, drawn as two runs with a sweep between them. */
  groups: NavItem[][];
  onSelect: (id: string) => void;
  className?: string;
  id?: string;
}) {
  // Each group is drawn as six slots, so a group of five carries one blank.
  // It lands last, which leaves the entry that *starts* a survey - the only
  // one here that does something rather than going somewhere - sitting
  // beside a gap rather than beside another destination.
  const pad = (group: NavItem[]): (NavItem | null)[] => [
    ...group,
    ...Array.from({ length: Math.max(0, 6 - group.length) }, () => null),
  ];

  return (
    /* The S-swoop. Across the top, down the left to halfway, across to the
       right, then straight down and off the bottom - the bottom of the S is
       deliberately missing. The crossing is what separates the two groups of
       buttons, so the frame does the dividing instead of a rule drawn
       between them, which is the whole point of the shape.

       The panel colour is on the container and the orange sits over it, so
       every inner corner curves into one known background. */
    <div
      id={id}
      className={`flex flex-col h-full bg-lcars-panel overflow-hidden rounded-tl-[var(--lcars-hub-outer-r)] rounded-tr-xl rounded-b-xl ${className}`}
    >
      {/* The top of the S, and still the hub's title shelf. */}
      <div className="relative bg-lcars-orange lcars-shelf px-4 shrink-0">
        <span className="lcars-caps text-black font-bold text-sm leading-none">Main Menu</span>
        <div
          aria-hidden
          className="lcars-elbow-notch top-full left-[var(--lcars-hub-leg-w)] [--lcars-notch-bg:var(--lcars-panel)] [--lcars-elbow-inner-r:0.5rem]"
        />
      </div>

      {/* Upper pocket: the left leg, and the first six. `shrink-0` so it
          hugs its buttons - anything taller and the crossing drifts away
          from the group it is dividing. */}
      <div className="flex shrink-0">
        <div aria-hidden className="w-[var(--lcars-hub-leg-w)] shrink-0 bg-lcars-orange" />
        <HubPocket slots={pad(groups[0] ?? [])} onSelect={onSelect} />
      </div>

      {/* The crossing. Its bottom-left is the outer corner of the turn out
          of the left leg; its right end runs on into the leg below without
          a cap, because it continues rather than stops. The two notches are
          the inner corners of those turns, facing opposite ways. */}
      <div
        aria-hidden
        className="relative shrink-0 h-[var(--lcars-hub-cross-h)] bg-lcars-orange rounded-bl-[var(--lcars-hub-turn-r)]"
      >
        <div className="lcars-elbow-notch lcars-notch-bl bottom-full left-[var(--lcars-hub-leg-w)] [--lcars-notch-bg:var(--lcars-panel)] [--lcars-elbow-inner-r:0.5rem]" />
        <div className="lcars-elbow-notch lcars-notch-tr top-full right-[var(--lcars-hub-leg-w)] [--lcars-notch-bg:var(--lcars-panel)] [--lcars-elbow-inner-r:0.5rem]" />
      </div>

      {/* Lower pocket: the second six, then the crest, with the right leg
          running the full height of both and off the bottom edge. */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="shrink-0 flex">
            <HubPocket slots={pad(groups[1] ?? [])} onSelect={onSelect} />
          </div>
          {/* Only where there is room for it to read as a crest rather than
              a smudge - see `.lcars-hub-crest`. */}
          <div className="lcars-hub-crest flex-1 min-h-0 flex-col items-center justify-center gap-2 px-2 pb-2">
            <OutpostLogo
              size={260}
              className="opacity-80 min-h-0 max-h-full w-auto max-w-[min(68%,240px)]"
            />
            <span className="lcars-caps font-bold text-lg text-lcars-amber/90 shrink-0">
              {OUTPOST_NAME}
            </span>
          </div>
        </div>
        <div aria-hidden className="w-[var(--lcars-hub-leg-w)] shrink-0 bg-lcars-orange" />
      </div>
    </div>
  );
}

/** One group of six, in the pocket the swoop leaves for it. */
function HubPocket({
  slots,
  onSelect,
}: {
  slots: (NavItem | null)[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="lcars-hub-grid grid grid-cols-2 gap-1.5 flex-1 min-w-0 content-start p-2">
      {slots.map((slot, i) =>
        slot ? (
          <LcarsButton
            key={slot.id}
            color={slot.color}
            shape="pill"
            orientation="horizontal"
            size="compact"
            onClick={() => onSelect(slot.id)}
            /* Centred, and asked for explicitly. The default hugs the flat
               end, which is right for a rail whose cells are wider than
               their labels; here the cell is barely wider than the word and
               the label often wraps, and the references centre in exactly
               that case - the word cells in `Lcars menu`'s foot grid are
               centred where the numeric cells beside them are not. */
            align="center"
            className="h-full lcars-hub-label text-center leading-tight"
          >
            {slot.label}
          </LcarsButton>
        ) : (
          /* The deliberate gap, at full strength rather than dimmed: a
             tinted cell reads as a disabled button, a solid one as a piece
             of the panel. Ice because it touches nothing around it. */
          <LcarsSegment
            key={`blank-${i}`}
            color="ice"
            shape="pill"
            orientation="horizontal"
            className="h-full"
          />
        )
      )}
    </div>
  );
}
