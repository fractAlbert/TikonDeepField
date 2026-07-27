import { Clue } from "@/lib/puzzle-types";
import { clueText } from "@/lib/clue-text";

export function ClueLog({ clues }: { clues: Clue[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {clues.map((clue, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className="lcars-caps text-lcars-amber font-bold shrink-0">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="text-lcars-ice/90">{clueText(clue)}</span>
        </li>
      ))}
    </ol>
  );
}
