import { OutpostLogo } from "@/components/OutpostLogo";
import { OUTPOST_NAME } from "@/lib/constants";
import { playButtonClick } from "@/lib/sound";

export function NoActiveAssignmentPanel({
  hint,
  onOpenStationInfo,
}: {
  hint?: string;
  onOpenStationInfo?: () => void;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-6">
      <div className="lcars-caps text-sm text-lcars-ice/60 tracking-wider">
        No Active Assignment
      </div>

      <button
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

      <p className="text-sm text-lcars-ice/50 mt-2 max-w-sm mx-auto leading-relaxed">
        {hint ?? "Select a region on the Briefing panel, or survey a new one, to begin."}
      </p>
    </div>
  );
}
