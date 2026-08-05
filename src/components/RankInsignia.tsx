import { RANKS, RELIEVED, rankHex, rankTitle } from "@/lib/ranks";

/**
 * The insignia is the survey field itself: five concentric rings, one lit
 * per rung of the ladder, opening the way an LCARS bracket does. Rank is
 * literally how far out into the field you're trusted to classify, which is
 * both the fiction and, once rank drives generation, the mechanic.
 *
 * ## Why the opening faces up-left
 *
 * It opened up-*right* until 2026-08-04, and it read as broken every single
 * time. Five concentric arcs ending on the same two radii put a vertical
 * edge and a horizontal edge meeting in one corner, and a straight edge
 * cutting across curves is the strongest occlusion cue there is - the eye
 * insists something is in front. Every place this badge appears puts the
 * officer's name immediately to its right, so the thing "in front" read as
 * a black panel behind the name, clipping the emblem.
 *
 * Nothing was wrong with the drawing; it was pointing its cut edge at the
 * one piece of content guaranteed to be beside it. Rotated a quarter turn,
 * the closed side faces the name and the opening faces the panel's own
 * margin, where there is nothing to complete it against.
 *
 * Built from rings rather than pips because the shape already means
 * something here - it's the same geometry as the Star Map dial - and
 * because concentric arcs stay legible at 16px, where five separate pips
 * turn to mush.
 *
 * Being relieved lights nothing and turns the whole badge red, which is the
 * one thing LCARS reserves red for (see lcars-colors.ts).
 */
export function RankInsignia({
  rank,
  size = 24,
  className = "",
  title,
}: {
  rank: number;
  size?: number;
  className?: string;
  /** Overrides the default tooltip; pass "" for decorative use next to a label. */
  title?: string;
}) {
  const hex = rankHex(rank);
  const lit = rank === RELIEVED ? 0 : rank + 1;
  const label = title ?? rankTitle(rank);

  const CX = 20;
  const CY = 20;
  const INNER_R = 6.5;
  const RING_STEP = 3;

  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      role={label ? "img" : "presentation"}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      {label && <title>{label}</title>}
      {/* A circle's path starts at 3 o'clock and runs clockwise, so the
          undashed run ends just shy of 12 and leaves the gap in the
          upper-right quadrant. The quarter turn moves it to the upper left
          - see the note above for why that matters more than it sounds. */}
      <g transform={`rotate(-90 ${CX} ${CY})`}>
        {RANKS.map((_, i) => {
          const on = i < lit;
          return (
            <circle
              key={i}
              cx={CX}
              cy={CY}
              r={INNER_R + i * RING_STEP}
              fill="none"
              stroke={hex}
              strokeWidth={2.1}
              strokeLinecap="round"
              opacity={on ? 1 : 0.16}
              /* pathLength normalises the circumference to 100 so the same
                 dash pair cuts the same 270deg arc at every radius - without
                 it each ring would need its own dash length. */
              pathLength={100}
              strokeDasharray="74 26"
            />
          );
        })}
      </g>
      <circle cx={CX} cy={CY} r={2.2} fill={hex} opacity={rank === RELIEVED ? 0.35 : 1} />
    </svg>
  );
}
