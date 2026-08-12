"use client";

import { useMemo, useState } from "react";
import { Region } from "@/lib/puzzle-types";
import { buildSectors, RING_COUNT } from "@/lib/grid";
import { LcarsPanel } from "@/components/LcarsShell";
import { LcarsButton } from "@/components/LcarsButton";
import { ConstellationView } from "@/components/constellation/ConstellationView";
import { EXPERIMENTAL_VISIBILITY_RANGE, VISIBILITY_RANGE } from "@/lib/experiments";
import { playButtonClick } from "@/lib/sound";

const sectorLookup = new Map(buildSectors().map((s) => [s.id, s]));

/**
 * The test bench: instruments built to be *tried*, not shipped.
 *
 * Gated by `useExperiments()` in `AppShell`, which is false in any production
 * build served from anywhere but loopback - see `lib/experiments.ts` for what
 * that does and does not guarantee.
 *
 * Both instruments here exist to answer the same question, which the game
 * could not previously ask: **what should a player be able to learn about a
 * signature's classification?** Item 2 shipped the briefing half of that (a
 * type named in a clue chain); these are the instrument half.
 *
 * Neither is balanced. Neither is modelled in `analyze-solvability.ts`, so
 * every solvability figure quoted in the docs describes a game without them.
 * That is the point of the bench - find out which is worth the measurement
 * before paying for it.
 */
export function ExperimentsPanel({ region }: { region: Region | null }) {
  if (!region) {
    return (
      <div className="flex flex-col gap-4">
        <Banner />
        <LcarsPanel title="Test Bench" accent="bg-lcars-alert">
          <p className="text-sm text-lcars-ice/60">
            No active survey. Open one and the instruments below will have a
            field to read.
          </p>
        </LcarsPanel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Banner />
      <ConstellationInstrument region={region} />
      <TypeFilterInstrument region={region} />
      <SweepRangeNote />
    </div>
  );
}

function Banner() {
  return (
    /* Alert red, used deliberately: the style notes reserve it for something
       urgent and irreversible, and shipping one of these by accident is
       exactly that. It is the second use in the app. */
    <div className="flex rounded-lg overflow-hidden">
      <div className="w-2 shrink-0 bg-lcars-alert" />
      <div className="flex-1 min-w-0 bg-lcars-panel px-3.5 py-3">
        <div className="lcars-caps text-[11px] font-semibold tracking-wide text-lcars-alert mb-1">
          Not for deployment
        </div>
        <p className="text-xs text-lcars-ice/70 leading-relaxed">
          These instruments run on localhost only and are excluded from any
          production build. They are unbalanced and unmeasured &mdash; nothing
          here is modelled by the solvability analysis, so a region that looks
          easy with them is not evidence about the shipped game.
        </p>
      </div>
    </div>
  );
}

/**
 * Constellation: a few signatures as a shape, rotated, classifications only.
 */
function ConstellationInstrument({ region }: { region: Region }) {
  const [count, setCount] = useState(4);
  const max = Math.min(6, Object.keys(region.solution).length - 1);

  return (
    <LcarsPanel title="Constellation" accent="bg-lcars-violet">
      <p className="text-sm text-lcars-ice/70 leading-relaxed mb-3">
        A few signatures drawn as a shape &mdash; no grid, no orientation, no
        designations. Only classifications. The pattern is stable for a given
        region but arbitrarily rotated, so it tells you how these signatures
        sit relative to each other and nothing about where they are.
      </p>

      <div className="flex items-center gap-2 mb-3">
        <span className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50">
          Signatures
        </span>
        {[3, 4, 5].filter((n) => n <= max).map((n) => (
          <LcarsButton
            key={n}
            color="violet"
            size="compact"
            shape="pill"
            align="center"
            onClick={() => setCount(n)}
            className={count === n ? "" : "opacity-50"}
          >
            {String(n)}
          </LcarsButton>
        ))}
      </div>

      <ConstellationView region={region} count={count} className="w-full max-w-sm h-auto" />

      <p className="text-[11px] text-lcars-ice/45 leading-relaxed mt-3">
        <strong className="text-lcars-alert">Known hazard:</strong> this
        picture is Euclidean and the Sweep Scope is not. The field&apos;s
        metric is orthogonal &mdash; rings and segments &mdash; so two pairs
        that look equally far apart here can read differently on the scope.
        Decide whether that is a second language worth teaching or a reason to
        lay the view out differently; it is the first thing to judge.
      </p>
    </LcarsPanel>
  );
}

/**
 * Type filter: tune to a classification, learn which rings hold one.
 *
 * The user's idea, 2026-08-11: *"some sort of type filter. You would go look
 * at it and it might give you information about the types that the filter can
 * sense."*
 *
 * Built as anonymous per-ring counts, which is not an arbitrary choice - it
 * is the exact shape `analyze-solvability.ts` already describes as the "Ring
 * Survey, type-based variant", so if this one earns its place the channel
 * model for measuring it is already written down.
 *
 * It names no signature, which is the ceiling on it: on its own it is an
 * anonymous partition. It composes with item 2's clue chain, which is the
 * thing that can pin one type to one name.
 */
function TypeFilterInstrument({ region }: { region: Region }) {
  const [tuned, setTuned] = useState<string | null>(null);

  const perRing = useMemo(() => {
    if (!tuned) return null;
    const counts = new Array(RING_COUNT).fill(0);
    for (const name of Object.keys(region.solution)) {
      const entry = region.solution[name];
      if (entry.type !== tuned) continue;
      counts[sectorLookup.get(entry.sector)!.ring]++;
    }
    return counts;
  }, [region, tuned]);

  return (
    <LcarsPanel title="Type Filter" accent="bg-lcars-teal">
      <p className="text-sm text-lcars-ice/70 leading-relaxed mb-3">
        Tune the filter to a classification and it reports how many signatures
        of that type sit in each ring. It names none of them.
      </p>

      <div className="flex flex-wrap gap-1 mb-4">
        {region.quasarTypes.map((t) => (
          <LcarsButton
            key={t}
            color="teal"
            size="compact"
            shape="pill"
            align="center"
            onClick={() => {
              playButtonClick();
              setTuned(tuned === t ? null : t);
            }}
            className={tuned === t ? "" : "opacity-50"}
          >
            {t}
          </LcarsButton>
        ))}
      </div>

      {perRing ? (
        <div className="flex flex-col gap-1">
          {perRing.map((n, ring) => (
            <div key={ring} className="flex items-center gap-2">
              <span className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50 w-14 text-right">
                Ring {ring + 1}
              </span>
              {/* A bar, not a number: the shape of the distribution is the
                  readable part, and a column of digits is not an instrument. */}
              <div className="flex gap-0.5">
                {Array.from({ length: Math.max(n, 0) }).map((_, i) => (
                  <div key={i} className="h-3 w-6 bg-lcars-teal" />
                ))}
              </div>
              <span className="font-mono text-[11px] text-lcars-ice/40">{n}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-lcars-ice/50">Not tuned.</p>
      )}
    </LcarsPanel>
  );
}

function SweepRangeNote() {
  return (
    <LcarsPanel title="Sweep Range" accent="bg-lcars-amber">
      <p className="text-sm text-lcars-ice/70 leading-relaxed">
        The Sweep Scope currently sees{" "}
        <strong className="text-lcars-amber">{VISIBILITY_RANGE}</strong>{" "}
        orthogonal steps. The proposal is to cut it to{" "}
        <strong className="text-lcars-amber">{EXPERIMENTAL_VISIBILITY_RANGE}</strong>{" "}
        if these instruments earn their place, so the game gives back what
        they add.
      </p>
      <p className="text-[11px] text-lcars-ice/45 leading-relaxed mt-2">
        Deliberately not wired up yet. Narrowing the scope before the
        instruments exist just makes the game harder, and the range is the
        single largest information channel in it &mdash; every solvability
        figure in <code>region-difficulty.md</code> was measured at{" "}
        {VISIBILITY_RANGE}. It is one constant now rather than the twelve
        copies it was this morning, so the change is a one-line experiment
        when the time comes.
      </p>
    </LcarsPanel>
  );
}
