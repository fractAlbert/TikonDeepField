import { OutpostLogo } from "@/components/OutpostLogo";
import { OUTPOST_NAME } from "@/lib/constants";
import { COPY } from "@/lib/copy";
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
      className="h-full relative flex flex-col items-center justify-center text-center gap-3 px-6"
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
          className="opacity-90 max-h-full w-auto transition-opacity group-hover:opacity-100"
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
