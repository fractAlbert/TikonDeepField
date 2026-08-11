"use client";

import { LcarsButton } from "@/components/LcarsButton";
import { LcarsSegment } from "@/components/LcarsSegment";
import { NavItem } from "@/components/NavRail";
import { OutpostLogo } from "@/components/OutpostLogo";
import { soundLabel, useSoundMuted } from "@/components/SoundToggle";

/**
 * The phone landing view: every destination, as a titled block of separate
 * pills.
 *
 * Phones get a hub rather than a persistent nav because eleven labels will
 * not fit across 390px at a readable size, and the style notes forbid
 * scrolling to reach the rest - a nav you have to swipe sideways through is
 * the one thing the LCARS shell rules out. Spending a tap to get anywhere
 * buys back the ~58px a strip costs on every single screen, which is most
 * of what the Star Map needed to fit. Each panel carries a Back button home.
 *
 * ## The S-swoop (2026-08-07, current)
 *
 * One orange path runs across the top, down the left past the first six,
 * across between the groups, and down the right and off the bottom edge -
 * the bottom of the S deliberately missing. The buttons sit in the two
 * pockets it leaves, so the frame does the dividing rather than a rule drawn
 * between two runs.
 *
 * Only the opening corner is rounded. The top bar's right end and the right
 * leg's foot both *continue*, and a run that continues is flat; capping
 * either would claim it stops there. Both turns in the middle are swept -
 * out of the left leg and into the right one - because a sweep that arrives
 * at a right angle is not a sweep.
 *
 * Rows are a definite height chosen against the viewport's *height*, not
 * stretched to fill: stretching left the crossing floating a long way below
 * the group it divides. Each pocket hugs its buttons instead.
 *
 * The station emblem used to fill the space under the second group. The
 * swoop now occupies that room structurally and a crest under it read as a
 * competing centre, so it is gone.
 *
 * ## How it got here
 *
 * Three columns was tried and rejected as crowded: cells came out 89-126px
 * against 60px of height, a ratio near enough to square that a pill stops
 * being a pill. Two columns gives 2.4 to 3.2. **That ratio is the thing to
 * check, not the column count** - it is also why the buttons looked fat at
 * three columns without having changed height at all.
 *
 */
export function MobileMenu({
  groups,
  onSelect,
  className = "",
  id,
}: {
  /** Two groups of six, drawn as two runs with a sweep between them. */
  groups: NavItem[][];
  onSelect: (id: string) => void;
  className?: string;
  id?: string;
}) {
  // Each group is drawn as six slots, so a group of five carries one blank.
  // It lands last, which leaves the entry that *starts* a survey - the only
  // one here that does something rather than going somewhere - sitting
  // beside a gap rather than beside another destination.
  const pad = (group: NavItem[]): (NavItem | null)[] => [
    ...group,
    ...Array.from({ length: Math.max(0, 6 - group.length) }, () => null),
  ];

  return (
    /* The S-swoop. Across the top, down the left to halfway, across to the
       right, then straight down and off the bottom - the bottom of the S is
       deliberately missing. The crossing is what separates the two groups of
       buttons, so the frame does the dividing instead of a rule drawn
       between them, which is the whole point of the shape.

       The panel colour is on the container and the orange sits over it, so
       every inner corner curves into one known background. */
    <div
      id={id}
      /* Only the opening corner is rounded. The top bar's right end and the
         right leg's foot both *continue* - one off the side, one off the
         bottom - and a run that continues is flat. Capping either would
         claim it stops there, which is the same mistake the jump bar was
         corrected for twice. */
      className={`flex flex-col h-full bg-lcars-panel overflow-hidden rounded-tl-[var(--lcars-hub-outer-r)] ${className}`}
    >
      {/* The top of the S, and still the hub's title shelf. */}
      {/* The title starts *past* the leg, never over it. The shelf spans the
          full width because it is one mass with the leg, but the label
          belongs to the horizontal arm - the same rule the Star Map's
          header follows, and the same way it got this wrong first. */}
      <div className="relative bg-lcars-orange lcars-shelf pl-[calc(var(--lcars-hub-leg-w)+1rem)] pr-4 shrink-0">
        <span className="lcars-caps text-black font-bold text-sm leading-none">Main Menu</span>
        <div
          aria-hidden
          className="lcars-elbow-notch top-full left-[var(--lcars-hub-leg-w)] [--lcars-notch-bg:var(--lcars-panel)] [--lcars-elbow-inner-r:0.5rem]"
        />
      </div>

      {/* Upper pocket: the left leg, and the first six. `shrink-0` so it
          hugs its buttons - anything taller and the crossing drifts away
          from the group it is dividing. */}
      <div className="flex shrink-0">
        <div aria-hidden className="w-[var(--lcars-hub-leg-w)] shrink-0 bg-lcars-orange" />
        <HubPocket slots={pad(groups[0] ?? [])} onSelect={onSelect} />
      </div>

      {/* The crossing, and it turns at both ends. Bottom-left is the outer
          corner of the turn *out* of the left leg; top-right is the outer
          corner of the turn *into* the right leg, and that one was square -
          a sweep that arrives at a right angle is not a sweep. The two
          notches are the inner corners of the same two turns, facing
          opposite ways. */}
      <div
        aria-hidden
        className="relative shrink-0 h-[var(--lcars-hub-cross-h)] bg-lcars-orange rounded-bl-[var(--lcars-hub-turn-r)] rounded-tr-[var(--lcars-hub-turn-r)]"
      >
        <div className="lcars-elbow-notch lcars-notch-bl bottom-full left-[var(--lcars-hub-leg-w)] [--lcars-notch-bg:var(--lcars-panel)] [--lcars-elbow-inner-r:0.5rem]" />
        <div className="lcars-elbow-notch lcars-notch-tr top-full right-[var(--lcars-hub-leg-w)] [--lcars-notch-bg:var(--lcars-panel)] [--lcars-elbow-inner-r:0.5rem]" />
      </div>

      {/* Lower pocket: the second six, with the right leg running the full
          height beside them and straight off the bottom edge.

          The station emblem used to fill the space under these buttons. It
          was there because the hub had room going spare and nothing to do
          with it; the swoop now occupies that room structurally, and a
          crest under it read as a second, competing centre. Removed on the
          user's call. */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="shrink-0 flex">
            {/* The spare slot earns its keep: the sound control lives here
                on a phone rather than in the header, where "Sound: On" was
                82px of a header that had 42 too few at 320. */}
            <HubPocket slots={pad(groups[1] ?? [])} onSelect={onSelect} blankFill={<HubSoundButton />} />
          </div>
          {/* Small, and only where the space is real - see
              `.lcars-hub-crest`. The caption is gone with it: the emblem
              alone is a mark in the corner of the screen, and "TIKON
              RESEARCH STATION" underneath made it an announcement, which
              is the swoop's job now. */}
          <div className="lcars-hub-crest flex-1 min-h-0 items-center justify-center p-2">
            <OutpostLogo
              size={160}
              /* `h-auto` as well as `w-auto`: the svg carries width and
                 height attributes, so capping only the width squashes it
                 rather than scaling it - it came out 104x160. */
              className="opacity-70 min-h-0 max-h-full w-auto h-auto max-w-[var(--lcars-hub-crest-max)]"
            />
          </div>
        </div>
        <div aria-hidden className="w-[var(--lcars-hub-leg-w)] shrink-0 bg-lcars-orange" />
      </div>
    </div>
  );
}

/** One group of six, in the pocket the swoop leaves for it. */
function HubPocket({
  slots,
  onSelect,
  blankFill,
}: {
  slots: (NavItem | null)[];
  onSelect: (id: string) => void;
  /** Drawn in place of the first empty slot, if anything wants it. */
  blankFill?: React.ReactNode;
}) {
  let blanksUsed = 0;
  return (
    <div className="lcars-hub-grid grid grid-cols-2 gap-1.5 flex-1 min-w-0 content-start p-2">
      {slots.map((slot, i) =>
        slot ? (
          <LcarsButton
            key={slot.id}
            color={slot.color}
            shape="pill"
            orientation="horizontal"
            size="compact"
            onClick={() => onSelect(slot.id)}
            /* Centred, and asked for explicitly. The default hugs the flat
               end, which is right for a rail whose cells are wider than
               their labels; here the cell is barely wider than the word and
               the label often wraps, and the references centre in exactly
               that case - the word cells in `Lcars menu`'s foot grid are
               centred where the numeric cells beside them are not. */
            align="center"
            className="h-full lcars-hub-label text-center leading-tight"
          >
            {slot.label}
          </LcarsButton>
        ) : blankFill && blanksUsed++ === 0 ? (
          <div key={`fill-${i}`} className="h-full">
            {blankFill}
          </div>
        ) : (
          /* The deliberate gap, at full strength rather than dimmed: a
             tinted cell reads as a disabled button, a solid one as a piece
             of the panel. Ice because it touches nothing around it. */
          <LcarsSegment
            key={`blank-${i}`}
            color="ice"
            shape="pill"
            orientation="horizontal"
            className="h-full"
          />
        )
      )}
    </div>
  );
}

/** The sound control, dressed as one of the hub's buttons. */
function HubSoundButton() {
  const [muted, setMuted] = useSoundMuted();
  return (
    <LcarsButton
      color="ice"
      shape="pill"
      orientation="horizontal"
      size="compact"
      align="center"
      onClick={() => setMuted(!muted)}
      className="w-full h-full lcars-hub-label text-center leading-tight"
    >
      {soundLabel(muted)}
    </LcarsButton>
  );
}
