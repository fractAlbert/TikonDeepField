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
}: {
  items: NavItem[];
  fillerColors?: ButtonColor[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Which side of the rail faces the main content - that's the side the selection indicator bulges toward. */
  indicatorSide: "left" | "right";
  className?: string;
}) {
  // With fillers, every row stretches evenly to fill the rail's full height.
  // Without them, buttons sit at their natural size and the rest of the
  // rail is left empty below.
  const stretch = fillerColors.length > 0;

  // The indicator bulges toward the main content; the button's own rounded
  // cap goes on the opposite (outer) edge of the rail.
  const outerShape = indicatorSide === "right" ? "cap-start" : "cap-end";

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {items.map((item) => (
        <Row key={item.id} color={item.color} selected={activeId === item.id} indicatorSide={indicatorSide} stretch={stretch}>
          <LcarsButton
            color={item.color}
            shape={outerShape}
            orientation="horizontal"
            onClick={() => onSelect(item.id)}
            className="flex-1 h-full"
          >
            {item.label}
          </LcarsButton>
        </Row>
      ))}
      {fillerColors.map((color, i) => (
        <Row key={`filler-${i}`} color={color} selected={false} indicatorSide={indicatorSide} stretch={stretch}>
          <LcarsSegment color={color} shape={outerShape} orientation="horizontal" className="flex-1 h-full" />
        </Row>
      ))}
      {!stretch && <div className="flex-1" />}
    </div>
  );
}

function Row({
  children,
  color,
  selected,
  indicatorSide,
  stretch,
}: {
  children: React.ReactNode;
  color: ButtonColor;
  selected: boolean;
  indicatorSide: "left" | "right";
  stretch: boolean;
}) {
  const indicatorPositionClass =
    indicatorSide === "right" ? "left-[calc(100%+10px)]" : "right-[calc(100%+10px)]";
  const indicatorRoundingClass = indicatorSide === "right" ? "rounded-r-full" : "rounded-l-full";

  return (
    <div className={`relative flex ${stretch ? "flex-1" : ""}`}>
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
