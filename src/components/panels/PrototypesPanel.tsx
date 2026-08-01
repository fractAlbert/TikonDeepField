"use client";

import { useMemo } from "react";
import { Region } from "@/lib/puzzle-types";
import { buildSectors } from "@/lib/grid";
import { quasarColorHex } from "@/lib/quasar-colors";
import { LcarsPanel } from "@/components/LcarsShell";
import { RingScope, RingSignature } from "@/components/ringsurvey/RingScope";

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
 * has to answer is "how does this feel next to the Sweep Scope" - and that
 * needs the real region, the real signatures and the real colours.
 *
 * Deliberately NOT wired into the navigation. Reading it does not cost a
 * thing here, and unlimited use very nearly solves the puzzle outright (see
 * the measured figures in the panel copy), so shipping it as-is would be a
 * decision about difficulty made by accident.
 */
function RingSurveyPrototype({ region }: { region: Region | null }) {
  const signatures: RingSignature[] = useMemo(
    () =>
      region
        ? region.quasars.map((q, i) => ({
            id: q.designation,
            label: q.designation,
            color: quasarColorHex(i),
            ring: sectorLookup.get(region.solution[q.id].sector)!.ring,
          }))
        : [],
    [region]
  );

  return (
    <LcarsPanel title="Live Prototype — Ring Survey" accent="bg-lcars-orange">
      <p className="text-sm text-lcars-ice/70 leading-relaxed mb-3">
        A range gate walks outward from the centre of the field. Pick a
        signature and the ring holding it lights as the gate crosses it, then
        fades. It reports a ring and nothing else &mdash; no segment, no
        bearing.
      </p>
      <p className="text-xs text-lcars-ice/50 leading-relaxed mb-4">
        <span className="text-lcars-orange font-semibold">Open question:</span>{" "}
        how much of it to allow. Measured over 3000 regions, unlimited use
        takes the share that cannot be solved at all from{" "}
        <span className="font-mono">~19%</span> to{" "}
        <span className="font-mono">~0.1%</span> &mdash; it is a near-perfect
        antidote, because the dominant ambiguity is a signature sliding one
        ring out and one segment over. That is also the worry: it hands over
        half the coordinate. A budget lands in between &mdash; 1 survey{" "}
        <span className="font-mono">12.5%</span>, 2{" "}
        <span className="font-mono">7.9%</span>, 3{" "}
        <span className="font-mono">3.6%</span> &mdash; and makes{" "}
        <em>which signature to spend it on</em> a decision rather than a
        formality.
      </p>

      {signatures.length > 0 ? (
        /* Always visible: unlike the Sweep Scope, this panel unmounts when
           you navigate away, so the scope is only ever alive on screen and
           its ping can't fire from a background panel. */
        <RingScope signatures={signatures} visible />
      ) : (
        <p className="text-sm text-lcars-ice/50">
          No active survey &mdash; select or generate a region to try this.
        </p>
      )}
    </LcarsPanel>
  );
}
