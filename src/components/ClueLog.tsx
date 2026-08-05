"use client";

import { useMemo } from "react";
import { Clue, Region } from "@/lib/puzzle-types";
import { clueText } from "@/lib/clue-text";
import { quasarGlyph, QuasarGlyph } from "@/lib/quasar-glyph";
import { useQuasarColor } from "@/lib/use-quasar-colors";
import { QuasarStar } from "@/components/QuasarStar";

/**
 * Which signatures a bearing is actually about.
 *
 * Most clue kinds name one, a few relate two, and the type-only kinds name
 * none - those describe "the Dormant Core signature" without saying which
 * one it is, so there is deliberately nothing to draw beside them.
 *
 * Generated regions only ever emit `quasar-sector` and `quasar-quadrant`;
 * the rest of this exists for the built-in regions, which use the wider
 * vocabulary.
 */
function quasarsIn(clue: Clue): string[] {
  const named: string[] = [];
  if ("quasar" in clue) named.push(clue.quasar);
  if ("quasarA" in clue) named.push(clue.quasarA);
  if ("quasarB" in clue) named.push(clue.quasarB);
  return named;
}

/**
 * The briefing's bearings, each carrying the signature it is about.
 *
 * The Star Map, the Sweep Scope, the Ring Scan, the Manifest and the Log
 * all draw a signature as its colour and its shape; the briefing was the
 * one place that named one in prose and left you to find it. Putting the
 * same mark here means "Mrk 633 is at R2S7" and the marker you are about to
 * place are recognisably the same thing before you have read either.
 */
export function ClueLog({ region }: { region: Region }) {
  const colorOf = useQuasarColor(region.id);

  // Keyed by id *and* designation. They are the same string for generated
  // regions but not guaranteed to be, and a clue refers to whichever the
  // region's author wrote.
  const identity = useMemo(() => {
    const map = new Map<string, { color: string; glyph: QuasarGlyph }>();
    region.quasars.forEach((q, i) => {
      const mark = { color: colorOf(q.id, i), glyph: quasarGlyph(i) };
      map.set(q.id, mark);
      map.set(q.designation, mark);
    });
    return map;
  }, [region, colorOf]);

  return (
    <ol className="flex flex-col gap-2">
      {region.clues.map((clue, i) => {
        const marks = quasarsIn(clue)
          .map((name) => ({ name, mark: identity.get(name) }))
          .filter((m): m is { name: string; mark: { color: string; glyph: QuasarGlyph } } => !!m.mark);
        return (
          <li key={i} className="flex gap-2 text-sm items-start">
            <span className="lcars-caps text-lcars-amber font-bold shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            {/* The slot is reserved even when a clue names no signature, so
                the text stays in one column down the list rather than
                stepping left on the type-only bearings. */}
            <span className="flex items-center gap-1 shrink-0 min-w-4 mt-[3px]">
              {marks.map(({ name, mark }) => (
                <QuasarStar key={name} color={mark.color} glyph={mark.glyph} size={14} />
              ))}
            </span>
            <span className="text-lcars-ice/90">{clueText(clue)}</span>
          </li>
        );
      })}
    </ol>
  );
}
