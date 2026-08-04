"use client";

import { runShape } from "@/lib/lcars-colors";
import { LcarsButton } from "@/components/LcarsButton";
import { NavItem } from "@/components/NavRail";

/**
 * The phone landing view: every destination, as a titled block of paired
 * runs.
 *
 * Phones get a hub rather than a persistent nav because eleven labels will
 * not fit across 390px at a readable size, and the style notes forbid
 * scrolling to reach the rest - a nav you have to swipe sideways through is
 * the one thing the LCARS shell rules out. Spending a tap to get anywhere
 * buys back the ~58px a strip costs on every single screen, which is most
 * of what the Star Map needed to fit. Each panel carries a Back button home.
 *
 * ## Why this is two columns and no longer stretches
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
 * ## The rows are runs, not a grid of pills
 *
 * Each row of two touches and takes its own caps - `runShape` per row, per
 * the style notes' wrapped-run rule - so a row reads as one bracket rather
 * than as two loose pills. The odd item out at the end gets `runShape(0, 1)`
 * and comes back as a full pill on its own, which is what that rule already
 * says should happen.
 */
/** Must stay in step with the literal `grid-cols-2` below - Tailwind's
 *  scanner only sees class names it can read in the source. */
const COLUMNS = 2;

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
  return (
    <div id={id} className={`flex flex-col h-full ${className}`}>
      {/* The reference image's move: a section title resting at the
          bottom-left of its colour block, the block acting as a shelf. It
          also gives the empty space below something to belong to - without
          a header the grid reads as buttons dropped on a black page. */}
      <div className="bg-lcars-orange rounded-t-xl px-4 pt-5 pb-1.5 shrink-0">
        <span className="lcars-caps text-black font-bold text-sm leading-none">Main Menu</span>
      </div>

      {/* The nested sub-panel, so the run belongs to the header above it
          without a border being drawn. `bg-lcars-panel` rather than a black
          tint: black *is* the page, so a black panel over it is invisible
          and the empty space below the buttons reads as a void rather than
          as room the layout is deliberately leaving. */}
      <div className="flex-1 min-h-0 bg-lcars-panel rounded-b-xl p-2">
        <div className="grid grid-cols-2 gap-x-0 gap-y-1.5 content-start">
          {items.map((item, i) => {
            const rowStart = Math.floor(i / COLUMNS) * COLUMNS;
            const rowLength = Math.min(COLUMNS, items.length - rowStart);
            return (
              <LcarsButton
                key={item.id}
                color={item.color}
                shape={runShape(i - rowStart, rowLength)}
                orientation="horizontal"
                size="compact"
                onClick={() => onSelect(item.id)}
                /* `min-h-11` is the touch floor and is not negotiable; the
                   labels wrap above it rather than the button shrinking to
                   fit them. `text-center` because a wrapped two-line label
                   left-aligned in a pill reads as broken. */
                className="min-h-11 text-xs sm:text-sm text-center leading-tight"
              >
                {item.label}
              </LcarsButton>
            );
          })}
        </div>
      </div>
    </div>
  );
}
