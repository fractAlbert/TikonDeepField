import { LcarsPanel } from "@/components/LcarsShell";

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

export function PrototypesPanel() {
  return (
    <div className="flex flex-col gap-4">
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
