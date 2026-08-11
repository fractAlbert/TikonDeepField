"use client";

import { ReactNode, useState } from "react";
import {
  BUTTON_COLORS,
  ButtonColor,
  SOLID_BG,
  runShape,
  shapeClasses,
} from "@/lib/lcars-colors";
import { LcarsButton } from "@/components/LcarsButton";
import { LcarsPanel } from "@/components/LcarsShell";
import { playButtonClick } from "@/lib/sound";

/**
 * A specimen sheet for the LCARS vocabulary this project uses: every shape,
 * colour, type step and composite block in one place, each captioned with
 * the rule it is demonstrating.
 *
 * ## Why it exists
 *
 * `docs/lcars-style-notes.md` is prose about a JPEG. That is enough to argue
 * from and not enough to build from - three separate passes over the phone
 * bars got the caps backwards, and each time the fix came from cropping the
 * reference and looking rather than from re-reading the rule. So this is the
 * rule *rendered*, in the app's own components, at the app's own sizes.
 *
 * It is deliberately not a component library. Nothing here is meant to be
 * imported; the shipped primitives are `LcarsButton`, `LcarsPanel` and
 * `lib/lcars-colors`, and this sheet uses them wherever it can precisely so
 * that a specimen going wrong means the primitive is wrong.
 *
 * ## Read off the image, not off the notes
 *
 * Everything in "Data rows" was measured from crops of
 * `docs/reference/LCARS-2.jpg` (the centre columns) on 2026-08-06, and one
 * of those measurements contradicted the notes, which had the opening stub
 * rounded on its outer end. It is the other way round: the stub is **flat
 * where it faces the block's edge and rounded where it faces the row**. The
 * notes were corrected rather than the specimen.
 *
 * That reading is also what the phone bars ended up doing independently, so
 * the two now agree: flat toward the frame, rounded toward the content.
 *
 * ## Sectioned rather than stacked
 *
 * Six sections behind a sub-run of tabs, one open at a time, because the
 * whole sheet stacked is several screens tall - 4725px on a phone, measured
 * 2026-08-10. That is accepted rather than a defect: the sheet is a
 * reference and scrolling one is normal, which is how the old backlog item 7
 * was closed. The tab run is itself a specimen: fixed three columns at every
 * width, one colour for the group, unselected slots dimmed, per-row caps -
 * the sub-run rule from the style notes, which Station Info's Quasars
 * section also follows.
 *
 * ## Corrections made to this sheet
 *
 * A specimen that is wrong is worse than no specimen, because this is what
 * gets checked instead of the notes. Recorded so neither comes back:
 *
 * - **"Vertical run" (fixed 2026-08-11).** It capped its column top and
 *   bottom and called itself the desktop nav rail. It was neither: no
 *   reference image contains a capped vertical column, the rail stopped
 *   doing it on 2026-08-07, and a cap is a half-circle of half the box's
 *   height - a mark on a 32px button, a lozenge on a tall filler. Now shows
 *   what the rail does: horizontal segments capped on the outer edge, and a
 *   square block for the foot.
 * - **The palette (fixed 2026-08-11).** It listed eight colours and was
 *   missing `alert` and `tan`, and badged every off-rotation colour with the
 *   word "alert" regardless of which one it was.
 */

type SectionId = "shapes" | "runs" | "colour" | "type" | "rows" | "blocks";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "shapes", label: "Shapes" },
  { id: "runs", label: "Runs" },
  { id: "colour", label: "Colour" },
  { id: "type", label: "Type" },
  { id: "rows", label: "Data rows" },
  { id: "blocks", label: "Blocks" },
];

export function LcarsKitPrototype() {
  const [section, setSection] = useState<SectionId>("shapes");

  return (
    <LcarsPanel title="Prototype &mdash; LCARS Pattern Kit" accent="bg-lcars-lilac">
      <p className="text-sm text-lcars-ice/70 leading-relaxed mb-2">
        Every shape, colour and composite block the project uses, drawn in the
        app&apos;s own components and captioned with the rule it demonstrates.
        The reference is <code className="text-lcars-amber">docs/reference/LCARS-2.jpg</code>;
        the rules are in <code className="text-lcars-amber">docs/lcars-style-notes.md</code>.
      </p>
      <p className="text-xs text-lcars-ice/50 leading-relaxed mb-4">
        <span className="text-lcars-lilac font-semibold">Use it for:</span>{" "}
        checking a new control against the language before building it, and
        for settling arguments about caps, which this project has now got
        backwards three times.
      </p>

      {/* Sub-run: fixed three columns at every width, per-row caps, one
          colour for the whole group with unselected slots dimmed. */}
      <div className="grid grid-cols-3 gap-1 mb-4">
        {SECTIONS.map((s, i) => (
          <LcarsButton
            key={s.id}
            color="lilac"
            shape={runShape(i % 3, 3)}
            orientation="horizontal"
            size="compact"
            onClick={() => setSection(s.id)}
            className={`min-w-0 min-h-11 text-xs leading-tight ${
              section === s.id ? "" : "opacity-45"
            }`}
          >
            {s.label}
          </LcarsButton>
        ))}
      </div>

      {/* The reference's nested sub-panel: a darker container saying "this
          belongs to the block above" without drawing a border. */}
      <div className="bg-lcars-black/40 rounded-lg p-4">
        {section === "shapes" && <ShapesSection />}
        {section === "runs" && <RunsSection />}
        {section === "colour" && <ColourSection />}
        {section === "type" && <TypeSection />}
        {section === "rows" && <RowsSection />}
        {section === "blocks" && <BlocksSection />}
      </div>
    </LcarsPanel>
  );
}

/** One captioned specimen: what it is, the thing itself, why it is that way. */
function Specimen({
  label,
  note,
  children,
}: {
  label: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="lcars-caps text-[10px] tracking-wider text-lcars-amber/80 mb-2">
        {label}
      </div>
      {children}
      {note && (
        <p className="text-[11px] text-lcars-ice/45 leading-relaxed mt-2">{note}</p>
      )}
    </div>
  );
}

/** Non-interactive coloured segment - the decorative half of the vocabulary. */
function Seg({
  color,
  shape = "block",
  vertical = false,
  className = "",
  children,
}: {
  color: ButtonColor;
  shape?: "pill" | "cap-start" | "cap-end" | "block";
  vertical?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`${SOLID_BG[color]} ${shapeClasses(
        shape,
        vertical ? "vertical" : "horizontal"
      )} lcars-caps text-black text-[11px] font-semibold flex items-center ${className}`}
    >
      {children}
    </div>
  );
}

function ShapesSection() {
  return (
    <>
      <Specimen
        label="The four shapes"
        note={
          <>
            <code>pill</code> stands alone. <code>cap-start</code> and{" "}
            <code>cap-end</code> are the two ends of a run;{" "}
            <code>block</code>{" "}
            is everything between. Horizontal orientation
            maps start/end to left/right, vertical to top/bottom &mdash; the
            same four names drive the desktop rail and the phone bars.
          </>
        }
      >
        <div className="flex flex-wrap gap-3">
          {(["pill", "cap-start", "block", "cap-end"] as const).map((s) => (
            <div key={s} className="flex flex-col gap-1">
              <Seg color="orange" shape={s} className="h-9 w-24 justify-center">
                {s === "block" ? "Block" : s === "pill" ? "Pill" : s === "cap-start" ? "Start" : "End"}
              </Seg>
              <code className="text-[10px] text-lcars-ice/40">{s}</code>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen
        label="Rounded terminates, flat continues"
        note={
          <>
            The intuition runs backwards, which is why this sheet exists. A
            rounded end is where a run <em>stops</em>; a flat end is a promise
            that it carries on. The flat end does not have to touch its
            neighbour &mdash; black grout is separation, not a break &mdash;
            but the neighbour has to be <em>visible</em>, or the cut reads as
            an amputation.
          </>
        }
      >
        <div className="flex items-stretch gap-1">
          <Seg color="violet" shape="cap-start" className="h-9 w-16 justify-center">
            Stops
          </Seg>
          <Seg color="violet" className="h-9 flex-1 justify-center">Carries on</Seg>
          <Seg color="violet" shape="cap-end" className="h-9 w-16 justify-center">
            Stops
          </Seg>
        </div>
      </Specimen>

      <Specimen
        label="Flat into the screen edge"
        note={
          <>
            The strongest continuation available: a run that ends flat{" "}
            <em>on the glass</em>{" "}
            reads as carrying on off-frame. Only the two
            phone bars do this, and they cancel the shell&apos;s gutter on
            that one side to reach the edge &mdash; flat with a strip of black
            beyond it is the amputated look again.
          </>
        }
      >
        <div className="rounded-md overflow-hidden bg-black/60">
          <div className="flex justify-end">
            <Seg color="amber" shape="cap-start" className="h-9 w-1/2 justify-center">
              Star Map
            </Seg>
          </div>
          <div className="h-2" />
          <div className="flex justify-start">
            <Seg color="lilac" shape="cap-end" className="h-9 w-1/2 justify-center">
              Star Manifest
            </Seg>
          </div>
        </div>
      </Specimen>

      <Specimen
        label="Interactive vs. decorative"
        note={
          <>
            Identical geometry, different behaviour: <code>INTERACTIVE_FILL</code>{" "}
            carries a hover colour and a pointer, <code>SOLID_BG</code>{" "}
            does not. Anything that looks like a button and does nothing is worse
            than nothing &mdash; see the stub the jump bar had to give back.
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <LcarsButton color="teal" shape="pill" onClick={() => {}} className="text-xs">
            Hover me
          </LcarsButton>
          <Seg color="teal" shape="pill" className="h-9 px-6 justify-center">
            Decoration
          </Seg>
        </div>
      </Specimen>
    </>
  );
}

function RunsSection() {
  const five = ["Briefing", "Manifest", "Sweep", "Ring Scan", "Log"];
  const seven = ["Briefing", "Star Map", "Manifest", "Sweep", "Ring Scan", "Log", "Help"];

  return (
    <>
      <Specimen
        label="A touching run"
        note={
          <>
            <code>runShape(i, n)</code> caps the outer ends and cuts every
            joint flat, so five buttons read as one bracket rather than five
            things. A run is for <em>siblings</em>{" "}
            &mdash; adjacency is not
            siblinghood, which is why the phone hub is a grid of separate
            pills instead.
          </>
        }
      >
        <div className="flex gap-1">
          {five.map((label, i) => (
            <LcarsButton
              key={label}
              color="salmon"
              shape={runShape(i, five.length)}
              orientation="horizontal"
              size="compact"
              onClick={() => {}}
              className="flex-1 min-w-0 min-h-11 text-[11px] leading-tight"
            >
              {label}
            </LcarsButton>
          ))}
        </div>
      </Specimen>

      <Specimen
        label="Wrapped: per-row caps, not one long run"
        note={
          <>
            The lower version computes <code>runShape(i % 3, 3)</code>{" "}
            so each row is its own bracket. The upper one runs the cap logic
            across all seven and lets it wrap. Look at the ends of the rows:
            upstairs the first row stops square on the right and the second
            starts square on the left, because the run believes it is still
            going and the layout has already moved it. Downstairs every row
            opens and closes rounded. Same data, one rule apart &mdash; and
            the difference is quiet enough that it ships unnoticed, which is
            the reason this specimen is here.
          </>
        }
      >
        <div className="lcars-caps text-[9px] tracking-wider text-lcars-red mb-1">
          Wrong &mdash; one run, wrapped
        </div>
        <div className="grid grid-cols-3 gap-1 mb-3">
          {seven.map((label, i) => (
            <Seg
              key={label}
              color="ice"
              shape={runShape(i, seven.length)}
              className="h-9 px-2 justify-center text-center"
            >
              {label}
            </Seg>
          ))}
        </div>
        <div className="lcars-caps text-[9px] tracking-wider text-lcars-teal mb-1">
          Right &mdash; a bracket per row
        </div>
        <div className="grid grid-cols-3 gap-1">
          {seven.map((label, i) => (
            <Seg
              key={label}
              color="ice"
              shape={runShape(i % 3, Math.min(3, seven.length - Math.floor(i / 3) * 3))}
              className="h-9 px-2 justify-center text-center"
            >
              {label}
            </Seg>
          ))}
        </div>
      </Specimen>

      <Specimen
        label="A column of segments — the desktop nav rail"
        note={
          <>
            <strong>The column is not a vertical run, and it has no caps of
            its own.</strong> Each row is a <em>horizontal</em> segment
            rounded on the rail&apos;s outer edge and flat toward the content,
            and the foot is a square block. Nothing rounds the top or bottom
            of the column, because a cap is a half-circle of half the
            box&apos;s height &mdash; the LCARS mark on a 32px button, a giant
            lozenge on a 460px filler.
          </>
        }
      >
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 w-28">
            {["Briefing", "Manifest", "Sweep"].map((label) => (
              <Seg key={label} color="orange" shape="cap-start" className="h-8 px-2 justify-end items-end">
                {label}
              </Seg>
            ))}
            {/* Square, and tall. This is the shape the specimen used to get
                wrong: it capped the column top and bottom, which is a shape
                no reference image contains and which the rail itself
                stopped doing on 2026-08-07. */}
            <Seg color="tan" shape="block" className="h-16" />
          </div>
          <p className="text-[11px] text-lcars-ice/45 leading-relaxed flex-1">
            The labels are bottom-weighted, not centred &mdash; measured at
            52px above to 27px below in a 117px cell in{" "}
            <code>lcars-ultra</code>, and 2.9:1 on{" "}
            <code>thelcars.com</code>&apos;s buttons. The filler carries no
            label and no behaviour; it is there so the rail reads as a solid
            edge rather than as buttons floating over black, and it runs off
            the bottom of the screen rather than stopping short of it.
          </p>
        </div>
      </Specimen>
    </>
  );
}

function ColourSection() {
  return (
    <>
      <Specimen
        label="The palette"
        note={
          <>
            Muted and desaturated throughout &mdash; retro-futuristic rather
            than sci-fi neon. <code>BUTTON_COLORS</code> is the seven-colour
            rotation used for anything that cycles. The three marked{" "}
            <em>off-rotation</em> are never handed out by cycling: each is
            assigned on purpose, for the reason given below.
          </>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
          {(
            ["orange", "amber", "salmon", "tan", "red", "alert", "lilac", "violet", "ice", "teal"] as ButtonColor[]
          ).map((c) => (
            <div key={c} className="flex flex-col">
              <Seg color={c} shape="pill" className="h-10 px-3 justify-between">
                <span>{c}</span>
                {!BUTTON_COLORS.includes(c) && (
                  <span className="text-[9px] opacity-70">off-rotation</span>
                )}
              </Seg>
            </div>
          ))}
        </div>
        <ul className="mt-2 text-[11px] text-lcars-ice/45 leading-relaxed list-disc pl-4">
          <li>
            <strong>red</strong> is the structural brick, the category colour
            for a bad outcome. Used freely in that role.
          </li>
          <li>
            <strong>alert</strong> is the saturated one, kept for something
            urgent and irreversible &mdash; used exactly once in the app.
          </li>
          <li>
            <strong>tan</strong> carries a whole mass rather than an accent.
            It is 12.76% of <code>LCARS-2.jpg</code>, the largest coloured
            area in that reference.
          </li>
        </ul>
      </Specimen>

      <Specimen
        label="Red is scarce and deliberate"
        note={
          <>
            One red in the entire reference image. Here it means alert or
            destructive and nothing else &mdash; Reset, an incorrect verify,
            a ruled-out cell. A directory of twelve controls with one red in
            it tells you which one to be careful with, and a directory with
            four reds tells you nothing.
          </>
        }
      >
        <div className="grid grid-cols-4 gap-1">
          {["WX NOP", "PE FCV", "AW SID", "DF GUP", "NM BOC", "FA RME", "SA WAS", "KI FIN"].map(
            (code) => (
              <Seg
                key={code}
                color={code === "SA WAS" ? "red" : "amber"}
                shape="pill"
                className="h-8 px-2 justify-center"
              >
                {code}
              </Seg>
            )
          )}
        </div>
      </Specimen>

      <Specimen
        label="Repetition is the signal"
        note={
          <>
            Colour encodes grouping, so the same colour repeating down a
            column is the point rather than a collision to avoid. The
            temptation to give every button its own colour is the single
            fastest way to stop looking like LCARS.
          </>
        }
      >
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 w-24">
            {(["violet", "violet", "ice", "violet", "ice", "violet"] as ButtonColor[]).map(
              (c, i) => (
                <Seg key={i} color={c} shape="pill" className="h-6 px-2 justify-end text-[10px]">
                  {["RI BER", "KR FER", "MI PIL", "KI FIT", "JE TAY", "ZA CAB"][i]}
                </Seg>
              )
            )}
          </div>
          <div className="flex flex-col gap-1 w-24">
            {BUTTON_COLORS.slice(0, 6).map((c, i) => (
              <Seg key={i} color={c} shape="pill" className="h-6 px-2 justify-end text-[10px]">
                {["RI BER", "KR FER", "MI PIL", "KI FIT", "JE TAY", "ZA CAB"][i]}
              </Seg>
            ))}
          </div>
          <p className="text-[11px] text-lcars-ice/45 leading-relaxed flex-1">
            Left: two groups. Right: six of something, or a fruit bowl. The
            data is identical.
          </p>
        </div>
      </Specimen>

      <Specimen
        label="Dimming means placed, not disabled"
        note={
          <>
            60% opacity is a note about the board &mdash; you have already put
            this one down &mdash; and never a disabled state. A dimmed control
            is still live, which is why the Ring Scan says so in as many
            words. Disabled is <code>opacity-40</code> plus{" "}
            <code>cursor-not-allowed</code>, and looks close enough that the
            distinction has to be carried by copy.
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <LcarsButton color="teal" shape="pill" size="compact" onClick={() => {}} className="text-xs">
            Available
          </LcarsButton>
          <LcarsButton
            color="teal"
            shape="pill"
            size="compact"
            onClick={() => {}}
            className="text-xs opacity-60"
          >
            Placed
          </LcarsButton>
          <LcarsButton color="teal" shape="pill" size="compact" disabled className="text-xs">
            Disabled
          </LcarsButton>
        </div>
      </Specimen>
    </>
  );
}

function TypeSection() {
  return (
    <>
      <Specimen
        label="The scale"
        note={
          <>
            Condensed, all-caps, geometric &mdash; Antonio here, with{" "}
            <code>.lcars-caps</code> adding the uppercase and the 0.04em
            letterspacing. Four steps do all the work: section title, label,
            readout, and a 10px meta line.
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <div className="lcars-caps text-sm font-semibold text-lcars-amber">
            Section title &mdash; 14px semibold
          </div>
          <div className="lcars-caps text-xs text-lcars-ice/80">
            Label &mdash; 12px, on a segment
          </div>
          <div className="lcars-caps text-3xl font-semibold text-lcars-ice leading-none">
            358
          </div>
          <div className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50">
            Meta &mdash; 10px, wide tracking, always dim
          </div>
        </div>
      </Specimen>

      <Specimen
        label="Numbers keep their leading zeros"
        note={
          <>
            <code>008</code>, not <code>8</code>. Fixed-width readouts are
            what make a column scan as instrument output instead of as text,
            and the zeros are doing that work even when the value is small.
          </>
        }
      >
        <div className="flex gap-6">
          <div className="flex flex-col items-end gap-1">
            {["008", "017", "007", "061", "003"].map((n) => (
              <span key={n} className="lcars-caps text-xl text-lcars-amber leading-none">
                {n}
              </span>
            ))}
            <span className="lcars-caps text-[10px] text-lcars-teal mt-1">Reads as a gauge</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            {["8", "17", "7", "61", "3"].map((n) => (
              <span key={n} className="lcars-caps text-xl text-lcars-ice/60 leading-none">
                {n}
              </span>
            ))}
            <span className="lcars-caps text-[10px] text-lcars-red mt-1">Reads as prose</span>
          </div>
        </div>
      </Specimen>

      <Specimen
        label="Text hugs one edge"
        note={
          <>
            Never centred inside a long segment: the label is flush against
            the end that faces the thing it belongs to, which sets a reading
            direction along the row. In the reference&apos;s data rows both
            labels lean <em>toward the number</em> from opposite sides, which
            is what makes the number read as the anchor.
          </>
        }
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-stretch gap-1">
            <Seg color="violet" className="h-8 w-28 justify-end px-2">
              RI BER
            </Seg>
            <span className="lcars-caps text-2xl text-lcars-ice leading-none w-14 text-right">
              008
            </span>
            <Seg color="violet" shape="cap-end" className="h-8 w-28 justify-start px-2">
              RO MOD
            </Seg>
          </div>
          <div className="flex items-stretch gap-1 opacity-50">
            <Seg color="ice" className="h-8 w-28 justify-center px-2">
              RI BER
            </Seg>
            <span className="lcars-caps text-2xl text-lcars-ice leading-none w-14 text-center">
              008
            </span>
            <Seg color="ice" shape="cap-end" className="h-8 w-28 justify-center px-2">
              RO MOD
            </Seg>
          </div>
          <div className="lcars-caps text-[9px] tracking-wider text-lcars-ice/40 mt-1">
            Upper: hugged. Lower: centred, and the row stops pointing anywhere.
          </div>
        </div>
      </Specimen>

      <Specimen
        label="Terse codes &mdash; borrowed, not adopted"
        note={
          <>
            The reference labels everything <code>RI WAL</code>,{" "}
            <code>BR KNI</code>, <code>ZA CAB</code>. This project keeps real
            words for navigation, because a console you cannot read is a
            costume &mdash; but signature designations (<code>PKS 753</code>,{" "}
            <code>3C 226</code>) land in the same register for free, which is
            most of the effect at none of the cost.
          </>
        }
      >
        <div className="flex flex-wrap gap-1">
          {["RI WAL", "BR KNI", "PE LAU", "JA MAG"].map((c, i) => (
            <Seg
              key={c}
              color={(["ice", "violet", "red", "lilac"] as ButtonColor[])[i]}
              className="h-7 w-24 justify-end px-2 rounded-sm"
            >
              {c}
            </Seg>
          ))}
        </div>
      </Specimen>
    </>
  );
}

/**
 * The anatomy measured off the reference on 2026-08-06: opening stub (flat
 * toward the block's edge, rounded toward the row), a label block with its
 * text hugging the right, the number right-aligned in its own column, a
 * narrow unlabelled spacer, and a closing pill rounded where the row ends
 * with its text hugging the left.
 */
const DATA_ROWS: { stub: ButtonColor; left: string; n: string; right: string; fill: ButtonColor }[] = [
  { stub: "amber", left: "GE ROD", n: "21", right: "", fill: "amber" },
  { stub: "salmon", left: "RI BER", n: "008", right: "RO MOD", fill: "violet" },
  { stub: "ice", left: "KR FER", n: "65", right: "AP NOC", fill: "violet" },
  { stub: "ice", left: "MI PIL", n: "358", right: "", fill: "ice" },
  { stub: "amber", left: "KI FIT", n: "752", right: "BR BRA", fill: "amber" },
  { stub: "lilac", left: "ZA CAB", n: "68", right: "NA SHA", fill: "salmon" },
];

function RowsSection() {
  return (
    <>
      <Specimen
        label="The data row, as measured"
        note={
          <>
            Index stub, label, number, spacer, label. The number is the
            anchor: roughly twice the label&apos;s size, right-aligned into a
            column of its own, and coloured to match its row. Rows are not all
            the same &mdash; a missing closing label is normal, and so is a
            row that is only a stub and a number.
          </>
        }
      >
        {/* Every width here is responsive, and the breakpoint is the reason:
            the row's fixed parts come to 324px, which fits the ~452px `main`
            of a desktop and overflows a 320px phone by 53. Tailwind's `sm`
            measures the viewport rather than the panel, which happens to be
            exactly the distinction wanted - the panel is only narrow when
            the viewport is. */}
        <div className="bg-black rounded-lg p-2 flex flex-col gap-1">
          {DATA_ROWS.map((r) => (
            <div key={r.left} className="flex items-stretch gap-1 h-8">
              {/* Flat toward the block's edge, rounded toward the row. */}
              <Seg color={r.stub} shape="cap-end" className="w-6 sm:w-7 shrink-0" />
              <Seg color={r.fill} className="w-16 sm:w-24 shrink-0 justify-end px-2">
                {r.left}
              </Seg>
              <span
                className={`lcars-caps text-xl sm:text-2xl leading-none self-center w-10 sm:w-16 text-right ${
                  r.fill === "amber" ? "text-lcars-amber" : "text-lcars-ice"
                }`}
              >
                {r.n}
              </span>
              {r.right && (
                <>
                  <Seg color={r.fill} className="w-1.5 sm:w-2 shrink-0" />
                  {/* Capped rather than stretched. The reference's rows end
                      where they end and leave black to the right of them -
                      a closing pill that fills turns a directory row into a
                      progress bar - but it may shrink below its cap on a
                      phone rather than be clipped. */}
                  <Seg
                    color={r.fill}
                    shape="cap-end"
                    className="flex-1 min-w-0 max-w-28 justify-start px-2 whitespace-nowrap"
                  >
                    {r.right}
                  </Seg>
                </>
              )}
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen
        label="Where the index tab belongs"
        note={
          <>
            At the head of a <em>row of things</em>, which is the only place
            the reference uses it. Parked beside a single button it stops
            being an index and starts reading as a state lamp &mdash; that is
            exactly how the phone jump bar went wrong on 2026-08-06, and the
            stub came back out the same day.
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-stretch gap-1 h-8">
            <Seg color="teal" shape="cap-end" className="w-6 sm:w-7 shrink-0" />
            <Seg color="ice" className="flex-1 min-w-0 max-w-20 justify-end px-2">HE 1749</Seg>
            <Seg color="ice" className="flex-1 min-w-0 max-w-20 justify-end px-2">3C 695</Seg>
            <Seg color="ice" shape="cap-end" className="flex-1 min-w-0 max-w-24 justify-end px-2">
              APM 5867
            </Seg>
          </div>
          <div className="flex items-stretch gap-1 h-8 opacity-60">
            <Seg color="teal" shape="cap-end" className="w-7 shrink-0" />
            <Seg color="ice" shape="cap-end" className="w-32 justify-center">
              One button
            </Seg>
            <span className="lcars-caps text-[10px] text-lcars-red self-center ml-2">
              &larr; reads as a lamp
            </span>
          </div>
        </div>
      </Specimen>

      <Specimen
        label="Index and legend strips"
        note={
          <>
            Stacked short pills along an edge, numbered downward, acting as a
            scale or a legend rather than as controls. Squared corners and no
            hover: nothing here is meant to look pressable.
          </>
        }
      >
        <div className="flex gap-6">
          <div className="flex flex-col gap-0.5 w-24">
            {(
              [
                ["ice", "050"],
                ["lilac", "040"],
                ["red", "030"],
                ["salmon", "020"],
                ["violet", "010"],
              ] as [ButtonColor, string][]
            ).map(([c, n]) => (
              <Seg key={n} color={c} className="h-6 justify-end px-2 rounded-sm">
                {n}
              </Seg>
            ))}
          </div>
          <p className="text-[11px] text-lcars-ice/45 leading-relaxed flex-1">
            The numbers descend, and they keep their zeros. In the reference
            these flank a schematic and label nothing in particular &mdash;
            they are there to say &ldquo;this reading has a scale&rdquo;.
          </p>
        </div>
      </Specimen>
    </>
  );
}

function BlocksSection() {
  return (
    <>
      <Specimen
        label="The elbow, and where its title goes"
        note={
          <>
            The defining macro-shape: a block sweeps into a fully rounded
            corner where it meets the panel&apos;s outer edge, with the rail
            continuing off it. The section title sits at the{" "}
            <em>bottom-left</em>{" "}
            of its colour block &mdash; the block is a
            shelf the label rests on, not a banner it is centred in.
          </>
        }
      >
        <div className="flex items-stretch gap-1 h-24">
          <div className="w-10 shrink-0 bg-lcars-salmon rounded-tl-[2rem] rounded-bl-[2rem]" />
          <div className="flex-1 bg-lcars-salmon rounded-tr-[2rem] flex items-end p-2">
            <span className="lcars-caps text-black font-bold text-sm leading-none">
              Emergency Override
            </span>
          </div>
        </div>
      </Specimen>

      <Specimen
        label="Black is structural"
        note={
          <>
            No borders are ever drawn. Separation is done entirely with black
            gaps between touching colour blocks &mdash; the grout is the
            material, and a 4px gap is a joint while a 16px gap is a
            different block.
          </>
        }
      >
        <div className="flex gap-1 h-12">
          <Seg color="violet" shape="cap-start" className="flex-1" />
          <Seg color="violet" className="flex-1" />
          <Seg color="violet" shape="cap-end" className="flex-1" />
          <div className="w-8" />
          <Seg color="amber" shape="pill" className="flex-1" />
        </div>
      </Specimen>

      <Specimen
        label="Nested sub-panel"
        note={
          <>
            A darker rounded container inside a panel says &ldquo;this belongs
            to the block above&rdquo; without a border. One caveat learned on
            the phone hub: over a black <em>page</em> it has to go the other
            way and be lighter, or the container is invisible and the empty
            space stops reading as deliberate.
          </>
        }
      >
        <div className="bg-lcars-panel rounded-lg p-3">
          <div className="bg-black/50 rounded-md p-3 text-[11px] text-lcars-ice/60">
            Nested body. Darker than its panel, which is the reference&apos;s
            habit.
          </div>
        </div>
      </Specimen>

      <Specimen
        label="Corner numerals"
        note={
          <>
            Small, dim, tucked into a corner of an otherwise empty black area,
            belonging to no particular control &mdash; <code>451</code>,{" "}
            <code>927</code>. Free instrument texture, and the cheapest thing
            on this sheet to reproduce.
          </>
        }
      >
        <div className="relative bg-black rounded-lg h-20">
          <span className="lcars-caps absolute bottom-2 right-3 text-[11px] text-lcars-amber/70">
            451
          </span>
        </div>
      </Specimen>

      <Specimen
        label="Gauge with a tick scale"
        note={
          <>
            The analog-instrument motif: a vertical track, paired ticks either
            side of a numbered centre scale, and a fixed-width readout beneath.
            The reference fades its fill; this project does not, because flat
            rendering is a rule here and a gradient is the one place the image
            breaks its own.
          </>
        }
      >
        <div className="flex gap-3">
          {(
            [
              ["violet", "318"],
              ["amber", "195"],
              ["ice", "458"],
            ] as [ButtonColor, string][]
          ).map(([c, n], gi) => (
            <div key={n} className="flex flex-col gap-1 w-20">
              <div className={`${SOLID_BG[c]} rounded-sm p-1`}>
                <div className="bg-black flex flex-col-reverse">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="flex items-center justify-between h-5 px-1">
                      <span className={`h-px w-3 ${SOLID_BG[c]} ${i < gi + 2 ? "" : "opacity-40"}`} />
                      <span
                        className={`lcars-caps text-[10px] leading-none ${
                          i < gi + 2 ? "text-lcars-ice" : "text-lcars-ice/30"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className={`h-px w-3 ${SOLID_BG[c]} ${i < gi + 2 ? "" : "opacity-40"}`} />
                    </div>
                  ))}
                </div>
              </div>
              <Seg color={c} className="h-5 justify-center rounded-sm text-[10px]">
                {n}
              </Seg>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen
        label="Sound is part of the shape"
        note={
          <>
            Every real control clicks. <code>LcarsButton</code> calls{" "}
            <code>playButtonClick()</code>{" "}
            before its own handler, so a
            specimen that is silent is a specimen that is not a button &mdash;
            which is most of this sheet, deliberately.
          </>
        }
      >
        <button
          type="button"
          onClick={() => playButtonClick()}
          className="lcars-caps text-xs bg-lcars-teal text-black rounded-full px-4 py-2 cursor-pointer hover:bg-lcars-ice transition-colors"
        >
          Click
        </button>
      </Specimen>
    </>
  );
}
