import { OutpostLogo } from "@/components/OutpostLogo";
import { COPY, OUTPOST_NAME } from "@/lib/copy";

/**
 * Deliberately the same box as `NoActiveAssignmentPanel`, because it
 * replaces it: with no missions left you are looking at the emblem, and
 * Survey New Region swaps this in underneath it. Any difference in the
 * centring shows up as the logo jumping, which it did - the padding below
 * reserves the hint strip that panel positions out of flow, and without a
 * matching reserve here the emblem dropped about 33px on the swap.
 *
 * The two must be kept in step. Its container classes, its bottom padding
 * and the logo's max-width all have counterparts there, and AppShell wraps
 * both in an "Active Assignment" panel so the title bar is the same height
 * on each.
 */
export function StationLoadingScreen() {
  return (
    <div
      id="station-loading-screen"
      className="h-full flex flex-col items-center justify-center text-center gap-3 px-6 pb-24 md:pb-20"
    >
      <div className="lcars-caps text-sm text-lcars-ice/60 tracking-wider">{OUTPOST_NAME}</div>
      <OutpostLogo
        size={260}
        className="opacity-90 max-h-full w-auto max-w-[min(100%,220px)] md:max-w-none animate-pulse"
      />
      <div className="lcars-caps font-bold text-2xl text-lcars-amber animate-pulse">
        {COPY.stationLoading.label}
      </div>
    </div>
  );
}
