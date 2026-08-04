import { Region } from "@/lib/puzzle-types";
import { StarMap } from "@/components/starmap/StarMap";
import type { TutorialHint } from "@/lib/tutorial";

export function StarMapPanel({
  region,
  onClosed,
  onBoardChange,
  hint,
}: {
  region: Region | null;
  /** Passed straight through - see StarMap for what they're for. */
  onClosed?: (regionId: string) => void;
  onBoardChange?: (board: { placements: Record<string, string | undefined>; markCount: number }) => void;
  hint?: TutorialHint | null;
}) {
  return (
    <div className="bg-lcars-panel rounded-t-xl overflow-hidden">
      <div className="bg-lcars-amber lcars-caps text-black font-semibold px-4 py-1.5 text-sm">
        Star Map{region ? ` — ${region.name}` : ""}
      </div>
      {/* The amber gutter and padding are pure chrome; below `md` they're
          64px of a ~390px screen the map would rather have. */}
      <div className="flex">
        <div className="w-6 md:w-10 shrink-0 bg-lcars-amber" />
        <div className="flex-1 min-w-0 p-3 md:p-4">
          {/* Only the empty-field line lives here. The instructions for a
              live survey depend on whether the region has been closed,
              which is StarMap's business - it holds the survey log
              subscription. */}
          {!region && (
            <p className="text-xs text-lcars-ice/60 leading-relaxed mb-3">
              No active survey &mdash; the field is shown for reference only.
            </p>
          )}
          <StarMap
            key={region?.id ?? "empty"}
            region={region}
            onClosed={onClosed}
            onBoardChange={onBoardChange}
            hint={hint}
          />
        </div>
      </div>
    </div>
  );
}
