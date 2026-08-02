import { LcarsPanel } from "@/components/LcarsShell";
import { PANEL_LABELS } from "@/lib/copy";
import { RING_SCAN_LIMIT, currentFilingLimit } from "@/lib/survey-log";
import { DEMOTION_RETRACTED, PROMOTION_CONFIRMED, REVIEW_WINDOW } from "@/lib/ranks";

export function HelpPanel() {
  return (
    <div className="flex flex-col gap-4">
      <LcarsPanel title="How to Survey a Region" accent="bg-lcars-ice">
        <ol className="flex flex-col gap-3 text-sm text-lcars-ice/90 leading-relaxed list-decimal list-inside">
          <li>
            {/* The `{" "}` after each </strong> is load-bearing, not
                formatting: a JSX text node that opens with a space, wraps
                across lines and contains an entity (&mdash;, &apos;)
                loses that space, which is how this list came to read
                "Briefingpanel" and "Star Manifestfor". */}
            Pick a region on the <strong className="text-lcars-orange">Briefing</strong>{" "}
            panel and read its logged bearings &mdash; each one is a true statement about
            where the region&apos;s quasar signatures sit and what they are.
          </li>
          <li>
            Check <strong className="text-lcars-lilac">Star Manifest</strong>{" "}
            for the roster of every signature logged so far, by name and color &mdash; that&apos;s
            how you connect a name mentioned in a clue (like &ldquo;3C 273&rdquo;)
            to what you actually see on the Sweep Scope or Star Map.
          </li>
          <li>
            Watch the <strong className="text-lcars-violet">Sweep Scope</strong> for another
            angle on the same field: signatures flash in the order the sweep line
            crosses them, and the gaps between flashes are meaningful too.
          </li>
          <li>
            Stuck on one signature? <strong className="text-lcars-salmon">Ring Scan</strong>{" "}
            aims the array at it and returns the ring it sits in &mdash; that and
            nothing else. You get {RING_SCAN_LIMIT} per region, so spend them on
            the signatures you genuinely cannot place: one aimed at a signature
            you would have worked out anyway is wasted.
          </li>
          <li>
            Cross-reference all of the above to deduce each signature&apos;s
            type and sector, then place it on the{" "}
            <strong className="text-lcars-amber">Star Map</strong>: arm a
            signature, click a field cell to place it, or switch to Rule Out
            to mark cells it definitely isn&apos;t at.
          </li>
          <li>
            When the whole field is placed,{" "}
            <strong className="text-lcars-teal">File Classification</strong>. A filing that
            matches the catalog is confirmed; one that doesn&apos;t comes back with a count
            of how many signatures are inconsistent, and nothing else. You get{" "}
            {currentFilingLimit()}
            {" filings per region"}, and if the last one is still wrong the entry
            is retracted. If you can&apos;t crack it,{" "}
            <strong className="text-lcars-ice">Withdraw</strong>{" "}
            releases the region unresolved &mdash; that costs you nothing.
          </li>
          <li>
            Out of regions?{" "}
            <strong className="text-lcars-orange">{PANEL_LABELS.surveyNewRegion}</strong>{" "}
            in the navigation generates a fresh field and takes you straight
            to its Briefing &mdash; a random 6-8 signatures with a fresh set
            of bearings to work from.
          </li>
        </ol>
      </LcarsPanel>

      <LcarsPanel title="Rank" accent="bg-lcars-lilac">
        <p className="text-sm text-lcars-ice/80 leading-relaxed">
          Every {REVIEW_WINDOW} closed regions the station reviews your record.{" "}
          {PROMOTION_CONFIRMED} or more confirmed promotes you; {DEMOTION_RETRACTED}
          {" or more retracted demotes you. "}
          Withdrawals count as neither, so playing it safe holds your
          rank and stalls your career &mdash; which is the only reason to ever risk a filing.
          Your record, the ladder and the current review are on the{" "}
          <strong className="text-lcars-lilac">Officer</strong> panel.
        </p>
        <p className="text-sm text-lcars-ice/80 leading-relaxed mt-3">
          Rank also decides how many filings you get. A technician gets four
          and can afford to be wrong twice; a Chief of Survey gets two. The
          higher you go, the less room there is to correct yourself.
        </p>
        <p className="text-sm text-lcars-ice/60 leading-relaxed mt-3">
          Some regions genuinely cannot be resolved &mdash; the instruments return identical
          readings for two different answers about one region in five. Withdrawing is the
          right call on those, and the review is calibrated to expect it.
        </p>
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
