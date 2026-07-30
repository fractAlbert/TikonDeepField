"use client";

import { runShape } from "@/lib/lcars-colors";
import { LcarsButton } from "@/components/LcarsButton";
import { NavItem } from "@/components/NavRail";

/**
 * The phone landing view: every destination as one touching vertical run.
 *
 * Phones get a hub rather than a persistent nav because nine labels will not
 * fit across 390px at a readable size, and the style notes forbid scrolling
 * to reach the rest - a nav you have to swipe sideways through is the one
 * thing the LCARS shell rules out. Spending a tap to get anywhere buys back
 * the ~58px a strip costs on every single screen, which is most of what the
 * Star Map needed to fit. Each panel carries a Back button home.
 *
 * Buttons stretch to fill the height the way the desktop rail's filler
 * segments do, so the menu reads as one solid LCARS block instead of a
 * short stack of pills floating over empty space.
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
  return (
    <div id={id} className={`flex flex-col gap-1 h-full ${className}`}>
      {items.map((item, i) => (
        <LcarsButton
          key={item.id}
          color={item.color}
          shape={runShape(i, items.length)}
          orientation="vertical"
          onClick={() => onSelect(item.id)}
          className="flex-1 min-h-11 text-sm"
        >
          {item.label}
        </LcarsButton>
      ))}
    </div>
  );
}
