"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Region } from "@/lib/puzzle-types";
import {
  QUADRANTS,
  RING_COUNT,
  SEGMENT_COUNT,
  buildSectors,
  quadrantOf,
  sectorId,
} from "@/lib/grid";
import { annularSegmentPath, polarPoint } from "@/lib/polar-geometry";
import { quasarColorHex } from "@/lib/quasar-colors";
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
import {
  playButtonClick,
  playPlace,
  playReset,
  playRuleOut,
  playVerifyFail,
  playVerifySuccess,
} from "@/lib/sound";

type Placements = Record<string, string | undefined>; // quasarId -> sectorId
type RuledOut = Record<string, Set<string>>; // quasarId -> set of sectorId
type MarkMode = "place" | "ruleout";

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
}

const CX = 220;
const CY = 220;
const INNER_HOLE = 30;
const MAX_R = 200;
const RING_GAP = 3;
const SEG_GAP_DEG = 3;
const RING_THICKNESS = (MAX_R - INNER_HOLE) / RING_COUNT;
const SEG_SPAN = 360 / SEGMENT_COUNT;

// A quadrant is a run of adjacent segments (grid.ts: two of the eight).
// Cells inside one quadrant sit flush, sharing a single dividing line, so
// the pair reads as one block; the gap is spent only where a quadrant
// actually ends. Without this every boundary looked alike and the four
// quadrants were invisible on the dial - which matters, because two of the
// four briefing clues are quadrant clues.
const SEGMENTS_PER_QUADRANT = SEGMENT_COUNT / QUADRANTS.length;
const opensQuadrant = (seg: number) => seg % SEGMENTS_PER_QUADRANT === 0;
const closesQuadrant = (seg: number) => seg % SEGMENTS_PER_QUADRANT === SEGMENTS_PER_QUADRANT - 1;

/** Angular extent of one cell, gapped only at quadrant boundaries. */
const cellStartAngle = (seg: number) =>
  seg * SEG_SPAN + (opensQuadrant(seg) ? SEG_GAP_DEG / 2 : 0);
const cellEndAngle = (seg: number) =>
  (seg + 1) * SEG_SPAN - (closesQuadrant(seg) ? SEG_GAP_DEG / 2 : 0);

// Ring/segment/centre labels. The size is in SVG user units, not pixels:
// the viewBox is 440 wide and renders into 260px in the desktop sidebar,
// so a label paints at size * 260/440 there (and correspondingly larger on
// a phone, where the map is wider). The old value of 10 came out at 5.9px,
// which was simply too small to read. 18 lands at 10.6px and, per the label-size trial in
// the Prototypes panel, is still clear of the grid - the ring labels sit
// at a fixed radius and only start crowding their own ring nearer 22.
// Neutral gray rather than the ice tint used elsewhere, so labels this
// much larger sit behind the signatures instead of competing with them.
const LABEL_SIZE = 18;
const LABEL_SIZE_CTR = 17;
const LABEL_FILL = "rgba(198,203,211,0.45)";

// Quadrant labels sit in the corners of the viewBox, which are empty: the
// dial is a circle of radius 200 in a 440 box, so the diagonals have ~80
// units of clearance the cardinal directions don't. That works because a
// quadrant is two of the eight segments, which puts every quadrant's
// midpoint exactly on a diagonal - 45, 135, 225, 315 degrees.
//
// Worth labelling at all because two of the four briefing clues are
// quadrant clues, and until now the map never said which segments a
// quadrant covered. See grid.ts: quadrant I is segments S1-S2, II is
// S3-S4, and so on clockwise.
const QUADRANT_LABEL_R = 236;
// User units, like every other label here. The sidebar renders the 440-unit
// viewBox at 260px, so this paints at ~10px - matching the ring and segment
// labels, which the label-size trial in the Prototypes panel settled at
// 10.6px after 5.9px proved unreadable. Going larger is what runs "QUAD III"
// out of the corner; `scripts/check-quadrant-labels.ts` measures the margin.
const QUADRANT_LABEL_SIZE = 17;
const QUADRANT_FILL = "rgba(198,203,211,0.40)";
const QUADRANT_LINE = "rgba(232,240,247,0.30)";

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

const CELL_LINE = "rgba(232,240,247,0.24)";
const CELL_LINE_GHOST = "rgba(232,240,247,0.65)";
const CELL_FILL = "rgba(207,227,242,0.045)";
const CELL_FILL_HOVER = "rgba(232,240,247,0.14)";
const RULED_OUT_TINT = "rgba(255,107,107,0.05)";

export function StarMap({ region }: { region: Region | null }) {
  const sectors = useMemo(() => buildSectors(), []);
  const quasars = useMemo(
    () =>
      region
        ? region.quasars.map((q, i) => ({
            id: q.id,
            designation: q.designation,
            color: quasarColorHex(i),
          }))
        : [],
    [region]
  );

  const [placements, setPlacements] = useState<Placements>({});
  const [ruledOut, setRuledOut] = useState<RuledOut>({});
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
        const restored: RuledOut = {};
        for (const qid in saved.ruledOut ?? {}) restored[qid] = new Set(saved.ruledOut[qid]);
        setRuledOut(restored);
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
    window.localStorage.setItem(
      starMapStorageKey(region.id),
      JSON.stringify({ placements, ruledOut: serializedRuledOut } satisfies SavedState)
    );
  }, [placements, ruledOut, loaded, region]);

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

  /** Centre point of a sector's cell, in SVG user units. */
  const centerOf = useMemo(() => {
    const byId = new Map(sectors.map((s) => [s.id, s]));
    return (sid: string) => {
      const sector = byId.get(sid)!;
      const r0 = INNER_HOLE + sector.ring * RING_THICKNESS + RING_GAP / 2;
      const r1 = INNER_HOLE + (sector.ring + 1) * RING_THICKNESS - RING_GAP / 2;
      const a0 = cellStartAngle(sector.seg);
      const a1 = cellEndAngle(sector.seg);
      return polarPoint(CX, CY, (r0 + r1) / 2, (a0 + a1) / 2);
    };
  }, [sectors]);

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

  function applyRuleOut(sectorIdPainted: string, ruled: boolean) {
    if (!armed) return;
    // Read for the sound only. `ruledOut` can be a render behind during a
    // fast sweep, which is harmless because the update below sets an
    // absolute state rather than toggling - at worst a tick is skipped.
    if ((ruledOut[armed]?.has(sectorIdPainted) ?? false) === ruled) return;
    setRuledOut((r) => {
      const next = new Set(r[armed] ?? []);
      if (ruled) next.add(sectorIdPainted);
      else next.delete(sectorIdPainted);
      return { ...r, [armed]: next };
    });
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
      setRuledOut((r) => {
        const next = new Set(r[armed] ?? []);
        next.delete(sectorIdClicked);
        return { ...r, [armed]: next };
      });
      setArmed(null);
      playPlace();
    }
    // Rule Out is not handled here. It runs off pointerdown instead, so a
    // press can turn into a sweep across several cells - and going through
    // click as well would toggle every cell a second time.
  }

  function handleCellPointerDown(
    e: React.PointerEvent<SVGPathElement>,
    sectorIdPressed: string,
    occupied: boolean
  ) {
    if (closed || !armed || markMode !== "ruleout" || occupied) return;
    // Touch gives the element the gesture started in an implicit pointer
    // capture, which would stop pointerenter firing on the cells swept
    // into afterwards. Releasing it is what makes this work on a phone.
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const ruled = !(ruledOut[armed]?.has(sectorIdPressed) ?? false);
    setPaintTarget(ruled);
    applyRuleOut(sectorIdPressed, ruled);
  }

  function handleCellPointerEnter(sectorIdEntered: string, occupied: boolean) {
    if (paintTarget === null || closed || !armed || markMode !== "ruleout" || occupied) return;
    applyRuleOut(sectorIdEntered, paintTarget);
  }

  function handleReset() {
    if (closed) return;
    setPlacements({});
    setRuledOut({});
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
  }

  return (
    <div className="flex flex-col gap-4">
      {region && (
        <p className="text-xs text-lcars-ice/60 leading-relaxed -mb-1">
          {closed
            ? "This survey is closed. The board is kept as filed."
            : "Arm a signature, then click a cell to place it. Switch to Rule Out to mark cells it definitely isn't at."}
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
          style={{ touchAction: armed && markMode === "ruleout" ? "none" : undefined }}
        >
          <defs>
            {/* Blurred glow halo behind a solid core - the same look Sweep
                Scope's blips use, kept consistent so a quasar reads the
                same everywhere it's shown. */}
            <filter id="quasar-glow" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>
          </defs>
          <circle cx={CX} cy={CY} r={INNER_HOLE - 4} fill="none" stroke={CELL_LINE} />
          <text
            x={CX}
            y={CY + 6}
            textAnchor="middle"
            fontSize={LABEL_SIZE_CTR}
            letterSpacing="0.08em"
            fill={LABEL_FILL}
          >
            CTR
          </text>

          {/* The grid, drawn once per line.

              The cells below are fill-only. They can't carry the outline:
              two cells inside a quadrant share a radial edge, so stroking
              each cell painted that edge twice and it came out heavier than
              the quadrant's real boundary - making the middle of a quadrant
              look like its edge, which is the opposite of the point.

              So each quadrant-ring block is outlined as one shape, with its
              internal divider drawn separately as a single line. Drawn
              before the cells so the dashed ghost-target outline, which is
              still a per-cell stroke, lands on top rather than underneath. */}
          {Array.from({ length: RING_COUNT }).flatMap((_, ring) =>
            QUADRANTS.map((quadrant, q) => {
              const r0 = INNER_HOLE + ring * RING_THICKNESS + RING_GAP / 2;
              const r1 = INNER_HOLE + (ring + 1) * RING_THICKNESS - RING_GAP / 2;
              const firstSeg = q * SEGMENTS_PER_QUADRANT;
              return (
                <g key={`grid-${ring}-${quadrant}`} style={{ pointerEvents: "none" }}>
                  <path
                    d={annularSegmentPath(
                      CX,
                      CY,
                      r0,
                      r1,
                      cellStartAngle(firstSeg),
                      cellEndAngle(firstSeg + SEGMENTS_PER_QUADRANT - 1)
                    )}
                    fill="none"
                    stroke={CELL_LINE}
                    strokeWidth={1}
                  />
                  {Array.from({ length: SEGMENTS_PER_QUADRANT - 1 }).map((__, k) => {
                    const angle = (firstSeg + k + 1) * SEG_SPAN;
                    const inner = polarPoint(CX, CY, r0, angle);
                    const outer = polarPoint(CX, CY, r1, angle);
                    return (
                      <line
                        key={k}
                        x1={inner.x}
                        y1={inner.y}
                        x2={outer.x}
                        y2={outer.y}
                        stroke={CELL_LINE}
                        strokeWidth={1}
                      />
                    );
                  })}
                </g>
              );
            })
          )}

          {Array.from({ length: RING_COUNT }).flatMap((_, ring) =>
            Array.from({ length: SEGMENT_COUNT }).map((__, seg) => {
              const r0 = INNER_HOLE + ring * RING_THICKNESS + RING_GAP / 2;
              const r1 = INNER_HOLE + (ring + 1) * RING_THICKNESS - RING_GAP / 2;
              const a0 = cellStartAngle(seg);
              const a1 = cellEndAngle(seg);
              const id = sectorId(ring, seg);
              const occupantId = occupantBySector.get(id);
              const isRuledOutForArmed = armed ? (ruledOut[armed]?.has(id) ?? false) : false;
              const isGhostTarget =
                !!armed &&
                !occupantId &&
                (markMode === "place" ? true : !isRuledOutForArmed);

              return (
                <path
                  key={id}
                  d={annularSegmentPath(CX, CY, r0, r1, a0, a1)}
                  fill={
                    occupantId
                      ? "rgba(207,227,242,0.08)"
                      : isRuledOutForArmed
                      ? RULED_OUT_TINT
                      : CELL_FILL
                  }
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
                    if (!occupantId)
                      e.currentTarget.setAttribute(
                        "fill",
                        isRuledOutForArmed ? RULED_OUT_TINT : CELL_FILL
                      );
                  }}
                  onClick={() => handleCellClick(id)}
                />
              );
            })
          )}

          {Array.from({ length: RING_COUNT }).map((_, ring) => {
            if (ring % 2 !== 0) return null;
            const r0 = INNER_HOLE + ring * RING_THICKNESS + RING_GAP / 2;
            const r1 = INNER_HOLE + (ring + 1) * RING_THICKNESS - RING_GAP / 2;
            const p = polarPoint(CX, CY, (r0 + r1) / 2, -SEG_GAP_DEG);
            return (
              <text
                key={`ring-label-${ring}`}
                x={p.x}
                y={p.y}
                textAnchor="end"
                fontSize={LABEL_SIZE}
                fill={LABEL_FILL}
                fontFamily="ui-monospace, monospace"
              >
                R{ring + 1}
              </text>
            );
          })}

          {Array.from({ length: SEGMENT_COUNT }).map((_, seg) => {
            const mid = seg * SEG_SPAN + SEG_SPAN / 2;
            const p = polarPoint(CX, CY, MAX_R + 14, mid);
            return (
              <text
                key={`seg-label-${seg}`}
                x={p.x}
                y={p.y}
                textAnchor={mid > 185 ? "end" : mid < 175 ? "start" : "middle"}
                fontSize={LABEL_SIZE}
                fill={LABEL_FILL}
                fontFamily="ui-monospace, monospace"
              >
                S{seg + 1}
              </text>
            );
          })}

          {/* Quadrant boundaries and labels. The boundaries fall in the
              gaps the segments already leave, so these lines sit in dead
              space rather than over any cell - they just make the four
              blocks legible as blocks. Drawn before the markers so a
              signature is never underneath one. */}
          {QUADRANTS.map((quadrant, q) => {
            const boundary = q * 90;
            const a = polarPoint(CX, CY, INNER_HOLE, boundary);
            const b = polarPoint(CX, CY, MAX_R + 4, boundary);
            const label = polarPoint(CX, CY, QUADRANT_LABEL_R, boundary + 45);
            return (
              <g key={`quad-${quadrant}`} style={{ pointerEvents: "none" }}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={QUADRANT_LINE}
                  strokeWidth={1}
                />
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={QUADRANT_LABEL_SIZE}
                  letterSpacing="0.12em"
                  fill={QUADRANT_FILL}
                  fontFamily="ui-monospace, monospace"
                >
                  QUAD {quadrant}
                </text>
              </g>
            );
          })}

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
                <circle cx={p.x} cy={p.y} r={7} fill={q.color} filter="url(#quasar-glow)" />
                <circle cx={p.x} cy={p.y} r={4} fill={q.color} />
                {confirmed && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={11}
                    fill="none"
                    stroke="#5ce1c8"
                    strokeWidth={1.4}
                  />
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
                  <circle
                    cx={t.x}
                    cy={t.y}
                    r={9}
                    fill="none"
                    stroke={q.color}
                    strokeWidth={1.6}
                    strokeDasharray="3 2.5"
                  />
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
        </svg>
      </div>

      {region && (
      <div className="flex flex-col gap-4 w-full">
        <div className="flex items-start justify-between gap-3">
        {/* Nothing on a closed board responds to a click, so the mode
            switch would only advertise an interaction that no longer
            exists. */}
        <div className={closed ? "invisible" : ""}>
          <div className="lcars-caps text-[10px] tracking-wider text-lcars-ice/50 mb-1.5">
            Click action
          </div>
          <div className="flex gap-1 bg-lcars-panel rounded-full p-1 w-fit">
            <button
              type="button"
              onClick={() => {
                playButtonClick();
                setMarkMode("place");
              }}
              className={`lcars-caps text-[11px] px-3 py-1 rounded-full cursor-pointer ${
                markMode === "place" ? "bg-lcars-amber text-black font-semibold" : "text-lcars-ice/60"
              }`}
            >
              Place
            </button>
            <button
              type="button"
              onClick={() => {
                playButtonClick();
                setMarkMode("ruleout");
              }}
              className={`lcars-caps text-[11px] px-3 py-1 rounded-full cursor-pointer ${
                markMode === "ruleout" ? "bg-lcars-amber text-black font-semibold" : "text-lcars-ice/60"
              }`}
            >
              Rule out
            </button>
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
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: q.color }}
                  />
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
