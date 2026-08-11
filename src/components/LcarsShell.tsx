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

/**
 * A titled panel.
 *
 * The title is a **shelf the label rests on**, not a caption bar above the
 * content: a solid block of the accent colour with the label sitting at its
 * bottom-left, which is what all three reference images do and what the
 * full-width bar here never was. Height lives in `--lcars-shelf-h` rather
 * than here - see `globals.css` for why that ratio, and why it is a token.
 *
 * `size="lg"` buys the taller shelf, for panels that own a whole screen.
 * Everything else takes the floor, because a phone cannot afford more: four
 * of these stack on the Briefing and the Profile.
 */
export function LcarsPanel({
  title,
  accent = "bg-lcars-amber",
  size = "default",
  children,
  className = "",
  id,
}: {
  title?: string;
  accent?: string;
  size?: "default" | "lg";
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={`bg-lcars-panel rounded-xl overflow-hidden flex flex-col ${className}`}>
      {title ? (
        <div
          className={`${accent} lcars-shelf ${
            size === "lg" ? "lcars-shelf-lg" : ""
          } lcars-caps text-black font-semibold px-4 text-sm shrink-0`}
        >
          {title}
        </div>
      ) : null}
      {/* `p-3` on a phone, `p-4` above it. 16px of panel padding is generous
          on a 390px screen, and this project has repeatedly taken space from
          chrome to give it to content - the phone's band gaps went to 8px for
          the same reason. Worth 8px on every panel, which is what puts the
          Sweep Scope back to fitting. */}
      <div className="p-3 md:p-4 flex-1 min-h-0">{children}</div>
    </div>
  );
}
