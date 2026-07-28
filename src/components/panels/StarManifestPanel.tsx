import { Region } from "@/lib/puzzle-types";
import { quasarColorHex } from "@/lib/quasar-colors";
import { PANEL_LABELS } from "@/lib/copy";
import { LcarsPanel } from "@/components/LcarsShell";

function hasDirectTypeClue(region: Region, quasarId: string): boolean {
  return region.clues.some(
    (clue) => clue.kind === "quasar-type" && clue.quasar === quasarId && !clue.negate
  );
}

export function StarManifestPanel({ region }: { region: Region }) {
  return (
    <div className="flex flex-col gap-4">
      <LcarsPanel title={`${PANEL_LABELS.manifest} — ${region.name}`} accent="bg-lcars-lilac">
        <p className="text-sm text-lcars-ice/70 leading-relaxed mb-4">
          Every signature logged in this region, by name and color. Clues and
          Quadrant Survey talk about <em>types</em>; this is what ties a name
          mentioned there back to what you actually see flash on the Sweep
          Scope or sit on the Star Map.
        </p>
        <p className="text-xs text-lcars-ice/50 leading-relaxed mb-4">
          <span className="text-lcars-amber font-semibold">DEDUCE</span>{" "}
          marks a signature with no direct type clue &mdash; work it out from
          what&apos;s left once you know the others.
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {region.quasars.map((q, i) => {
            const color = quasarColorHex(i);
            const directlyClued = hasDirectTypeClue(region, q.id);
            return (
              <li key={q.id} className="flex rounded-lg overflow-hidden">
                <span className="w-2 shrink-0" style={{ backgroundColor: color }} />
                <span className="flex-1 min-w-0 flex items-center gap-3 bg-lcars-panel px-3 py-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color, boxShadow: `0 0 10px 2px ${color}66` }}
                  />
                  <span className="text-sm font-mono text-lcars-ice">{q.designation}</span>
                  {!directlyClued && (
                    <span className="ml-auto lcars-caps text-[10px] font-semibold tracking-wide text-black bg-lcars-amber rounded-full px-2 py-0.5">
                      Deduce
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </LcarsPanel>
    </div>
  );
}
