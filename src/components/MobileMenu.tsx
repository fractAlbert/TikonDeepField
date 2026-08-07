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
  items,
  onSelect,
  className = "",
  id,
}: {
  items: NavItem[];
  onSelect: (id: string) => void;
  className?: string;
  id?: string;
}) {
  // Eleven entries into a three-column grid is twelve slots with one over.
  // The spare goes second-to-last, which drops the entry that *starts* a
  // survey into the final cell on its own - the only one here that does
  // something rather than going somewhere.
  //
  // The rest of the order is the nav's, and it groups itself: the first two
  // rows are the survey panels, the third is you and the station, the
  // fourth is the tools and the action.
  const slots: (NavItem | null)[] = [
    ...items.slice(0, -1),
    null,
    ...items.slice(-1),
  ];

  return (
    <div id={id} className={`flex flex-col h-full ${className}`}>
      {/* The shelf, now the shared one rather than a hand-rolled copy of
          it - same device as every panel title, so retuning
          `--lcars-shelf-h` moves this with them. */}
      <div className="bg-lcars-orange rounded-t-xl lcars-shelf px-4 shrink-0">
        <span className="lcars-caps text-black font-bold text-sm leading-none">Main Menu</span>
      </div>

      {/* The nested sub-panel, so the run belongs to the header above it
          without a border being drawn. `bg-lcars-panel` rather than a black
          tint: black *is* the page, so a black panel over it is invisible
          and the empty space below the buttons reads as a void rather than
          as room the layout is deliberately leaving. */}
      <div className="flex-1 min-h-0 bg-lcars-panel rounded-b-xl p-2 flex flex-col gap-2">
        {/* `grow shrink-0`: the grid takes its natural height at 320, where
            there is no slack to give, and grows toward its cap where there
            is. Shrinking would drive the rows under the touch floor. */}
        <div className="lcars-hub-grid grid grid-cols-3 gap-1.5 grow shrink-0">
          {slots.map((slot, i) =>
            slot ? (
              <LcarsButton
                key={slot.id}
                color={slot.color}
                shape="pill"
                orientation="horizontal"
                size="compact"
                onClick={() => onSelect(slot.id)}
                /* Centred, and asked for explicitly. The default hugs the
                   flat end, which is right for a rail whose cells are
                   wider than their labels; here the cell is barely wider
                   than the word and the label often wraps to two lines,
                   and the references centre in exactly that case - the
                   word cells in `Lcars menu`'s foot grid (ORD 3R, COM B6,
                   SUB ST) are centred where the numeric cells beside them
                   are not.

                   Height comes from the grid's rows now rather than from
                   the button, so `h-full` fills whatever the row was
                   given - floored at 56px, which is the touch floor with
                   room for a wrapped label. */
                align="center"
                className="h-full lcars-hub-label text-center leading-tight"
              >
                {slot.label}
              </LcarsButton>
            ) : (
              /* The deliberate gap. `lcars-ultra`'s left grid leaves one
                 cell of six empty and it reads as unassigned rather than
                 as a mistake; here it separates the tools from the one
                 entry that starts work rather than navigating to it.

                 Full strength, not a tint. A dimmed cell reads as a
                 disabled button - something you were meant to be able to
                 press - where a solid one is plainly a piece of the panel,
                 which is what the references do with every unlabelled
                 block. `LcarsSegment` rather than a styled div so it
                 cannot pick up button semantics or a pointer cursor.

                 Ice because it is the one palette colour that touches
                 nothing around it: teal sits to its left, orange to its
                 right and violet directly above. */
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

        {/* The room left over, given something to be. The same emblem the
            no-assignment placeholder uses, so the hub and the empty
            Briefing read as the same station rather than as two screens
            that happen to be dark. Decoration, not a control - Station is
            already a button three rows up, and a second silent route to it
            would be a worse affordance than none.

            `min-h-0` and `max-h-full` so it gives the space back when
            there is none: at 320x568 this is the first thing that should
            shrink, and the grid above it must not move. */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 pb-1">
          {/* The emblem is what takes the space on a tall handset, not the
              buttons. Growing the buttons to fill an 844px screen turns
              pills into tiles and reads as fat; growing this reads as a
              console with a crest on it. So the grid is capped and the
              emblem gets everything left over, bounded only by the width
              of the panel it sits in. */}
          <OutpostLogo
            size={260}
            className="opacity-80 min-h-0 max-h-full w-auto max-w-[min(68%,240px)]"
          />
          <span className="lcars-caps font-bold text-lg text-lcars-amber/90 shrink-0">
            {OUTPOST_NAME}
          </span>
        </div>
      </div>
    </div>
  );
}
