"use client";

import { useEffect, useRef, useState } from "react";
import { OutpostLogo } from "@/components/OutpostLogo";

/**
 * Below this the emblem is a smear rather than a mark, and no emblem reads
 * better than a 4px one.
 */
const MIN_HEIGHT = 96;

/**
 * The station emblem at the foot of the utility rail, filling whatever the
 * buttons leave - and drawing nothing when that is not enough.
 *
 * It sits here rather than under the Star Map because there is no room
 * under the Star Map: measured, the sidebar had 24 spare pixels with an
 * eight-signature region open, which rendered the logo four pixels tall.
 * The rail carries no filler segments, so everything below its four buttons
 * is free.
 *
 * The height is measured rather than assumed because the leftover moves -
 * with the nav entry count here, and with the signature count, the filing
 * readout and the rank banner anywhere near the Star Map. A media query on
 * viewport height would be wrong for all of those, and a fixed size would
 * either overflow or float.
 *
 * The wrapper is `flex-1 min-h-0`, so its height is the leftover regardless
 * of what is inside it. That is what makes measuring it stable: the logo
 * never feeds back into the space it is being fitted to.
 */
export function StationEmblem() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={boxRef}
      id="station-emblem"
      aria-hidden
      className="flex-1 min-h-0 flex items-end justify-center pt-4 pb-1 overflow-hidden"
    >
      {/* `h-auto` is not optional: OutpostLogo writes width and height
          attributes from `size`, so clamping the width alone stretched it
          to 144x260. Auto height lets the viewBox's aspect win. */}
      {height >= MIN_HEIGHT && (
        <OutpostLogo size={260} className="w-full h-auto max-h-full opacity-[0.22]" />
      )}
    </div>
  );
}
