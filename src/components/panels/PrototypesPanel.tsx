"use client";

import { useEffect, useMemo, useState } from "react";
import { Region } from "@/lib/puzzle-types";
import { buildSectors } from "@/lib/grid";
import { generateRegion } from "@/lib/generate-region";
import { quasarColorHex } from "@/lib/quasar-colors";
import { playButtonClick } from "@/lib/sound";
import { LcarsBreak, LcarsPanel } from "@/components/LcarsShell";
import {
  RingCensusLadder,
  RingScope,
  RingScopeMode,
} from "@/components/ringsurvey/RingScope";
import { TargetedScanPrototype } from "@/components/ringsurvey/TargetedScanPrototype";
import { StarGlyphPrototype } from "@/components/prototypes/StarGlyphPrototype";
import { LcarsKitPrototype } from "@/components/prototypes/LcarsKitPrototype";
import { RING_COUNT } from "@/lib/grid";

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
      {/* First, because it is the only one here that is about the interface
          rather than about the game - the thing you open before designing a
          control, not while settling a mechanic. */}
      <LcarsKitPrototype />
      <StarGlyphPrototype />
      <RingSurveyPrototype region={region} />
      <TargetedScanPrototype region={region} />

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
 * Live, in-app prototype rather than a link out: the question it has to
 * answer is how this feels to read next to the Sweep Scope, which needs
 * the real region, the real counts and the real colours.
 *
 * The instrument itself is settled (docs/instrument-analysis.md): a ring
 * census, anonymous, naming no individual signature. Counting per ring
 * rather than per quadrant takes unsolvable regions from ~19% to ~6% - and
 * to ~4% keeping both - while leaving the amount of deduction unchanged at
 * 133 candidate eliminations per region. What is NOT settled is the
 * presentation, so all three candidates run side by side here off the same
 * data.
 *
 * The by-signature variant that was here previously has been dropped. It
 * was measured and rejected: unlimited use drops the work from 133
 * eliminations to 23, with 90% of signatures falling straight out of the
 * two anchors.
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

  // The whole output of the instrument: how many signatures sit in each
  // ring. No identities, no segments, no types.
  const counts = useMemo(() => {
    const perRing = new Array(RING_COUNT).fill(0) as number[];
    if (!active) return perRing;
    for (const q of active.quasars) perRing[sectorLookup.get(active.solution[q.id].sector)!.ring]++;
    return perRing;
  }, [active]);

  const [mode, setMode] = useState<RingScopeMode>("accumulate");
  const color = quasarColorHex(0);

  if (!active) {
    return (
      <LcarsPanel title="Prototype &mdash; Ring Survey" accent="bg-lcars-orange">
        <p className="text-sm text-lcars-ice/50">Preparing sample field&hellip;</p>
      </LcarsPanel>
    );
  }

  return (
    <LcarsPanel title="Prototype &mdash; Ring Survey" accent="bg-lcars-orange">
      <p className="text-sm text-lcars-ice/70 leading-relaxed mb-2">
        A census of the field by ring: how many signatures sit in each band,
        naming none of them. Replaces the Quadrant Survey, which slices the
        wrong axis &mdash; a quadrant spans all five rings, so it says almost
        nothing about how far out anything is, and that is the half of the
        ambiguity that matters.
        {!region && (
          <span className="text-lcars-amber">
            {" "}
            No active survey, so this is a throwaway sample field.
          </span>
        )}
      </p>
      <p className="text-xs text-lcars-ice/50 leading-relaxed mb-4">
        <span className="text-lcars-orange font-semibold">To settle:</span> the
        look. All three below show the identical census off the identical data
        &mdash; the only difference is what it feels like to read.
      </p>

      <div className="flex gap-1 mb-4">
        {(
          [
            ["sweep", "A · Sweep"],
            ["accumulate", "B · Sweep + hold"],
            ["static", "C · Instant"],
          ] as [RingScopeMode, string][]
        ).map(([id, label], i, arr) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              playButtonClick();
              setMode(id);
            }}
            className={`flex-1 lcars-caps text-[11px] font-semibold px-2 py-1.5 cursor-pointer transition-colors ${
              i === 0 ? "rounded-l-full" : i === arr.length - 1 ? "rounded-r-full" : ""
            } ${
              mode === id
                ? "bg-lcars-orange text-black"
                : "bg-lcars-control text-lcars-ice/70 hover:bg-white/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stacked, not columns. Tailwind's breakpoints measure the viewport,
          but `main` is only ~500px even on a 1344px desktop - the Star Map
          sidebar and both rails take the rest - so a two-column split
          squeezed the dial to ~215px and bunched the ring labels together. */}
      <RingScope counts={counts} color={color} mode={mode} visible />

      <LcarsBreak className="mt-5" />
      <div className="pt-4">
        <div className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50 mb-2">
          D &middot; No dial, for comparison
        </div>
        <RingCensusLadder counts={counts} color={color} />
        <p className="text-[11px] text-lcars-ice/45 leading-relaxed mt-3">
          The most legible option and the least characterful. It also throws
          away the one thing the dial gives for free: rings <em>are</em>{" "}
          radial, so a count maps onto the Star Map with nothing to translate.
        </p>
      </div>

      <LcarsBreak className="mt-5" />
      <div className="pt-4 text-xs text-lcars-ice/50 leading-relaxed">
        <p className="mb-2">
          <span className="text-lcars-ice/70 font-semibold">A &middot; Sweep</span>{" "}
          &mdash; returns flash as the gate crosses them and fade behind it, like
          the Sweep Scope. Most characterful, but you have to watch a whole
          pass and remember five numbers.
        </p>
        <p className="mb-2">
          <span className="text-lcars-ice/70 font-semibold">
            B &middot; Sweep + hold
          </span>{" "}
          &mdash; identical, except a crossed ring keeps its count. One pass
          leaves the finished census on screen. Keeps the instrument&apos;s
          character without making it a memory test.
        </p>
        <p>
          <span className="text-lcars-ice/70 font-semibold">C &middot; Instant</span>{" "}
          &mdash; no animation at all. Honest about being a readout rather than a
          live sensor, and the fastest to use.
        </p>
      </div>
    </LcarsPanel>
  );
}
