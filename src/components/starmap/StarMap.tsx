"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Region } from "@/lib/puzzle-types";
import { RING_COUNT, SEGMENT_COUNT, buildSectors, quadrantOf, sectorId } from "@/lib/grid";
import {
  CATALOG_RING_R,
  CELL_FILL,
  CELL_FILL_HOVER,
  CELL_FILL_OCCUPIED,
  CELL_LINE_GHOST,
  CONFIRM_RING_R,
  FieldGridLines,
  FieldLabels,
  MARKER_CORE,
  MarkerRing,
  MAYBE_STROKE,
  MAYBE_TINT,
  QuasarGlowDefs,
  RULED_OUT_TINT,
  cellPath,
  centerOf,
} from "@/components/starmap/field";
import { QuasarMarker } from "@/components/QuasarMarker";
import { quasarGlyph } from "@/lib/quasar-glyph";
import { useQuasarColor } from "@/lib/use-quasar-colors";
import { starMapStorageKey } from "@/lib/starmap-storage";
import {
  EMPTY_LOG,
  currentFilingLimit,
  entryOutcome,
  filingsUsed,
  getSurveyLog,
  isSolved,
  recordFiling,
  subscribeSurveyLog,
  withdrawSurvey,
} from "@/lib/survey-log";
import { RankEvent } from "@/lib/player";
import {
  RELIEVED,
  REVIEW_WINDOW,
  SurveyOutcome,
  rankHex,
  rankTitle,
  showsFilingMarks,
} from "@/lib/ranks";
import { usePlayer } from "@/lib/use-player";
import { RankInsignia } from "@/components/RankInsignia";
import { QuasarStar } from "@/components/QuasarStar";
import {
  playButtonClick,
  playPlace,
  playReset,
  playRuleOut,
  playVerifyFail,
  playVerifySuccess,
} from "@/lib/sound";

type Placements = Record<string, string | undefined>; // quasarId -> sectorId
type CellMarks = Record<string, Set<string>>; // quasarId -> set of sectorId
type MarkMode = "place" | "ruleout" | "maybe";

/**
 * The two annotation modes, and the state each one owns.
 *
 * "?" is the inverse of "X" rather than a softer version of it: X says the
 * armed signature is definitely not here, ? says here is one of the places
 * it could be. So they are mutually exclusive per cell - marking one clears
 * the other - and each has its own set, because a cell being neither is the
 * common case and has to stay distinguishable from both.
 */
const ANNOTATION_MODES = ["ruleout", "maybe"] as const;
type AnnotationMode = (typeof ANNOTATION_MODES)[number];
const isAnnotation = (m: MarkMode): m is AnnotationMode =>
  (ANNOTATION_MODES as readonly string[]).includes(m);

/**
 * The result of one filing, frozen at the moment Verify was pressed.
 *
 * It has to be a snapshot rather than something derived from live state.
 * This used to be a `verified` boolean latch with the correct/incorrect
 * marks computed from `placements` on every render, which meant the first
 * press turned the map into a permanent oracle: move a marker and its ring
 * re-coloured instantly, so you could hunt the solution one cell at a time
 * without ever filing again (and without the survey log counting it).
 *
 * `snapshot` is what makes that impossible - a filing describes the board
 * as it was, and any later edit makes it stale rather than updating it.
 */
interface Filing {
  placements: Placements;
  /** Signatures whose sector did not match the confirmed catalog entry. */
  discrepancies: number;
  solved: boolean;
}

interface SavedState {
  placements: Placements;
  ruledOut: Record<string, string[]>;
  maybe?: Record<string, string[]>;
}

// What each ending says once the region is closed. The wording matters:
// "retracted" is the station pulling an entry before it reached anyone,
// which is the actual stake (docs/win-conditions.md) - a wrong filing
// propagates, and ships navigate against it.
const OUTCOME_COPY: Record<SurveyOutcome, { label: string; tone: string; detail: string }> = {
  confirmed: {
    label: "Classification confirmed",
    tone: "text-lcars-teal",
    detail: "Filed to the regional catalog.",
  },
  retracted: {
    label: "Classification retracted",
    tone: "text-lcars-red",
    detail: "Filing allocation spent without a match. The entry was pulled before it went out.",
  },
  withdrawn: {
    label: "Survey withdrawn",
    tone: "text-lcars-ice/70",
    detail: "Released unresolved. Nothing filed, and nothing against your record.",
  },
};

export function StarMap({
  region,
  onClosed,
}: {
  region: Region | null;
  /**
   * Fired the moment a filing or a withdrawal closes the region, so the
   * shell can open the survey result report.
   *
   * It has to be a callback rather than something the report derives on its
   * own, because closing now archives the region (see `closeEntry`), which
   * flips `noActiveAssignment` and unmounts everything below it - including
   * this component and the rank event it was about to announce. The report
   * reads that event back off the log entry; this is only the trigger.
   */
  onClosed?: (regionId: string) => void;
}) {
  const sectors = useMemo(() => buildSectors(), []);
  const colorOf = useQuasarColor(region?.id ?? "");
  const quasars = useMemo(
    () =>
      region
        ? region.quasars.map((q, i) => ({
            id: q.id,
            designation: q.designation,
            color: colorOf(q.id, i),
            // Second identity channel, assigned off the same index as the
            // colour so the chip below and the marker on the dial can never
            // disagree about which signature you armed.
            glyph: quasarGlyph(i),
          }))
        : [],
    [region, colorOf]
  );

  const [placements, setPlacements] = useState<Placements>({});
  const [ruledOut, setRuledOut] = useState<CellMarks>({});
  const [maybe, setMaybe] = useState<CellMarks>({});
  const [armed, setArmed] = useState<string | null>(null);
  const [markMode, setMarkMode] = useState<MarkMode>("place");
  const [filing, setFiling] = useState<Filing | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  // The filing budget and the region's outcome live in the survey log, not
  // in local state: they have to survive a reload (a region you retracted
  // stays retracted), and the Log panel reads the same record. Subscribing
  // rather than reading once is what makes the buttons below update the
  // instant a filing lands.
  const log = useSyncExternalStore(subscribeSurveyLog, getSurveyLog, () => EMPTY_LOG);
  const entry = region ? log.find((e) => e.regionId === region.id) : undefined;
  const outcome = entry ? entryOutcome(entry) : null;
  const closed = outcome !== null;
  const filingsSpent = entry ? filingsUsed(entry) : 0;
  const filingLimit = currentFilingLimit();
  const filingsLeft = Math.max(0, filingLimit - filingsSpent);

  // A rank change is announced on the filing that caused it, which is the
  // one moment it's guaranteed to be looked at. The profile panel is the
  // permanent record; this is the notification.
  const [rankEvent, setRankEvent] = useState<RankEvent | null>(null);
  // Withdrawal is irreversible and rank-neutral, so it needs to be easy to
  // reach and impossible to hit by accident - hence a second click rather
  // than a dialog.
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from
       an external store (localStorage) on mount; state must start empty on
       the server since window is unavailable there. */
    // Both of these describe the region being left, not the one arriving.
    setRankEvent(null);
    setConfirmingWithdraw(false);
    if (!region) {
      setLoaded(true);
      return;
    }
    try {
      const raw = window.localStorage.getItem(starMapStorageKey(region.id));
      if (raw) {
        const saved: SavedState = JSON.parse(raw);
        setPlacements(saved.placements ?? {});
        const restored: CellMarks = {};
        for (const qid in saved.ruledOut ?? {}) restored[qid] = new Set(saved.ruledOut[qid]);
        setRuledOut(restored);
        const restoredMaybe: CellMarks = {};
        for (const qid in saved.maybe ?? {}) restoredMaybe[qid] = new Set(saved.maybe![qid]);
        setMaybe(restoredMaybe);
        // Only trust the persisted "solved" flag if the restored placements
        // still match the solution exactly - it may be stale if placements
        // were edited again after the last successful verify.
        const stillAllCorrect = region.quasars.every(
          (q) => saved.placements?.[q.id] === region.solution[q.id]?.sector
        );
        if (isSolved(region.id) && stillAllCorrect) {
          setFiling({
            placements: saved.placements ?? {},
            discrepancies: 0,
            solved: true,
          });
        }
      }
    } catch {
      // ignore corrupt/unavailable storage
    }
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [region]);

  useEffect(() => {
    if (!loaded || !region) return;
    const serializedRuledOut: Record<string, string[]> = {};
    for (const qid in ruledOut) serializedRuledOut[qid] = [...ruledOut[qid]];
    const serializedMaybe: Record<string, string[]> = {};
    for (const qid in maybe) serializedMaybe[qid] = [...maybe[qid]];
    window.localStorage.setItem(
      starMapStorageKey(region.id),
      JSON.stringify({
        placements,
        ruledOut: serializedRuledOut,
        maybe: serializedMaybe,
      } satisfies SavedState)
    );
  }, [placements, ruledOut, maybe, loaded, region]);

  const occupantBySector = useMemo(() => {
    const map = new Map<string, string>(); // sectorId -> quasarId
    for (const qid in placements) {
      const s = placements[qid];
      if (s) map.set(s, qid);
    }
    return map;
  }, [placements]);

  const hoveredSector = hovered ? sectors.find((s) => s.id === hovered) ?? null : null;
  // Which signature the cursor is over, if any. Markers don't take pointer
  // events - the cell underneath does - so this comes from the hovered
  // sector rather than from the marker itself.
  const hoveredQuasarId = hovered ? occupantBySector.get(hovered) : undefined;

  // Rule-out painting: press and sweep to mark or clear a run of cells
  // instead of clicking each one. Non-null while a stroke is in progress,
  // and holds the state being painted rather than "toggle" - so sweeping
  // back over a cell you just marked leaves it marked, instead of
  // flickering it on and off as the pointer crosses.
  // Rank decides whether a filing names the signatures it got right.
  const { player } = usePlayer();
  const rank = player.rank;

  const [paintTarget, setPaintTarget] = useState<boolean | null>(null);

  useEffect(() => {
    if (paintTarget === null) return;
    // Listened for on the window, not the cell: a stroke very often ends
    // with the pointer outside the dial entirely.
    const end = () => setPaintTarget(null);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [paintTarget]);

  /** The set a given annotation mode owns, and its opposite. */
  function marksFor(mode: AnnotationMode) {
    return mode === "ruleout"
      ? { own: ruledOut, setOwn: setRuledOut, setOther: setMaybe }
      : { own: maybe, setOwn: setMaybe, setOther: setRuledOut };
  }

  function applyMark(sectorIdPainted: string, mode: AnnotationMode, on: boolean) {
    if (!armed) return;
    const { own, setOwn, setOther } = marksFor(mode);
    // Read for the sound only. The mark sets can be a render behind during
    // a fast sweep, which is harmless because the updates below set an
    // absolute state rather than toggling - at worst a tick is skipped.
    if ((own[armed]?.has(sectorIdPainted) ?? false) === on) return;
    setOwn((r) => {
      const next = new Set(r[armed] ?? []);
      if (on) next.add(sectorIdPainted);
      else next.delete(sectorIdPainted);
      return { ...r, [armed]: next };
    });
    // X and ? are mutually exclusive per cell: "definitely not here" and
    // "could be here" cannot both hold, and letting them stack would draw
    // two glyphs on one cell.
    if (on) {
      setOther((r) => {
        if (!r[armed]?.has(sectorIdPainted)) return r;
        const next = new Set(r[armed]);
        next.delete(sectorIdPainted);
        return { ...r, [armed]: next };
      });
    }
    playRuleOut();
  }

  const placedCount = quasars.filter((q) => placements[q.id]).length;
  const allPlaced = quasars.length > 0 && placedCount === quasars.length;

  // A filing describes the board it was made against, so it expires the
  // moment the board changes. Deriving that here rather than clearing the
  // state in each handler means no mutation path can forget to do it -
  // place, pick up, swap and reset are all covered by construction.
  const currentFiling =
    filing && quasars.every((q) => placements[q.id] === filing.placements[q.id])
      ? filing
      : null;

  // A closed region is settled - the outcome is already on the record and
  // in the review window, so the true catalog entry stops being a secret.
  // Showing it is the only feedback a retraction gives, and without it a
  // withdrawal teaches nothing at all. A confirmed region needs no reveal:
  // every marker is already right.
  const revealed = closed && outcome !== "confirmed";

  function handleCellClick(sectorIdClicked: string) {
    // A closed region is read-only. Editing it would suggest the filing
    // could still change, and the board is now evidence for the outcome
    // shown underneath it.
    if (closed) return;
    const occupantId = occupantBySector.get(sectorIdClicked);

    if (occupantId) {
      if (armed && armed !== occupantId) {
        // swap: bump current occupant back to the palette, place the armed one here
        setPlacements((p) => ({ ...p, [occupantId]: undefined, [armed]: sectorIdClicked }));
        setArmed(null);
        playPlace();
      } else {
        setPlacements((p) => ({ ...p, [occupantId]: undefined }));
        setArmed(occupantId);
        playButtonClick();
      }
      return;
    }

    if (!armed) return;

    if (markMode === "place") {
      setPlacements((p) => ({ ...p, [armed]: sectorIdClicked }));
      // Both annotations are answered by the placement itself, so neither
      // should survive under the marker.
      const clearHere = (r: CellMarks) => {
        const next = new Set(r[armed] ?? []);
        next.delete(sectorIdClicked);
        return { ...r, [armed]: next };
      };
      setRuledOut(clearHere);
      setMaybe(clearHere);
      setArmed(null);
      playPlace();
    }
    // The annotation modes are not handled here. They run off pointerdown
    // instead, so a press can turn into a sweep across several cells - and
    // going through click as well would toggle every cell a second time.
  }

  function handleCellPointerDown(
    e: React.PointerEvent<SVGPathElement>,
    sectorIdPressed: string,
    occupied: boolean
  ) {
    if (closed || !armed || !isAnnotation(markMode) || occupied) return;
    // Touch gives the element the gesture started in an implicit pointer
    // capture, which would stop pointerenter firing on the cells swept
    // into afterwards. Releasing it is what makes this work on a phone.
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const { own } = marksFor(markMode);
    const on = !(own[armed]?.has(sectorIdPressed) ?? false);
    setPaintTarget(on);
    applyMark(sectorIdPressed, markMode, on);
  }

  function handleCellPointerEnter(sectorIdEntered: string, occupied: boolean) {
    if (paintTarget === null || closed || !armed || !isAnnotation(markMode) || occupied) return;
    applyMark(sectorIdEntered, markMode, paintTarget);
  }

  function handleReset() {
    if (closed) return;
    setPlacements({});
    setRuledOut({});
    setMaybe({});
    setArmed(null);
    setFiling(null);
    if (region) window.localStorage.removeItem(starMapStorageKey(region.id));
    playReset();
  }

  function handleFile() {
    if (!region || !allPlaced || closed) return;
    const discrepancies = quasars.filter(
      (q) => placements[q.id] !== region.solution[q.id]?.sector
    ).length;
    const solved = discrepancies === 0;
    if (solved) playVerifySuccess();
    else playVerifyFail();
    const result = recordFiling(region, discrepancies);
    setFiling({ placements: { ...placements }, discrepancies, solved });
    setConfirmingWithdraw(false);
    if (result?.rankEvent) setRankEvent(result.rankEvent);
    // Only on the filing that actually closed it. The ones that merely
    // spend a filing leave you on the board with a discrepancy count to
    // reason from, which is the whole loop.
    if (result?.outcome) onClosed?.(region.id);
  }

  function handleWithdraw() {
    if (!region || closed) return;
    if (!confirmingWithdraw) {
      playButtonClick();
      setConfirmingWithdraw(true);
      return;
    }
    // Closing the window on a withdrawal can still change a rank - the
    // outcome is neutral in itself, but it may be the eighth region and
    // complete a review that the other seven had already decided.
    const event = withdrawSurvey(region);
    setConfirmingWithdraw(false);
    playReset();
    if (event) setRankEvent(event);
    onClosed?.(region.id);
  }

  return (
    <div className="flex flex-col gap-4">
      {region && (
        <p className="text-xs text-lcars-ice/60 leading-relaxed -mb-1">
          {closed
            ? "This survey is closed. The board is kept as filed."
            : "Arm a signature, then click a cell to place it. Rule Out marks cells it definitely isn't at; Maybe marks the ones it still could be. Both paint across a sweep."}
        </p>
      )}
      <div className="flex items-center justify-center">
        {/* 260px is what fits the desktop sidebar. Below `lg` the map is a
            full-width panel instead, so it's allowed to grow - and because
            the whole viewBox scales together, a bigger map buys bigger
            labels without crowding the dial any further. */}
        <svg
          viewBox="0 0 440 440"
          className="w-full max-w-[260px] max-lg:max-w-[420px] h-auto"
          /* Only while a rule-out sweep is actually possible. Left on
             permanently it would swallow the page scroll on a phone, where
             the map is tall enough that you need to scroll past it. */
          style={{ touchAction: armed && isAnnotation(markMode) ? "none" : undefined }}
        >
          <QuasarGlowDefs />
          {/* Under the cells, so the dashed ghost-target outline - which is
              still a per-cell stroke - lands on top rather than underneath. */}
          <FieldGridLines />

          {Array.from({ length: RING_COUNT }).flatMap((_, ring) =>
            Array.from({ length: SEGMENT_COUNT }).map((__, seg) => {
              const id = sectorId(ring, seg);
              const occupantId = occupantBySector.get(id);
              const isRuledOutForArmed = armed ? (ruledOut[armed]?.has(id) ?? false) : false;
              const isMaybeForArmed = armed ? (maybe[armed]?.has(id) ?? false) : false;
              // The hint marks cells the current mode would actually
              // change, so it drops off whatever this mode has already
              // marked - and in Place mode, off nothing.
              const isGhostTarget =
                !!armed &&
                !occupantId &&
                (markMode === "place"
                  ? true
                  : markMode === "ruleout"
                  ? !isRuledOutForArmed
                  : !isMaybeForArmed);
              const restingFill = occupantId
                ? CELL_FILL_OCCUPIED
                : isRuledOutForArmed
                ? RULED_OUT_TINT
                : isMaybeForArmed
                ? MAYBE_TINT
                : CELL_FILL;

              return (
                <path
                  key={id}
                  d={cellPath(ring, seg)}
                  fill={restingFill}
                  /* No outline of its own - the grid layer above draws it,
                     once. Only the armed-target hint is stroked here. */
                  stroke={isGhostTarget ? CELL_LINE_GHOST : "none"}
                  strokeDasharray={isGhostTarget ? "2 2" : undefined}
                  strokeWidth={1}
                  className={closed ? "cursor-default" : "cursor-pointer transition-colors"}
                  onPointerDown={(e) => handleCellPointerDown(e, id, !!occupantId)}
                  onPointerEnter={() => handleCellPointerEnter(id, !!occupantId)}
                  onMouseEnter={(e) => {
                    setHovered(id);
                    if (!occupantId && !closed) e.currentTarget.setAttribute("fill", CELL_FILL_HOVER);
                  }}
                  onMouseLeave={(e) => {
                    setHovered((h) => (h === id ? null : h));
                    if (!occupantId) e.currentTarget.setAttribute("fill", restingFill);
                  }}
                  onClick={() => handleCellClick(id)}
                />
              );
            })
          )}

          <FieldLabels />

          {/* quasar markers and rule-out marks, drawn on top of the grid */}
          {quasars.map((q) => {
            const sid = placements[q.id];
            if (!sid) return null;
            const p = centerOf(sid);
            // A ring means "this one was right in the filing you made".
            //
            // On a solved region that is every marker, and says nothing you
            // don't know. On a failed one it is the concession added on
            // 2026-08-02: below the top rank, a filing tells you which
            // signatures it got right, not just how many it got wrong.
            //
            // What keeps it from being the old oracle is where the answer
            // comes from. `filing` is a frozen snapshot, and a mark is only
            // drawn while that signature still sits where the snapshot left
            // it - so moving a marker drops its own mark and cannot make a
            // new one appear. You cannot walk a marker around and watch the
            // verdict follow; the only way to re-test is to spend another
            // filing. Markers you have *not* touched keep their verdict,
            // which is the part that makes it usable.
            const markedRight =
              !!filing &&
              showsFilingMarks(rank) &&
              placements[q.id] === filing.placements[q.id] &&
              !!region &&
              filing.placements[q.id] === region.solution[q.id]?.sector;
            const confirmed = (currentFiling?.solved ?? false) || markedRight;
            return (
              <g key={q.id} style={{ pointerEvents: "none" }}>
                <QuasarMarker
                  glyph={q.glyph}
                  x={p.x}
                  y={p.y}
                  core={MARKER_CORE}
                  color={q.color}
                  filterId="quasar-glow"
                />
                {confirmed && (
                  <MarkerRing x={p.x} y={p.y} r={CONFIRM_RING_R} color="#5ce1c8" />
                )}
              </g>
            );
          })}

          {/* The real catalog entry, drawn only once the region is closed:
              a dashed ring on each true sector, tethered to wherever the
              marker actually ended up. The tether is what makes a
              near-miss legible - one segment over reads very differently
              from the other side of the field. */}
          {revealed &&
            region &&
            quasars.map((q) => {
              const trueSid = region.solution[q.id]?.sector;
              if (!trueSid) return null;
              const t = centerOf(trueSid);
              const placedSid = placements[q.id];
              const p = placedSid && placedSid !== trueSid ? centerOf(placedSid) : null;
              return (
                <g key={`truth-${q.id}`} style={{ pointerEvents: "none" }}>
                  {p && (
                    <line
                      x1={p.x}
                      y1={p.y}
                      x2={t.x}
                      y2={t.y}
                      stroke={q.color}
                      strokeWidth={1}
                      strokeDasharray="2 3"
                      opacity={0.5}
                    />
                  )}
                  <MarkerRing x={t.x} y={t.y} r={CATALOG_RING_R} color={q.color} dashed />
                  <circle cx={t.x} cy={t.y} r={2} fill={q.color} />
                </g>
              );
            })}

          {armed &&
            [...(ruledOut[armed] ?? [])]
              .filter((sid) => !occupantBySector.has(sid))
              .map((sid) => {
                const p = centerOf(sid);
                const s = 5;
                return (
                  <g key={sid} style={{ pointerEvents: "none" }}>
                    <line
                      x1={p.x - s}
                      y1={p.y - s}
                      x2={p.x + s}
                      y2={p.y + s}
                      stroke="#ff6b6b"
                      strokeWidth={1.4}
                      strokeLinecap="round"
                      opacity={0.7}
                    />
                    <line
                      x1={p.x - s}
                      y1={p.y + s}
                      x2={p.x + s}
                      y2={p.y - s}
                      stroke="#ff6b6b"
                      strokeWidth={1.4}
                      strokeLinecap="round"
                      opacity={0.7}
                    />
                  </g>
                );
              })}

          {/* Candidate marks for the armed signature. Same rule as the X
              above: only for the armed signature, and never under a
              marker.

              A hollow ring rather than a glyph. It was a "?" first, which
              carried the meaning literally but painted as 4x11px on the
              260px dial - a tall thin scribble the eye reads as noise next
              to the X's compact cross. The ring takes the same 10-unit box
              as the X, so the two annotations are the same size and differ
              only in shape, which is what makes them separable at a
              glance. Hollow is load-bearing: a signature marker is a
              filled star with a glow, so nothing filled may appear in a
              cell that has no marker in it. */}
          {armed &&
            [...(maybe[armed] ?? [])]
              .filter((sid) => !occupantBySector.has(sid))
              .map((sid) => {
                const p = centerOf(sid);
                return (
                  <circle
                    key={sid}
                    cx={p.x}
                    cy={p.y}
                    r={5}
                    fill="none"
                    stroke={MAYBE_STROKE}
                    strokeWidth={1.4}
                    opacity={0.75}
                    style={{ pointerEvents: "none" }}
                  />
                );
              })}
        </svg>
      </div>

      {region && (
      <div className="flex flex-col gap-4 w-full">
        {/* Wraps because the mode switch grew a third button and the
            desktop sidebar is the tight case - the map is 260px there and
            the panel around it barely wider. If the switch and the Sector
            readout stop fitting on one line the readout drops below rather
            than the row overflowing its panel. */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
        {/* Nothing on a closed board responds to a click, so the mode
            switch would only advertise an interaction that no longer
            exists. */}
        <div className={closed ? "invisible" : ""}>
          <div className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50 mb-1.5">
            Click action
          </div>
          {/* Three modes now, so mapped rather than written out - a third
              hand-copied button is where the label and the mode it sets
              drift apart. Padding is tighter than the two-button version
              was: three labels plus the Sector readout is a lot to ask of
              a 260px-wide sidebar. */}
          <div className="flex gap-1 bg-lcars-panel rounded-full p-1 w-fit">
            {(
              [
                { mode: "place", label: "Place" },
                { mode: "ruleout", label: "Rule out" },
                { mode: "maybe", label: "Maybe" },
              ] as const
            ).map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  playButtonClick();
                  setMarkMode(mode);
                }}
                className={`lcars-caps text-[11px] px-2.5 py-1 rounded-full cursor-pointer whitespace-nowrap ${
                  markMode === mode
                    ? "bg-lcars-amber text-black font-semibold"
                    : "text-lcars-ice/60"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Hover readout: repeats whatever the cursor is over at a size
            the in-map labels can't reach without crowding the dial. Fixed
            min-width and a reserved second line so nothing reflows as the
            cursor moves. Sits at "--" on touch, where mouseenter never
            fires - accepted, since tapping a cell is the real interaction
            and it says what it did afterward anyway. */}
        <div className="text-right shrink-0 min-w-[104px]">
          <div className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50 mb-1.5">
            Sector
          </div>
          <div
            className={`font-mono text-lg leading-none tabular-nums ${
              hoveredSector ? "text-lcars-amber" : "text-lcars-ice/25"
            }`}
          >
            {hoveredSector ? hoveredSector.id : "--"}
          </div>
          <div className="text-[10px] text-lcars-ice/50 mt-1 h-[1.2em]">
            {hoveredSector
              ? `Ring ${hoveredSector.ring + 1} · Seg ${hoveredSector.seg + 1} · Quad ${quadrantOf(hoveredSector)}`
              : ""}
          </div>
        </div>
        </div>

        <div>
          <div className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50 mb-1.5">
            Signatures
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quasars.map((q) => {
              const sid = placements[q.id];
              // Hovering a marker on the dial outlines its chip here, which
              // is the only way to tell which signature a dot is without
              // placing or lifting it. Placed chips are dimmed to fade into
              // the background; the hovered one drops that too, or the
              // outline would be sitting on something half-faded.
              const isHovered = hoveredQuasarId === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  disabled={closed}
                  onClick={() => {
                    playButtonClick();
                    setArmed(armed === q.id ? null : q.id);
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
                    closed ? "cursor-default" : "cursor-pointer"
                  } ${
                    armed === q.id
                      ? "bg-lcars-amber text-black font-semibold"
                      : `bg-lcars-panel text-lcars-ice ${closed ? "" : "hover:bg-white/10"}`
                  } ${sid && !closed && !isHovered ? "opacity-60" : ""} ${
                    isHovered ? "ring-2 ring-lcars-ice" : ""
                  }`}
                >
                  <QuasarStar color={q.color} glyph={q.glyph} size={16} />
                  <span>{q.designation}</span>
                  {sid && (
                    <span className="text-[9px] text-lcars-ice/50 font-mono">{sid}</span>
                  )}
                  {revealed && region && region.solution[q.id]?.sector !== sid && (
                    <span className="text-[9px] font-mono text-lcars-teal">
                      &rarr; {region.solution[q.id]?.sector}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {!closed && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Disabled until every signature is placed. A partial filing
                would be a free probe - place one marker, file, read the
                count, and you've tested a single cell in isolation, which is
                exactly the oracle this change removes. A filing is a
                complete classification or it isn't one. */}
            <button
              type="button"
              disabled={!allPlaced}
              onClick={handleFile}
              className="lcars-caps text-xs px-4 py-1.5 rounded-full bg-lcars-teal text-black font-semibold cursor-pointer hover:bg-lcars-ice transition-colors disabled:bg-lcars-panel disabled:text-lcars-ice/40 disabled:cursor-not-allowed disabled:hover:bg-lcars-panel"
            >
              {filingsLeft === 1 ? "File — Final" : "File Classification"}
            </button>
            {/* Withdrawal has to be a first-class control, not a hidden
                escape hatch: roughly one region in five is provably
                unsolvable, and the player can't tell those from ones they
                merely misread. It costs nothing against rank, so the only
                thing standing between them and a plateau is their own
                willingness to file. */}
            <button
              type="button"
              onClick={handleWithdraw}
              onBlur={() => setConfirmingWithdraw(false)}
              className={`lcars-caps text-xs px-4 py-1.5 rounded-full font-semibold cursor-pointer transition-colors ${
                confirmingWithdraw
                  ? "bg-lcars-red text-black hover:bg-lcars-salmon"
                  : "bg-lcars-panel text-lcars-ice/80 hover:bg-white/15"
              }`}
            >
              {confirmingWithdraw ? "Confirm withdrawal" : "Withdraw"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="lcars-caps text-xs px-4 py-1.5 rounded-full bg-lcars-red text-black font-semibold cursor-pointer hover:bg-lcars-salmon transition-colors"
            >
              Reset
            </button>
          </div>
        )}

        <div className="flex flex-col gap-1.5 text-[11px] font-mono">
          <div className="text-lcars-ice/50">
            {placedCount} / {quasars.length} placed
            {!closed && (
              <>
                {" · "}
                <span className={filingsLeft === 1 ? "text-lcars-salmon" : undefined}>
                  {filingsLeft} of {filingLimit} filings left
                </span>
              </>
            )}
          </div>

          {/* The cross-check result: a count, never which ones. That is
              enough to reason from - it says how far off the whole
              assignment is - without answering any individual sector, so
              narrowing it down stays deduction rather than probing. */}
          {!closed && currentFiling && !currentFiling.solved && (
            <div className="text-lcars-salmon">
              Cross-check: {currentFiling.discrepancies} of {quasars.length} signature
              {currentFiling.discrepancies === 1 ? "" : "s"} inconsistent
            </div>
          )}

          {closed && outcome && (
            <div>
              <div className={`${OUTCOME_COPY[outcome].tone} font-semibold`}>
                {OUTCOME_COPY[outcome].label}
              </div>
              <div className="text-lcars-ice/45 mt-0.5">{OUTCOME_COPY[outcome].detail}</div>
              {revealed && (
                <div className="text-lcars-ice/45 mt-0.5">
                  Catalog positions shown on the field.
                </div>
              )}
            </div>
          )}

          {rankEvent && (
            <div className="flex items-center gap-2.5 rounded-lg bg-black/40 px-2.5 py-2 mt-0.5">
              <RankInsignia rank={rankEvent.to} size={32} />
              <div className="min-w-0 leading-tight">
                <div
                  className="lcars-caps text-[11px] font-semibold"
                  style={{ color: rankHex(rankEvent.to) }}
                >
                  {rankEvent.to === RELIEVED
                    ? "Relieved of survey duty"
                    : rankEvent.to > rankEvent.from
                    ? `Promoted — ${rankTitle(rankEvent.to)}`
                    : `Demoted — ${rankTitle(rankEvent.to)}`}
                </div>
                <div className="text-[10px] text-lcars-ice/50 mt-0.5">
                  Catalog integrity review: {rankEvent.confirmed} confirmed,{" "}
                  {rankEvent.retracted} retracted over {REVIEW_WINDOW} regions.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
