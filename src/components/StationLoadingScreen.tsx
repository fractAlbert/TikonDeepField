import { OutpostLogo } from "@/components/OutpostLogo";
import { OUTPOST_NAME } from "@/lib/constants";
import { COPY } from "@/lib/copy";

export function StationLoadingScreen() {
  return (
    <div id="station-loading-screen" className="h-full flex flex-col items-center justify-center text-center gap-3 px-6">
      <div className="lcars-caps text-sm text-lcars-ice/60 tracking-wider">{OUTPOST_NAME}</div>
      <OutpostLogo size={260} className="opacity-90 max-h-full w-auto animate-pulse" />
      <div className="lcars-caps font-bold text-2xl text-lcars-amber animate-pulse">
        {COPY.stationLoading.label}
      </div>
    </div>
  );
}
