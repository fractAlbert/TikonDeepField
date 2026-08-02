"use client";

import { useState } from "react";
import { ButtonColor, SOLID_BG, runShape } from "@/lib/lcars-colors";
import { LcarsPanel } from "@/components/LcarsShell";
import { LcarsButton } from "@/components/LcarsButton";
import { OutpostLogo } from "@/components/OutpostLogo";
import { StationSchematic } from "@/components/StationSchematic";
import { OUTPOST_NAME } from "@/lib/copy";

type SectionId = "overview" | "size" | "value" | "survey" | "quasars" | "schematic";

const SECTIONS: { id: SectionId; label: string; color: ButtonColor }[] = [
  { id: "overview", label: "Overview", color: "orange" },
  { id: "size", label: "Size & Crew", color: "amber" },
  { id: "value", label: "Why It Matters", color: "violet" },
  { id: "survey", label: "Survey Process", color: "lilac" },
  { id: "quasars", label: "Quasars", color: "salmon" },
  { id: "schematic", label: "Schematic", color: "teal" },
];

/**
 * Corner rounding per slot, per layout. LCARS only rounds the *outer* ends
 * of a touching run, so which slot is an end depends on how many columns
 * there are - and that changes at the breakpoint. Written out as literal
 * class names rather than built from `runShape`, because the shape is now
 * a responsive property and `runShape` returns one answer for one row.
 *
 * Below `lg`: two rows of three, so slots 0 and 3 open a row and 2 and 5
 * close one. At `lg`: a single row of six, so only 0 and 5 are ends and
 * everything else is cut flat.
 *
 * Six sections divides evenly by three, which is why the unlabelled filler
 * that used to pad the phone layout is gone - the rows are even on their
 * own now.
 */
const SLOT_SHAPES = [
  "rounded-l-full",
  "rounded-none",
  "rounded-r-full lg:rounded-none",
  "rounded-l-full lg:rounded-none",
  "rounded-none",
  "rounded-r-full",
];

export function StationInfoPanel({
  onBack,
  /**
   * False on a phone, where the shell's panel bar already carries both the
   * station name and a Back button - keeping this block too would show the
   * same title twice and two Backs pointing to different places, for 84px
   * that the prose sections would rather have.
   */
  showHeader = true,
}: {
  onBack: () => void;
  showHeader?: boolean;
}) {
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
      {showHeader && (
        <LcarsPanel className="shrink-0">
          <div className="flex items-center gap-4">
            <OutpostLogo size={56} className="shrink-0" />
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
      )}

      {/* A grid rather than wrapped flex rows, so the column count is a
          single responsive property: three across below `lg`, all six in
          one row at `lg` and up. Six divides evenly by three, so the phone
          layout is two even rows with no filler slot needed.

          `whitespace-nowrap` is deliberately absent. Six labels do not fit
          across `main` on one line - it is only ~500px at 1344px wide, the
          Star Map sidebar and both rails having taken the rest - so the
          long ones wrap to a second line and the grid levels every button
          to the same height. The previous layout wrapped into rows to solve
          the same problem; this solves it inside the buttons instead. */}
      <div className="shrink-0 grid grid-cols-3 lg:grid-cols-6 gap-1">
        {SECTIONS.map((s, i) => (
          <LcarsButton
            key={s.id}
            color={s.color}
            shape="block"
            orientation="horizontal"
            onClick={() => selectSection(s.id)}
            /* min-h-11 is the 44px touch floor from the project rules -
               these tabs were 34px before, which was under it. Desktop is
               taller than that anyway once the long labels wrap, so it only
               bites on a phone. */
            className={`min-w-0 min-h-11 px-1.5 md:px-3 text-sm leading-tight ${SLOT_SHAPES[i]} ${
              section === s.id ? "" : "opacity-55"
            }`}
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
          {section === "quasars" && <QuasarSection />}
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
        mainly useful when nothing else pins a signature down. A Ring Scan is the one
        instrument that answers a question directly - it locks onto a single signature and
        returns the ring it sits in - but holding that resolution costs the array dearly, so
        there are only ever a couple of them per region.
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

/**
 * The six classifications in `TYPE_CATALOG` (generate-region.ts), written
 * out. Kept beside the prose rather than imported from the generator on
 * purpose: the generator's list is data the puzzle draws from, and this is
 * editorial copy about it. If a type is ever added there without a note
 * here, the sub-tab list below simply won't offer it - a visible gap
 * rather than a crash.
 *
 * The names are the station's own working taxonomy, not formal
 * astrophysics, and the copy says so. What is real: quasars are the
 * luminous cores of distant galaxies powered by matter falling onto a
 * supermassive black hole, they are far enough away that their apparent
 * positions do not measurably shift, and that is exactly why real
 * astronomers use them to define celestial reference frames.
 */
const QUASAR_CLASSES: { id: string; name: string; blurb: string; body: string[] }[] = [
  {
    id: "pulsar",
    name: "Pulsar-Class",
    blurb: "Output varies on a regular, short cycle.",
    body: [
      "A source whose brightness rises and falls on a repeating cycle short enough to catch inside a single observing run. The variation comes from the accretion disc itself - matter piling up and falling in unevenly - not from anything rotating.",
      "The name is a misnomer and everyone knows it. An actual pulsar is a neutron star, a completely different object on a completely different scale. The label stuck from an early catalogue that guessed wrong, and renaming a classification means reissuing every chart that references it, so it has never been worth the trouble.",
    ],
  },
  {
    id: "binary",
    name: "Binary-Class",
    blurb: "Logs as one source, resolves as two.",
    body: [
      "Two sources close enough together that a coarse survey records a single return. Sometimes that is genuinely two active cores in a merging pair of galaxies. More often it is one quasar whose light has been bent around an intervening mass and arrives twice, from slightly different directions - a gravitational lens.",
      "This is the classification most likely to cause an error in the catalogue rather than in the sky. A double logged as one entry, or one logged as two, propagates to everybody downstream. It is the reason confirmation work exists.",
    ],
  },
  {
    id: "redshift",
    name: "Redshift Anomaly",
    blurb: "A distance estimate that does not fit its neighbours.",
    body: [
      "Distance to a quasar is inferred from redshift: the further away it is, the further its light has been stretched toward the red end of the spectrum on the way here. A Redshift Anomaly is a source whose figure does not sit comfortably with everything around it.",
      "Almost always the explanation is dull - gas between here and there imprinting absorption lines that skew the reading, or a measurement taken through too much interference. Occasionally it is not dull, and those are the entries that get looked at twice.",
    ],
  },
  {
    id: "rogue",
    name: "Rogue Emission",
    blurb: "Strong output, no host anyone can find.",
    body: [
      "A source putting out plenty of energy with no identifiable galaxy around it in any imagery on file. Quasars sit at the centre of galaxies, so a quasar without one is a contradiction in terms.",
      "Usually the host is simply too faint against the glare of its own core, which outshines everything else in the galaxy combined. The classification is an admission of ignorance more than a description - it means the paperwork is incomplete, not that the object is strange.",
    ],
  },
  {
    id: "relic",
    name: "Ancient Relic",
    blurb: "Among the oldest light the station handles.",
    body: [
      "Very high redshift, which is to say very far away, which is to say very long ago. The light logged from an Ancient Relic left its source before most of the structure in the surrounding sky had finished forming.",
      "They are faint and they are difficult, and they are also the most useful reference points there are. A fixed mark is worth more the further off it sits, and nothing on file sits further off than these.",
    ],
  },
  {
    id: "dormant",
    name: "Dormant Core",
    blurb: "The engine has largely stopped.",
    body: [
      "The black hole has run out of convenient matter to fall into it and the core has faded. Strictly it is no longer a quasar at all - what remains is the galaxy and a very massive, very quiet object at its centre.",
      "They stay in the catalogue because position is what the catalogue is for, and the position has not changed. A dormant core is still exactly where it was; it is simply harder to find again if anyone ever loses it.",
    ],
  },
];

function QuasarSection() {
  const [openClass, setOpenClass] = useState<string | null>(null);
  const current = QUASAR_CLASSES.find((c) => c.id === openClass) ?? null;

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <Prose>
        <p>
          A quasar is the core of a distant galaxy with a supermassive black hole at the
          middle of it, pulling in matter fast enough that the infalling material heats and
          blazes. The result outshines every star in the surrounding galaxy put together,
          which is the only reason anything this far away is visible at all.
        </p>
        <p>
          Distance is the whole point. These objects are so remote that nothing a ship, a
          station or a planet can do produces any measurable shift in where they appear to
          sit. Move across a system, across a sector, across a decade &mdash; a quasar stays
          put. A
          nearby star will not do that. That is what makes a confirmed quasar useful as a
          fixed mark to measure against, and it is why the catalogue is worth the trouble of
          maintaining.
        </p>
        <p>
          The classifications below are Tikon&apos;s own working taxonomy, not formal
          astrophysics. They describe how a source behaves and what tends to go wrong when
          logging it. Assigning one is spectroscopic work done elsewhere; when it has been
          done, it arrives with the briefing. Your job is the position.
        </p>
      </Prose>

      {/* Sub-tabs rather than six more headings: the classifications are
          reference material you look one thing up in, not a passage read
          straight through.

          Shaped as a touching run with per-row caps, same as the section
          tabs above - but held at three columns at *every* width, and at a
          smaller scale, so it never lines up as a second peer row of six on
          desktop. Hierarchy comes from size and from all six sharing the
          section's own salmon rather than each carrying its own colour,
          which is the reference image's habit of letting colour encode
          grouping. */}
      <div className="grid grid-cols-3 gap-1">
        {QUASAR_CLASSES.map((c, i) => (
          <LcarsButton
            key={c.id}
            color="salmon"
            shape={runShape(i % 3, 3)}
            orientation="horizontal"
            onClick={() => setOpenClass(openClass === c.id ? null : c.id)}
            className={`min-w-0 min-h-11 px-1.5 md:px-2 text-xs leading-tight ${
              openClass === c.id ? "" : "opacity-45"
            }`}
          >
            {c.name}
          </LcarsButton>
        ))}
      </div>

      {current ? (
        /* Nested black sub-panel - the reference image's way of showing
           that a block belongs to the composition around it rather than
           sitting beside it. */
        <div className="rounded-lg bg-black/30 p-4">
          <div className="lcars-caps text-sm font-bold text-lcars-salmon">{current.name}</div>
          <div className="text-xs text-lcars-ice/50 mt-0.5 mb-3">{current.blurb}</div>
          <div className="flex flex-col gap-3 text-sm text-lcars-ice/85 leading-relaxed">
            {current.body.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {QUASAR_CLASSES.map((c) => (
            <li key={c.id} className="flex flex-wrap gap-x-3 text-sm">
              <span className="lcars-caps text-lcars-salmon/80 w-36 shrink-0">{c.name}</span>
              <span className="text-lcars-ice/60 leading-relaxed">{c.blurb}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
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
