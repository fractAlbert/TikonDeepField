import { LcarsPanel } from "@/components/LcarsShell";

export function HelpPanel() {
  return (
    <div className="flex flex-col gap-4">
      <LcarsPanel title="How to Survey a Region" accent="bg-lcars-ice">
        <ol className="flex flex-col gap-3 text-sm text-lcars-ice/90 leading-relaxed list-decimal list-inside">
          <li>
            Pick a region on the <strong className="text-lcars-orange">Briefing</strong> panel
            and read its logged bearings &mdash; each one is a true statement about
            where the region&apos;s quasar signatures sit and what they are.
          </li>
          <li>
            Check <strong className="text-lcars-lilac">Star Manifest</strong> for the roster of
            every signature logged so far, by name and color &mdash; that&apos;s
            how you connect a name mentioned in a clue (like &ldquo;3C 273&rdquo;)
            to what you actually see on the Sweep Scope or Star Map.
          </li>
          <li>
            Watch the <strong className="text-lcars-violet">Sweep Scope</strong> for another
            angle on the same field: signatures flash in the order the sweep line
            crosses them, and the gaps between flashes are meaningful too.
          </li>
          <li>
            Check <strong className="text-lcars-salmon">Quadrant Survey</strong> for a census of
            any single quadrant &mdash; how many signatures sit in it and what
            they&apos;re classified as, without giving away which ring, which
            bearing, or which specific signature.
          </li>
          <li>
            Cross-reference all of the above to deduce each signature&apos;s
            type and sector, then place it on the{" "}
            <strong className="text-lcars-amber">Star Map</strong>: arm a
            signature, click a field cell to place it, or switch to Rule Out
            to mark cells it definitely isn&apos;t at.
          </li>
          <li>
            Out of regions? <strong className="text-lcars-orange">Survey New Region</strong> in
            the right-hand rail generates a fresh field and takes you straight
            to its Briefing &mdash; a random 6-8 signatures with a fresh set
            of bearings to work from.
          </li>
        </ol>
      </LcarsPanel>

      <LcarsPanel title="Status" accent="bg-lcars-teal">
        <p className="text-sm text-lcars-ice/80 leading-relaxed">
          This is an early build. Check the{" "}
          <strong className="text-lcars-teal">Prototypes</strong> panel for
          earlier design explorations kept around for reference.
        </p>
      </LcarsPanel>
    </div>
  );
}
