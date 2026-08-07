import { ReactNode } from "react";

/**
 * The end of a run, where a web page would put a hairline rule.
 *
 * `border-t border-white/10` was doing this job in five places, and a drawn
 * hairline is the one thing the style notes forbid outright - separation is
 * black grout and touching blocks, never a stroke. The replacement is read
 * off `lcars-ultra-220809.png`, where a rail that simply stops does it with
 * a short solid bar set below the run rather than a line across the full
 * width. It says "this section is over" by being a piece of the same
 * material, not by drawing a boundary.
 *
 * Flat-ended on purpose: it is a fragment of a longer run continuing
 * off-frame, so rounding either end would close it.
 */
export function LcarsBreak({
  color = "bg-lcars-ice/25",
  className = "",
}: {
  color?: string;
  className?: string;
}) {
  return <div aria-hidden className={`h-1 w-14 shrink-0 ${color} ${className}`} />;
}

export function LcarsPanel({
  title,
  accent = "bg-lcars-amber",
  children,
  className = "",
  id,
}: {
  title?: string;
  accent?: string;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={`bg-lcars-panel rounded-xl overflow-hidden flex flex-col ${className}`}>
      {title ? (
        <div
          className={`${accent} lcars-caps text-black font-semibold px-4 py-1.5 text-sm shrink-0`}
        >
          {title}
        </div>
      ) : null}
      <div className="p-4 flex-1 min-h-0">{children}</div>
    </div>
  );
}
