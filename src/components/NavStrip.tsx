"use client";

import { SOLID_BG, runShape } from "@/lib/lcars-colors";
import { LcarsButton } from "@/components/LcarsButton";
import { NavItem } from "@/components/NavRail";

/**
 * The phone-width counterpart to NavRail: one horizontally-scrollable run
 * of touching, end-capped segments carrying every destination from both
 * desktop rails. The selection indicator bulges downward - toward the main
 * content, which sits below the strip rather than beside it - so the
 * marking convention survives the rotation even though the geometry
 * doesn't.
 *
 * No decorative fillers here. They exist on desktop to make a tall rail
 * read as a solid panel over otherwise empty space; horizontally there is
 * no empty space to fill, and every pixel of width is already spoken for.
 */
export function NavStrip({
  items,
  activeId,
  onSelect,
  className = "",
  id,
}: {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
  id?: string;
}) {
  return (
    // pb reserves the strip's own room for the indicator: overflow-x-auto
    // forces overflow-y to auto as well, so anything hanging past the
    // content box would otherwise be clipped instead of drawn.
    <div
      id={id}
      className={`flex gap-1 shrink-0 overflow-x-auto no-scrollbar pb-[14px] ${className}`}
    >
      {items.map((item, i) => (
        <div key={item.id} className="relative shrink-0 flex">
          <LcarsButton
            color={item.color}
            shape={runShape(i, items.length)}
            orientation="horizontal"
            onClick={() => onSelect(item.id)}
            className="h-11 text-xs whitespace-nowrap"
          >
            {item.label}
          </LcarsButton>
          <div
            aria-hidden
            className={`absolute left-0 right-0 h-[10px] top-[calc(100%+4px)] rounded-b-full ${
              SOLID_BG[item.color]
            } ${activeId === item.id ? "opacity-100" : "opacity-0"}`}
          />
        </div>
      ))}
    </div>
  );
}
