"use client";

// The walk-through's own chrome: one docked bar carrying the current step.
//
// ## Why a docked bar and not a floating tooltip
//
// The project rule is that nothing scrolls to reveal chrome, and a coach
// mark pinned to an element breaks that the moment the element is off
// screen - the usual fix is to scroll it into view, which is exactly what
// is not allowed here (docs/lcars-style-notes.md). A tooltip would also
// have to dodge the two rails, the sidebar and the phone panel bar, and
// would still land on top of the thing it is pointing at on a 390px screen.
//
// A bar docked to the bottom of the viewport can never be off screen, never
// moves the layout, and never covers the element it is describing, because
// the element is always above it. The cost is the strip of height it takes,
// which is why it collapses to a single line.
//
// ## It points, it does not block
//
// `pointer-events` stays off everywhere except the bar itself, so the app
// underneath is fully live at all times. Steps that teach an action watch
// the *board's state* rather than intercepting clicks, so a player who
// wanders off and does things in a different order still satisfies them.
// The alternative - blocking interaction until the scripted click happens -
// keeps the script in sync at the cost of being unable to explore, and
// exploring is the thing this game is.

import { useEffect } from "react";
import { TutorialStep } from "@/lib/tutorial";
import { playButtonClick } from "@/lib/sound";

/**
 * Rings the step's anchor element, if it is on screen.
 *
 * Done imperatively rather than by threading a `highlighted` prop through
 * every panel: the anchors are ordinary layout elements in eight different
 * components, and a prop per anchor would be eight chances to forget one.
 * Purely additive - a class that draws an outline and nothing else - so a
 * missing anchor is a no-op rather than a broken step.
 */
function useAnchorRing(anchorId: string | undefined, active: boolean) {
  useEffect(() => {
    if (!active || !anchorId) return;

    // Retried rather than looked up once. A step usually changes the panel
    // too, and the panel it wants is mounted by a *second* effect in
    // AppShell - so on the tick this runs, the element the step names very
    // often does not exist yet. A single rAF was enough for anchors that
    // are always in the DOM (the sidebar map, the briefing) and silently
    // did nothing for the ones that mount on navigation, which is the
    // majority of them. Caught by walking the whole tutorial and noticing
    // the Manifest and Sweep steps never highlighted anything.
    let found: HTMLElement | null = null;
    let frame = 0;
    let tries = 0;
    const MAX_TRIES = 30; // ~half a second at 60fps, then give up quietly

    // React owns `className` on some of these elements and recomputes it -
    // `#sweep-scope-container` flips between "" and "hidden" every time the
    // panel changes, which is *exactly* when a tutorial step is navigating.
    // A class added imperatively is wiped by that re-render, so it has to be
    // put back. Without this the ring worked on every static-className
    // anchor and silently failed on the dynamic one.
    const observer = new MutationObserver(() => {
      if (found && !found.classList.contains("tutorial-anchor")) {
        found.classList.add("tutorial-anchor");
      }
    });

    const look = () => {
      found = document.getElementById(anchorId);
      if (found) {
        found.classList.add("tutorial-anchor");
        observer.observe(found, { attributes: true, attributeFilter: ["class"] });
        return;
      }
      if (++tries < MAX_TRIES) frame = requestAnimationFrame(look);
    };
    frame = requestAnimationFrame(look);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      found?.classList.remove("tutorial-anchor");
      // Belt and braces: the element may have remounted since, in which
      // case `found` is a detached node and the live one still has it.
      document.getElementById(anchorId)?.classList.remove("tutorial-anchor");
    };
  }, [anchorId, active]);
}

export function TutorialCoach({
  step,
  index,
  total,
  satisfied,
  onNext,
  onBack,
  onSkip,
}: {
  step: TutorialStep;
  index: number;
  total: number;
  /** True when the step's own condition is met, so Next becomes the payoff. */
  satisfied: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  useAnchorRing(step.anchorId, true);

  const waiting = !!step.done && !satisfied;

  return (
    <div
      id="tutorial-coach"
      /* The wrapper spans the viewport so the bar can sit flush against the
         bottom edge, but takes no pointer events - only the bar itself
         does, which is what keeps the app underneath live. */
      className="fixed inset-x-0 bottom-0 z-40 pointer-events-none p-2 md:p-3"
    >
      <div className="pointer-events-auto flex max-w-[1600px] mx-auto rounded-xl overflow-hidden shadow-[0_-4px_24px_rgba(0,0,0,0.55)]">
        {/* The elbow: a solid colour block that the label rests against,
            the same move the rails make. Teal because it is the one accent
            not already spoken for by a destination in either rail. */}
        <div className="w-3 md:w-16 shrink-0 bg-lcars-teal flex items-end justify-center pb-2">
          <span className="hidden md:block lcars-caps text-[10px] font-bold text-black/70 font-mono">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div className="flex-1 min-w-0 bg-lcars-panel px-3 py-2.5 md:px-5 md:py-3">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <h2 className="lcars-caps text-sm md:text-base font-bold text-lcars-teal truncate">
              {step.title}
            </h2>
            <span className="lcars-caps text-[10px] text-lcars-ice/40 font-mono shrink-0">
              Training {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
          </div>

          <p className="text-xs md:text-sm text-lcars-ice/80 leading-relaxed">{step.body}</p>

          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            {index > 0 && (
              <button
                type="button"
                onClick={() => {
                  playButtonClick();
                  onBack();
                }}
                className="lcars-caps text-[11px] font-semibold tracking-wide text-lcars-ice/70 bg-white/10 hover:bg-white/20 rounded-full px-3 py-1 min-h-8 cursor-pointer transition-colors"
              >
                Back
              </button>
            )}

            {/* Always enabled, even while the step is waiting on the board.
                A player who already knows this one, or who wants to read
                ahead, should not be held hostage by a condition - the
                walk-through points. */}
            <button
              type="button"
              onClick={() => {
                playButtonClick();
                onNext();
              }}
              className={`lcars-caps text-[11px] font-semibold tracking-wide rounded-full px-4 py-1 min-h-8 cursor-pointer transition-colors ${
                waiting
                  ? "bg-white/10 text-lcars-ice/60 hover:bg-white/20"
                  : "bg-lcars-teal text-black hover:bg-lcars-ice"
              }`}
            >
              {index === total - 1 ? "Finish" : waiting ? "Skip this step" : "Next"}
            </button>

            {waiting && (
              <span className="text-[11px] text-lcars-amber/80 leading-tight">
                Waiting for you to try it &mdash; the panel stays live.
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                playButtonClick();
                onSkip();
              }}
              className="ml-auto lcars-caps text-[11px] font-semibold tracking-wide text-lcars-ice/45 hover:text-lcars-ice/80 cursor-pointer transition-colors px-2 min-h-8"
            >
              Skip tutorial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
