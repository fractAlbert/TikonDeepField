import { CSSProperties, ReactNode } from "react";

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
 * A section header in the log idiom: large right-aligned display type in the
 * section's colour, over a run of bars.
 *
 * This is the *other* way LCARS announces a section, and it is what
 * `thelcars.com` uses for News/Updates. A shelf (see `LcarsPanel`) labels a
 * box you are about to read the inside of; this labels a stretch of page.
 * The difference that matters is weight - a shelf is a solid block competing
 * with its own content, so four stacked shelves flatten into stripes, while
 * this is type and gets quieter as the list under it gets longer.
 *
 * The bars are the header bars proper. Their widths are deliberately uneven
 * and their colours repeat, which is what makes a run read as instrument
 * chrome rather than as a progress bar.
 */
export function LcarsSectionHeader({
  title,
  color = "text-lcars-amber",
  bars = ["bg-lcars-amber", "bg-lcars-violet", "bg-lcars-tan"],
  className = "",
}: {
  title: string;
  /** Text colour class. The bars usually echo it. */
  color?: string;
  /** Background classes for the bar run, left to right. */
  bars?: string[];
  className?: string;
}) {
  return (
    <div className={className}>
      {/* Flat everywhere: this run continues off both edges of the panel
          rather than terminating, so nothing here is capped. The last bar
          takes the remaining width so the run always reaches the edge. */}
      <div aria-hidden className="flex gap-1 h-2 mb-2">
        <div className={`w-1/4 ${bars[0] ?? "bg-lcars-amber"}`} />
        <div className={`w-10 ${bars[1] ?? "bg-lcars-violet"}`} />
        <div className={`flex-1 ${bars[2] ?? "bg-lcars-tan"}`} />
      </div>
      <h2 className={`lcars-section-title lcars-caps ${color}`}>{title}</h2>
    </div>
  );
}

/**
 * One entry in a log list - an ellipse, an underlined title, and a quieter
 * meta line under it.
 *
 * Must be used inside `<ul className="lcars-log-list">`, which draws the
 * ellipse from `::before` so it costs no element per row. Pass
 * `--lcars-bullet-colour` on the item to colour it per entry, which is how
 * an outcome or a category shows without adding a chip.
 */
export function LcarsLogItem({
  title,
  meta,
  bulletColor,
  selected,
  onClick,
  className = "",
  children,
}: {
  title: ReactNode;
  /** The quiet second line - dates, counts, status. */
  meta?: ReactNode;
  /** CSS colour for the ellipse, e.g. `var(--lcars-teal)`. */
  bulletColor?: string;
  /**
   * Marks the selected entry by **growing its ellipse**, not by drawing
   * anything new. This is the rail's selection indicator in list form - the
   * colour pushes out further, and no border, ring or background appears.
   * Nothing reflows either, since the row's inset is unchanged.
   */
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}) {
  const style: CSSProperties = {};
  if (bulletColor) (style as Record<string, string>)["--lcars-bullet-colour"] = bulletColor;
  if (selected) (style as Record<string, string>)["--lcars-bullet-w"] = "3.25rem";

  return (
    <li
      onClick={onClick}
      style={style}
      className={`py-2 ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      <div className="lcars-caps text-sm underline underline-offset-2 decoration-1 text-lcars-ice">
        {title}
      </div>
      {meta ? (
        <div className="lcars-caps text-[11px] tracking-wide text-lcars-ice/45 mt-0.5">{meta}</div>
      ) : null}
      {children}
    </li>
  );
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
