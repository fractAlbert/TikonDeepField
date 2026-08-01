"use client";

import { useEffect, useMemo, useState } from "react";
import { Region } from "@/lib/puzzle-types";
import { buildSectors } from "@/lib/grid";
import { generateRegion } from "@/lib/generate-region";
import { quasarColorHex } from "@/lib/quasar-colors";
import { playButtonClick } from "@/lib/sound";
import { LcarsPanel } from "@/components/LcarsShell";
import { RingScope, RingTarget } from "@/components/ringsurvey/RingScope";

const sectorLookup = new Map(buildSectors().map((s) => [s.id, s]));

interface Prototype {
  title: string;
  status: string;
  description: string;
  href: string;
}

const PROTOTYPES: Prototype[] = [
  {
    title: "Sweep Scope — Linear Wrap",
    status: "Adopted into Sweep Scope panel",
    description:
      "The original standalone sweep-line exploration: signatures flash in color as a vertical line crosses them left-to-right and wraps. Tests sweep period and an ephemeral-vs-persistent marker toggle.",
    href: "https://claude.ai/code/artifact/573bb43c-0259-4913-90ed-9430300db4fb",
  },
  {
    title: "Star Map — Radial Concepts",
    status: "Under review",
    description:
      "Two candidate layouts for the Star Map's answer grid, side by side: a ring-and-wedge “bullseye” matrix, and a chord/spoke diagram connecting quasar nodes to type nodes.",
    href: "https://claude.ai/code/artifact/19593429-300b-40ce-9ad7-f9b7b8dcefe0",
  },
  {
    title: "Station Schematic — Scale Reveal",
    status: "Under review",
    description:
      "Plays once (no loop): StationSchematic.tsx's sensor array stays fixed at its shipped size throughout, while the hull starts tiny — true relative scale — and grows into the exact operational proportions, pointer-labeled callouts fading and relabeling across the reveal. Includes a mock section-tab to test resetting on return.",
    href: "https://claude.ai/code/artifact/67ac6b41-b6b5-4836-bd44-703e13e2c906",
  },
  {
    title: "Star Map — Label Size Trial",
    status: "Under review",
    description:
      "Why the ring and segment labels read as tiny: fontSize 10 is in SVG user units, and a 440-unit viewBox rendered at 260px paints them at 5.9px. Replicates the dial's exact geometry and puts both levers — label size and rendered map width — on sliders, plus a fixed strip comparing 10 / 14 / 18 / 22 at the shipped 260px to show where labels start fouling the grid.",
    href: "https://claude.ai/code/artifact/e4be8419-6641-4338-8cf1-762165e8a55e",
  },
];

export function PrototypesPanel({
  region,
}: {
  /** The active survey, or null when there isn't one. */
  region: Region | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <RingSurveyPrototype region={region} />

      <LcarsPanel title="Prototype Archive" accent="bg-lcars-teal">
        <p className="text-sm text-lcars-ice/70 leading-relaxed mb-4">
          Standalone experiments kept here for reference as the interface
          evolves. Each opens in a new tab.
        </p>
        <div className="flex flex-col gap-3">
          {PROTOTYPES.map((p) => (
            <a
              key={p.href}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex rounded-lg overflow-hidden group"
            >
              <span className="w-2 shrink-0 bg-lcars-teal group-hover:bg-lcars-ice transition-colors" />
              <span className="flex-1 min-w-0 bg-lcars-black/40 px-4 py-3">
                <span className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="lcars-caps text-lcars-orange font-bold text-sm">
                    {p.title}
                  </h3>
                  <span className="lcars-caps text-[10px] text-lcars-ice/50">
                    {p.status} &nbsp;↗
                  </span>
                </span>
                <p className="text-xs text-lcars-ice/70 mt-1 leading-relaxed">
                  {p.description}
                </p>
              </span>
            </a>
          ))}
        </div>
      </LcarsPanel>
    </div>
  );
}

/**
 * Live, in-app prototype rather than a link out, because the question it
 * has to answer is "how does this feel next to the Sweep Scope" - which
 * needs the real region, the real signatures and the real colours.
 *
 * Both variants are shown at once because they are not two settings of one
 * instrument, they are different instruments. Measured over 3000 regions
 * (analyze-solvability.ts, measure-deduction-depth.ts):
 *
 *   by signature, unlimited  ~0% unsolvable, but 90% of signatures then
 *                            fall straight out of the two anchors, and the
 *                            work drops from 133 candidate eliminations
 *                            per region to 23. It hands over the puzzle.
 *   by type                  3.1% unsolvable with the eliminations
 *                            unchanged at 133 and chains intact. It prunes
 *                            dead ends without ever naming anyone.
 *
 * Neither is wired into the navigation: that is a difficulty decision, not
 * a plumbing one.
 */
function RingSurveyPrototype({ region }: { region: Region | null }) {
  // Falls back to a throwaway region so the prototype works with no active
  // survey - the state you land in with everything archived, which
  // previously showed nothing at all. Generated in an effect and never
  // during render: it is random, so the server would pick a different one
  // than the client and hydration would mismatch.
  const [demo, setDemo] = useState<Region | null>(null);
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-time
       seed of sample data, same shape as the localStorage syncs elsewhere. */
    if (!region) setDemo((d) => d ?? generateRegion());
  }, [region]);

  const active = region ?? demo;

  const signatures = useMemo(
    () =>
      active
        ? active.quasars.map((q, i) => ({
            id: q.designation,
            label: q.designation,
            color: quasarColorHex(i),
            ring: sectorLookup.get(active.solution[q.id].sector)!.ring,
            type: active.solution[q.id].type,
          }))
        : [],
    [active]
  );

  const [signatureId, setSignatureId] = useState("");
  const [type, setType] = useState("");

  // Resolved each render rather than reset on region change - if the stored
  // selection no longer matches anyone, fall back to the first.
  const selected = signatures.find((s) => s.id === signatureId) ?? signatures[0];
  const types = active?.quasarTypes ?? [];
  const selectedType = types.includes(type) ? type : types[0];

  // Every ring holding at least one signature of the chosen type, and how
  // many. The type variant's entire output, and it names nobody.
  const typeTargets: RingTarget[] = useMemo(() => {
    const byRing = new Map<number, number>();
    for (const s of signatures) {
      if (s.type !== selectedType) continue;
      byRing.set(s.ring, (byRing.get(s.ring) ?? 0) + 1);
    }
    return [...byRing.entries()].map(([ring, count]) => ({ ring, count }));
  }, [signatures, selectedType]);

  if (!active || !selected) {
    return (
      <LcarsPanel title="Live Prototype — Ring Survey" accent="bg-lcars-orange">
        <p className="text-sm text-lcars-ice/50">Preparing sample field…</p>
      </LcarsPanel>
    );
  }

  return (
    <LcarsPanel title="Live Prototype — Ring Survey" accent="bg-lcars-orange">
      <p className="text-sm text-lcars-ice/70 leading-relaxed mb-4">
        A range gate walks outward from the centre of the field, and rings light
        as it crosses them. It reports a ring and nothing else &mdash; no
        segment, no bearing. Two variants, which differ far more than they look
        like they should.
        {!region && (
          <span className="text-lcars-amber">
            {" "}
            No active survey, so this is a throwaway sample field.
          </span>
        )}
      </p>

      {/* Stacked, not side by side. Tailwind's breakpoints measure the
          viewport, but `main` is only ~500px even on a 1344px desktop -
          the Star Map sidebar and both rails take the rest - so a
          two-column split squeezed each dial to ~215px and crushed the
          ring labels. Both variants are still on one screen, just one
          scroll apart. */}
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-black/25 p-3">
          <div className="lcars-caps text-xs font-semibold text-lcars-teal mb-1">
            A &middot; By signature
          </div>
          <p className="text-[11px] text-lcars-ice/50 leading-relaxed mb-3">
            Pick one signature, learn its ring. Unlimited use leaves{" "}
            <span className="font-mono">~0%</span> of regions unsolvable, but
            drops the work from <span className="font-mono">133</span> candidate
            eliminations per region to <span className="font-mono">23</span>, and
            90% of signatures then fall straight out of the anchors with nothing
            chaining. A budget of 2 keeps most of it:{" "}
            <span className="font-mono">7.9%</span> unsolvable, 90 eliminations.
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {signatures.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  playButtonClick();
                  setSignatureId(s.id);
                }}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs cursor-pointer transition-colors ${
                  s.id === selected.id
                    ? "bg-lcars-teal text-black font-semibold"
                    : "bg-lcars-panel text-lcars-ice hover:bg-white/10"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </button>
            ))}
          </div>
          <RingScope
            targets={[{ ring: selected.ring, count: 1 }]}
            color={selected.color}
            selectionKey={`sig:${selected.id}`}
            visible
          />
        </div>

        <div className="rounded-lg bg-black/25 p-3">
          <div className="lcars-caps text-xs font-semibold text-lcars-orange mb-1">
            B &middot; By type
          </div>
          <p className="text-[11px] text-lcars-ice/50 leading-relaxed mb-3">
            Pick a type, learn which rings hold one and how many &mdash; naming
            nobody, the way the Quadrant Survey doesn&apos;t. Takes unsolvable
            from <span className="font-mono">19%</span> to{" "}
            <span className="font-mono">3.1%</span> with the work{" "}
            <em>unchanged</em> at <span className="font-mono">133</span>{" "}
            eliminations and chains intact. It prunes dead ends instead of
            answering the question.
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {types.map((t, i) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  playButtonClick();
                  setType(t);
                }}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs cursor-pointer transition-colors ${
                  t === selectedType
                    ? "bg-lcars-orange text-black font-semibold"
                    : "bg-lcars-panel text-lcars-ice hover:bg-white/10"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: quasarColorHex(i) }}
                />
                {t}
              </button>
            ))}
          </div>
          <RingScope
            targets={typeTargets}
            color={quasarColorHex(Math.max(0, types.indexOf(selectedType)))}
            selectionKey={`type:${selectedType}`}
            showCounts
            visible
          />
        </div>
      </div>

      <p className="text-xs text-lcars-ice/50 leading-relaxed mt-4">
        <span className="text-lcars-orange font-semibold">One caveat on B:</span>{" "}
        nothing in the game currently links a signature&apos;s name to its type
        &mdash; generation emits no type clues &mdash; so in play this reads as
        anonymous per-ring totals. That is exactly how it was modelled, and it
        is still worth 16 points of solvability. Emitting type clues would
        sharpen it further.
      </p>
    </LcarsPanel>
  );
}

