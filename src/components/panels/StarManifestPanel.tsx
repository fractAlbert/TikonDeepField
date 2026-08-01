import { Region } from "@/lib/puzzle-types";
import { quasarColorHex } from "@/lib/quasar-colors";
import { PANEL_LABELS } from "@/lib/copy";
import { LcarsPanel } from "@/components/LcarsShell";

interface KnownFact {
  label: string;
  /** Tailwind background for the chip. */
  chip: string;
}

/**
 * What the briefing already tells you about one signature.
 *
 * This used to ask only "is there a direct type clue?", which was quietly
 * meaningless: no region emits `quasar-type` at all - not
 * `generateRegion`, not the hand-authored `region-2` - so every signature
 * in every region was marked "Deduce" and the badge distinguished nothing.
 * Meanwhile the two exact-sector anchors and two quadrant clues that every
 * briefing *does* carry went unreported here, which is the more useful
 * half.
 *
 * Type clues are still handled, so a hand-authored region that uses them
 * shows them without needing this touched again.
 */
function knownFacts(region: Region, quasarId: string): KnownFact[] {
  const facts: KnownFact[] = [];
  for (const clue of region.clues) {
    if (clue.negate) continue;
    if (clue.kind === "quasar-sector" && clue.quasar === quasarId)
      facts.push({ label: clue.sector, chip: "bg-lcars-teal" });
    if (clue.kind === "quasar-quadrant" && clue.quasar === quasarId)
      facts.push({ label: `Quad ${clue.quadrant}`, chip: "bg-lcars-violet" });
    if (clue.kind === "quasar-type" && clue.quasar === quasarId)
      facts.push({ label: clue.type, chip: "bg-lcars-lilac" });
  }
  return facts;
}

export function StarManifestPanel({ region }: { region: Region }) {
  return (
    <div className="flex flex-col gap-4">
      <LcarsPanel title={`${PANEL_LABELS.manifest} — ${region.name}`} accent="bg-lcars-lilac">
        <p className="text-sm text-lcars-ice/70 leading-relaxed mb-4">
          Every signature logged in this region, by name and color. Clues talk
          about <em>types</em>; this is what ties a name mentioned there back
          to what you actually see flash on the Sweep Scope or sit on the Star
          Map.
        </p>
        <p className="text-xs text-lcars-ice/50 leading-relaxed mb-4">
          Each entry carries whatever the briefing already pins down &mdash; an
          exact sector, or the quadrant it sits in.{" "}
          <span className="text-lcars-amber font-semibold">DEDUCE</span>{" "}
          marks the rest: nothing on file, so they have to be worked out from
          the instruments.
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {region.quasars.map((q, i) => {
            const color = quasarColorHex(i);
            const facts = knownFacts(region, q.id);
            return (
              <li key={q.id} className="flex rounded-lg overflow-hidden">
                <span className="w-2 shrink-0" style={{ backgroundColor: color }} />
                <span className="flex-1 min-w-0 flex items-center gap-3 bg-lcars-panel px-3 py-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color, boxShadow: `0 0 10px 2px ${color}66` }}
                  />
                  <span className="text-sm font-mono text-lcars-ice">{q.designation}</span>
                  <span className="ml-auto flex flex-wrap justify-end gap-1">
                    {facts.length === 0 ? (
                      <span className="lcars-caps text-[10px] font-semibold tracking-wide text-black bg-lcars-amber rounded-full px-2 py-0.5">
                        Deduce
                      </span>
                    ) : (
                      facts.map((fact) => (
                        <span
                          key={fact.label}
                          className={`lcars-caps text-[10px] font-semibold tracking-wide text-black rounded-full px-2 py-0.5 ${fact.chip}`}
                        >
                          {fact.label}
                        </span>
                      ))
                    )}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </LcarsPanel>
    </div>
  );
}
