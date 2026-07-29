"use client";

import { useEffect, useState } from "react";

/**
 * A live boolean for a CSS media query, evaluated in JS instead of CSS.
 *
 * This exists because the phone/desktop split has to change *what is
 * mounted*, not merely what's visible. StarMap owns placement state and
 * persists it to localStorage (see `starmap-storage.ts`), so rendering a
 * phone copy and a desktop copy and hiding one with `hidden` would leave
 * two live instances writing the same key - that corrupts placements
 * rather than just wasting work. Exactly one may exist at a time.
 *
 * The server has no viewport to measure, so the first render always
 * reports false and the desktop layout is what hydrates; the effect below
 * then corrects a phone on the very next commit. That initial read has to
 * happen in the effect *body* - `change` only fires on a transition, so a
 * query that already matched at load never notifies, and subscribing alone
 * would leave a phone stuck on the desktop layout indefinitely. (This was
 * tried first with useSyncExternalStore + getServerSnapshot and it failed
 * exactly that way: correct only after the first resize.)
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    // One-time sync from an external source on mount, same shape as the
    // localStorage reads elsewhere. Not optional - see the note above.
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/**
 * Everything below Tailwind's `lg`, expressed to be *exactly* what Tailwind
 * compiles `max-lg:` to (`@media not (min-width: 64rem)`) rather than the
 * usual `max-width: 63.99rem` approximation. The two disagree over a sliver
 * of a pixel, and the layout can't afford it: AppShell leans on `max-lg:`
 * to hide the desktop columns pre-hydration, so a width where CSS says
 * "phone" and this hook says "desktop" would render the rails hidden with
 * no strip to replace them. The `not all and` spelling is the same query in
 * the older syntax every browser accepts.
 */
export const BELOW_LG = "not all and (min-width: 64rem)";
