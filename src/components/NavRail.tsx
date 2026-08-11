"use client";

import { ButtonColor, SOLID_BG } from "@/lib/lcars-colors";
import { LcarsButton } from "@/components/LcarsButton";
import { LcarsSegment } from "@/components/LcarsSegment";

export interface NavItem {
  id: string;
  label: string;
  color: ButtonColor;
}

/**
 * A vertical rail of touching, left-or-right-capped segments (real nav
 * buttons, optionally padded out with unlabeled decorative fillers), where
 * the selected item is marked by a half-circle bulging out toward the main
 * content rather than by any change to the button's own fill.
 */
export function NavRail({
  items,
  fillerColors = [],
  activeId,
  onSelect,
  indicatorSide,
  className = "",
  id,
}: {
  items: NavItem[];
  fillerColors?: ButtonColor[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Which side of the rail faces the main content - that's the side the selection indicator bulges toward. */
  indicatorSide: "left" | "right";
  className?: string;
  id?: string;
}) {
  // Buttons sit at their natural size; the *fillers* absorb whatever height
  // is left over.
  //
  // Until 2026-08-06 a rail with fillers stretched every row evenly, which
  // made the primary rail's nine buttons roughly twice the height of the
  // utility rail's four, for no reason other than that one had fillers and
  // the other did not. The user preferred the short ones, and the
  // references agree: a vertical run there is a few big unlabelled blocks
  // and a set of small labelled ones, not one uniform division of the
  // available space. The fillers still do the job they were added for -
  // the rail reads as a solid edge rather than as buttons floating over
  // black - they just do it with their own height instead of everyone's.
  const hasFillers = fillerColors.length > 0;

  // The indicator bulges toward the main content; the button's own rounded
  // cap goes on the opposite (outer) edge of the rail.
  const outerShape = indicatorSide === "right" ? "cap-start" : "cap-end";

  return (
    <div id={id} className={`flex flex-col gap-1 ${className}`}>
      {items.map((item) => (
        <Row key={item.id} color={item.color} selected={activeId === item.id} indicatorSide={indicatorSide} stretch={false}>
          <LcarsButton
            color={item.color}
            shape={outerShape}
            orientation="horizontal"
            onClick={() => onSelect(item.id)}
            /* Bottom-weighted, which is what the references do with a
               labelled cell in a run - measured at 52 above to 27 below in
               `lcars-ultra`. It is the last of the differences filed as
               backlog 12. */
            valign="end"
            className="flex-1 h-full"
          >
            {item.label}
          </LcarsButton>
        </Row>
      ))}
      {fillerColors.map((color, i) => (
        <Row
          key={`filler-${i}`}
          color={color}
          selected={false}
          indicatorSide={indicatorSide}
          stretch
          /* Only the first one steps away from the buttons; any further
             fillers stay tight to each other, since they are one mass. */
          className={i === 0 ? "lcars-rail-foot" : ""}
        >
          {/* Square, not capped. A cap is a half-circle of half the box's
              height, which on a 40px button is the LCARS mark and on a
              500px filler is a giant lozenge - which is exactly what it
              rendered as until 2026-08-07.

              The references are unambiguous once the block is tall: the
              big unlabelled masses in `lcars-ultra`'s rails (497px and
              687px) have no rounding at all, while the 40-150px labelled
              cells beside them are capped. The cap belongs to a horizontal
              segment; a tall block is a vertical run, and a vertical run
              never ends in one. */}
          <LcarsSegment color={color} shape="block" orientation="horizontal" className="flex-1 h-full" />
        </Row>
      ))}
      {!hasFillers && <div className="flex-1" />}
    </div>
  );
}

function Row({
  children,
  color,
  selected,
  indicatorSide,
  stretch,
  className = "",
}: {
  children: React.ReactNode;
  color: ButtonColor;
  selected: boolean;
  indicatorSide: "left" | "right";
  stretch: boolean;
  className?: string;
}) {
  const indicatorPositionClass =
    indicatorSide === "right" ? "left-[calc(100%+10px)]" : "right-[calc(100%+10px)]";
  const indicatorRoundingClass = indicatorSide === "right" ? "rounded-r-full" : "rounded-l-full";

  return (
    <div className={`relative flex ${stretch ? "flex-1" : ""} ${className}`}>
      {children}
      <div
        aria-hidden
        className={`absolute top-0 bottom-0 w-[18px] ${indicatorPositionClass} ${indicatorRoundingClass} ${SOLID_BG[color]} ${
          selected ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
