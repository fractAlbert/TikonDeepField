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
