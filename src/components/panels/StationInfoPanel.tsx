"use client";

import { useState } from "react";
import { ButtonColor, SOLID_BG, runShape } from "@/lib/lcars-colors";
import { LcarsPanel } from "@/components/LcarsShell";
import { LcarsButton } from "@/components/LcarsButton";
import { OutpostLogo } from "@/components/OutpostLogo";
import { StationSchematic } from "@/components/StationSchematic";
import { OUTPOST_NAME } from "@/lib/copy";

type SectionId = "overview" | "size" | "value" | "survey" | "schematic";

const SECTIONS: { id: SectionId; label: string; color: ButtonColor }[] = [
  { id: "overview", label: "Overview", color: "orange" },
  { id: "size", label: "Size & Crew", color: "amber" },
  { id: "value", label: "Why It Matters", color: "violet" },
  { id: "survey", label: "Survey Process", color: "lilac" },
  { id: "schematic", label: "Schematic", color: "teal" },
];

export function StationInfoPanel({ onBack }: { onBack: () => void }) {
  const [section, setSection] = useState<SectionId>("overview");
  const current = SECTIONS.find((s) => s.id === section)!;

  // Bumped every time "Schematic" is selected, so keying SchematicSection on
  // it forces a fresh mount - and therefore a fresh true-scale-to-
  // operational replay - each time you land back on that section.
  const [schematicVisit, setSchematicVisit] = useState(0);
  function selectSection(id: SectionId) {
    if (id === "schematic") setSchematicVisit((n) => n + 1);
    setSection(id);
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <LcarsPanel className="shrink-0">
        <div className="flex items-center gap-4">
          <OutpostLogo size={56} />
          <div className="flex-1 min-w-0">
            <div className="lcars-caps text-lg font-bold text-lcars-amber leading-none">
              {OUTPOST_NAME}
            </div>
            <div className="text-xs text-lcars-ice/50 mt-1">Station Information</div>
          </div>
          <LcarsButton color="ice" onClick={onBack}>
            Back
          </LcarsButton>
        </div>
      </LcarsPanel>

      <div className="flex flex-nowrap gap-1 shrink-0 overflow-x-auto">
        {SECTIONS.map((s, i) => (
          <LcarsButton
            key={s.id}
            color={s.color}
            shape={runShape(i, SECTIONS.length)}
            orientation="horizontal"
            onClick={() => selectSection(s.id)}
            className={section === s.id ? "" : "opacity-55"}
          >
            {s.label}
          </LcarsButton>
        ))}
      </div>

      <LcarsPanel title={current.label} accent={SOLID_BG[current.color]} className="flex-1 min-h-0">
        <div className="h-full overflow-y-auto no-scrollbar">
          {section === "overview" && <OverviewSection />}
          {section === "size" && <SizeCrewSection />}
          {section === "value" && <WhyItMattersSection />}
          {section === "survey" && <SurveyProcessSection />}
          {section === "schematic" && <SchematicSection key={schematicVisit} />}
        </div>
      </LcarsPanel>
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 text-sm md:text-base text-lcars-ice/90 leading-relaxed max-w-3xl">
      {children}
    </div>
  );
}

function OverviewSection() {
  return (
    <Prose>
      <p>
        Tikon Research Station is a deep-space outpost built for one purpose: finding and
        confirming quasar signatures at the edge of surveyed space. It doesn&apos;t do anything
        else. There&apos;s no trade function, no defense role, no diplomatic staff. The station
        exists because someone has to turn faint, ambiguous sensor returns into confirmed
        entries in the regional quasar catalog, and Tikon is where that work happens.
      </p>
      <p>
        The name comes from Tikon&apos;s Star, the dim variable the station orbits at a stable
        trailing Lagrange point. The star itself isn&apos;t interesting. It was picked because
        its position keeps background interference low, which matters more than anything else
        for long-baseline sensor work.
      </p>
    </Prose>
  );
}

function SizeCrewSection() {
  return (
    <Prose>
      <p>
        Tikon is a mid-size station, six decks, built around a central isolinear processing
        core rather than the saucer or ring layouts more common elsewhere. Standard crew runs
        40 to 60, and most of them work sensors or classification in one form or another.
        There isn&apos;t much of a support staff to speak of.
      </p>
      <p>
        The most noticeable thing about the station, if you saw it from outside, wouldn&apos;t
        be the hull. It&apos;s the sensor array, which extends well past the main structure and
        honestly dwarfs it. Tikon was built around its instruments, not the other way around.
      </p>
      <p>
        Rotations here run long. Nobody passes through Tikon on the way to somewhere else -
        there&apos;s nothing beyond it worth passing through to. Everyone stationed here is
        here for the survey work itself, which tends to filter for a particular kind of crew.
      </p>
    </Prose>
  );
}

function WhyItMattersSection() {
  return (
    <Prose>
      <p>
        Quasars are far enough away that their position in the sky doesn&apos;t shift no
        matter how a ship moves relative to them. That makes a confirmed quasar, type
        classified and sector fixed, useful as a stationary reference point for navigation and
        sensor calibration. It&apos;s basically the same reason quasars get used for
        long-range navigation fixes in real life.
      </p>
      <p>
        An unconfirmed quasar reading is just noise. It might be real, it might not, and
        nobody can build anything on top of it. Once it&apos;s confirmed, though, it becomes
        something every ship and station in the region can check its own position against.
        That&apos;s really the output of this station - not big discoveries, just a slowly
        growing set of fixed points other people rely on without knowing where they came from.
      </p>
    </Prose>
  );
}

function SurveyProcessSection() {
  return (
    <Prose>
      <p>
        The instruments never hand over a clean answer. What comes in is partial, and has to
        be cross-checked by hand against everything else on file.
      </p>
      <p>
        Logged bearings are the closest thing to a direct hit - a sector fix, a quadrant, a
        confirmed type, or a confirmed relationship between two signatures. The Sweep Scope
        gives a relative-distance reading off a rotating single-line sensor pass, which is
        mainly useful when nothing else pins a signature down. A Quadrant Survey is more of a
        coarse census - how many signatures are in a region and what they&apos;re classified
        as, without saying where exactly or which one is which.
      </p>
      <p>
        No single instrument is enough on its own. Resolving a full region, getting every
        signature assigned a confirmed type and sector, takes someone cross-referencing all of
        it by hand. That&apos;s the actual job of a science officer here, and it&apos;s why the
        position still exists instead of being handed off to an automated logging system.
      </p>
    </Prose>
  );
}

function SchematicSection() {
  return (
    <div className="flex flex-col items-center gap-4">
      <StationSchematic className="w-full max-w-xl h-auto" />
      <p className="text-sm text-lcars-ice/60 leading-relaxed max-w-xl text-center">
        Six decks around a central isolinear core, with the sensor array extending well past
        the hull itself. The array is the part actually worth looking at - the hull mostly
        just holds the crew that keeps it running.
      </p>
    </div>
  );
}
