import { Region } from "@/lib/puzzle-types";
import { StarMap } from "@/components/starmap/StarMap";

export function StarMapPanel({ region }: { region: Region | null }) {
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
          <p className="text-xs text-lcars-ice/60 leading-relaxed mb-3">
            {region
              ? "Arm a signature, then click a cell to place it. Switch to Rule Out to mark cells it definitely isn't at."
              : "No active survey — the field is shown for reference only."}
          </p>
          <StarMap key={region?.id ?? "empty"} region={region} />
        </div>
      </div>
    </div>
  );
}
