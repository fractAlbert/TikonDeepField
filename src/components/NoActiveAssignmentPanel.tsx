import { OutpostLogo } from "@/components/OutpostLogo";
import { COPY, OUTPOST_NAME } from "@/lib/copy";
import { playButtonClick } from "@/lib/sound";

export function NoActiveAssignmentPanel({
  hint,
  onOpenStationInfo,
}: {
  hint?: string;
  onOpenStationInfo?: () => void;
}) {
  return (
    <div
      id="no-active-assignment"
      /* pb reserves the hint's strip at the bottom. The hint is positioned
         out of flow (see below), which means nothing stops the centered
         group from growing straight over it - and on a phone, where this
         container is only ~370px tall and the hint runs to three lines,
         that is exactly what happened: the emblem's caption landed on top
         of the text. Padding keeps the centering box clear of it. */
      className="h-full relative flex flex-col items-center justify-center text-center gap-3 px-6 pb-24 md:pb-20"
    >
      <div id="no-active-assignment-caption" className="lcars-caps text-sm text-lcars-ice/60 tracking-wider">
        {COPY.noActiveAssignment.caption}
      </div>

      <button
        id="station-logo-button"
        type="button"
        disabled={!onOpenStationInfo}
        onClick={() => {
          if (!onOpenStationInfo) return;
          playButtonClick();
          onOpenStationInfo();
        }}
        className={`flex flex-col items-center gap-3 group ${
          onOpenStationInfo ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <OutpostLogo
          size={260}
          className="opacity-90 max-h-full w-auto max-w-[min(100%,220px)] md:max-w-none transition-opacity group-hover:opacity-100"
        />
        <div className="lcars-caps font-bold text-2xl text-lcars-amber transition-colors group-hover:text-lcars-orange">
          {OUTPOST_NAME}
        </div>
      </button>

      {/* Absolutely positioned so its height never factors into the
          centering above - different callers pass hints of very different
          lengths (this panel's default vs. Briefing's archived-region
          hint), and if the hint sat in-flow, a longer one would grow the
          centered group and shift the logo up relative to shorter-hint
          instances of this same component. */}
      <p
        id="no-active-assignment-hint"
        className="absolute bottom-4 inset-x-6 text-sm text-lcars-ice/50 max-w-sm mx-auto leading-relaxed"
      >
        {hint ?? COPY.noActiveAssignment.defaultHint}
      </p>
    </div>
  );
}
