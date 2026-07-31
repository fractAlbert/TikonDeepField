"use client";

import { RELIEVED, rankAt, rankHex } from "@/lib/ranks";
import { usePlayer } from "@/lib/use-player";
import { playButtonClick } from "@/lib/sound";
import { RankInsignia } from "@/components/RankInsignia";

/**
 * The officer's name wherever it appears, always with the insignia beside
 * it - a name without a rank is just a string, and rank is the thing the
 * whole record is about.
 *
 * Renders as a button when given an `onClick` (the shell header uses it to
 * open the profile) and as plain text otherwise.
 */
export function OfficerBadge({
  onClick,
  size = 28,
  /**
   * Applied to the name/rank column. The shell passes `hidden md:block` to
   * drop it on narrow chrome - done in CSS rather than off `useMediaQuery`
   * on purpose. Nothing here needs to control what is *mounted*, and that
   * hook reports desktop until the first client commit, which would flash
   * a full-width name across a phone header.
   */
  nameClassName = "",
  className = "",
  id,
}: {
  onClick?: () => void;
  size?: number;
  nameClassName?: string;
  className?: string;
  id?: string;
}) {
  const { player, commissioned } = usePlayer();
  const rank = rankAt(player.rank);
  const rankLabel = player.rank === RELIEVED ? "Relieved of Duty" : rank?.title ?? "";

  const content = (
    <>
      <RankInsignia rank={player.rank} size={size} />
      <span className={`min-w-0 text-left leading-tight ${nameClassName}`}>
        {/* Both lines fall back to a non-breaking space rather than
            collapsing: until the commission effect lands there is no name
            to show, and an empty row would change the header's height for
            one frame. */}
        <span
          className="block text-xs font-semibold truncate"
          style={{ color: rankHex(player.rank) }}
        >
          {commissioned ? player.name : " "}
        </span>
        <span className="lcars-caps block text-[9px] tracking-wider text-lcars-ice/50 truncate">
          {commissioned ? rankLabel : " "}
        </span>
      </span>
    </>
  );

  const layout = `flex items-center gap-2 min-w-0 ${className}`;

  if (!onClick)
    return (
      <span id={id} className={layout}>
        {content}
      </span>
    );

  return (
    <button
      id={id}
      type="button"
      onClick={() => {
        playButtonClick();
        onClick();
      }}
      title={commissioned ? `${player.name} - ${rankLabel}` : undefined}
      /* Solid panel fill, not a translucent one: this sits on the orange
         header bar, and rank colours (amber, orange) over a tinted orange
         are unreadable. */
      className={`${layout} cursor-pointer rounded-full bg-lcars-panel hover:bg-black/70 transition-colors px-2.5 py-1 max-w-[210px]`}
    >
      {content}
    </button>
  );
}
