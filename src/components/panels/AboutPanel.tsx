import { LcarsPanel } from "@/components/LcarsShell";
import { GAME_NAME } from "@/lib/copy";

/**
 * Credits, and the attribution the user agreed to give on 2026-08-11.
 *
 * Its own destination rather than a section inside Station Info, at the
 * user's request: Station Info is in-fiction - decks, crew, quasar
 * classifications - and this is the one page that steps outside the game to
 * talk about who made the thing it is imitating. Burying that under a lore
 * panel made it look like more lore.
 *
 * Worth being precise about what is owed to whom. None of TheLCARS.com's
 * code is used here - its EULA covers its template files, and this project
 * vendors none of them. What it gave us is knowledge: the log-list idiom and
 * the section headers were built from measurements of its pages, and its
 * documentation is where the answer to "what was LCARS actually set in" came
 * from. The credit is given because it is deserved, not because the licence
 * compels it.
 */
export function AboutPanel() {
  return (
    <div className="flex flex-col gap-4">
      <LcarsPanel title="About" accent="bg-lcars-tan" size="lg">
        <p className="text-sm text-lcars-ice/70 leading-relaxed mb-4">
          <strong className="text-lcars-ice">{GAME_NAME}</strong> is a
          deep-space quasar classification puzzle, played through a Star Trek
          LCARS console.
        </p>

        <h3 className="lcars-caps text-xs tracking-wider text-lcars-tan mb-1.5">
          LCARS
        </h3>
        <p className="text-sm text-lcars-ice/70 leading-relaxed mb-4">
          The LCARS interface was designed by{" "}
          <strong className="text-lcars-ice">Michael Okuda</strong> for Star
          Trek: The Next Generation, and is the property of Paramount. This is
          a fan work, built for the love of the thing and not for sale.
        </p>

        <h3 className="lcars-caps text-xs tracking-wider text-lcars-tan mb-1.5">
          Reference
        </h3>
        <p className="text-sm text-lcars-ice/70 leading-relaxed mb-4">
          Guidance from{" "}
          <a
            href="https://www.thelcars.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="lcars-caps underline underline-offset-2 text-lcars-tan hover:text-lcars-amber"
          >
            TheLCARS.com
          </a>{" "}
          by Jim Robertus &mdash; its published colour guide, its notes on the
          typeface, and its news-log layout, which this project&apos;s section
          headers and log lists were built from. None of its template code is
          used here; the debt is to the documentation.
        </p>

        <h3 className="lcars-caps text-xs tracking-wider text-lcars-tan mb-1.5">
          Type
        </h3>
        <p className="text-sm text-lcars-ice/70 leading-relaxed">
          Set in <strong className="text-lcars-ice">Antonio</strong>, standing
          in for the Helvetica Ultra Compressed that Okuda has said he mostly
          used &mdash; a face no browser can be assumed to have.
        </p>
      </LcarsPanel>
    </div>
  );
}
