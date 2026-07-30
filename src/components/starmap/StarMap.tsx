"use client";

import { useEffect, useMemo, useState } from "react";
import { Region } from "@/lib/puzzle-types";
import { RING_COUNT, SEGMENT_COUNT, buildSectors, quadrantOf, sectorId } from "@/lib/grid";
import { annularSegmentPath, polarPoint } from "@/lib/polar-geometry";
import { quasarColorHex } from "@/lib/quasar-colors";
import { starMapStorageKey } from "@/lib/starmap-storage";
import { isSolved, recordVerify } from "@/lib/survey-log";
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
  const [verified, setVerified] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from
       an external store (localStorage) on mount; state must start empty on
       the server since window is unavailable there. */
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
        if (isSolved(region.id) && stillAllCorrect) setVerified(true);
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

  const placedCount = quasars.filter((q) => placements[q.id]).length;
  const correctCount =
    verified && region
      ? quasars.filter((q) => placements[q.id] === region.solution[q.id]?.sector).length
      : 0;

  function handleCellClick(sectorIdClicked: string) {
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
    } else {
      setRuledOut((r) => {
        const current = new Set(r[armed] ?? []);
        if (current.has(sectorIdClicked)) current.delete(sectorIdClicked);
        else current.add(sectorIdClicked);
        return { ...r, [armed]: current };
      });
      playRuleOut();
    }
  }

  function handleReset() {
    setPlacements({});
    setRuledOut({});
    setArmed(null);
    setVerified(false);
    if (region) window.localStorage.removeItem(starMapStorageKey(region.id));
    playReset();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center">
        {/* 260px is what fits the desktop sidebar. Below `lg` the map is a
            full-width panel instead, so it's allowed to grow - and because
            the whole viewBox scales together, a bigger map buys bigger
            labels without crowding the dial any further. */}
        <svg viewBox="0 0 440 440" className="w-full max-w-[260px] max-lg:max-w-[420px] h-auto">
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

          {Array.from({ length: RING_COUNT }).flatMap((_, ring) =>
            Array.from({ length: SEGMENT_COUNT }).map((__, seg) => {
              const r0 = INNER_HOLE + ring * RING_THICKNESS + RING_GAP / 2;
              const r1 = INNER_HOLE + (ring + 1) * RING_THICKNESS - RING_GAP / 2;
              const a0 = seg * SEG_SPAN + SEG_GAP_DEG / 2;
              const a1 = (seg + 1) * SEG_SPAN - SEG_GAP_DEG / 2;
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
                  stroke={isGhostTarget ? CELL_LINE_GHOST : CELL_LINE}
                  strokeDasharray={isGhostTarget ? "2 2" : undefined}
                  strokeWidth={1}
                  className="cursor-pointer transition-colors"
                  onMouseEnter={(e) => {
                    setHovered(id);
                    if (!occupantId) e.currentTarget.setAttribute("fill", CELL_FILL_HOVER);
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

          {/* quasar markers and rule-out marks, drawn on top of the grid */}
          {quasars.map((q) => {
            const sid = placements[q.id];
            if (!sid) return null;
            const sector = sectors.find((s) => s.id === sid)!;
            const r0 = INNER_HOLE + sector.ring * RING_THICKNESS + RING_GAP / 2;
            const r1 = INNER_HOLE + (sector.ring + 1) * RING_THICKNESS - RING_GAP / 2;
            const a0 = sector.seg * SEG_SPAN + SEG_GAP_DEG / 2;
            const a1 = (sector.seg + 1) * SEG_SPAN - SEG_GAP_DEG / 2;
            const p = polarPoint(CX, CY, (r0 + r1) / 2, (a0 + a1) / 2);
            const correctness =
              verified && region
                ? placements[q.id] === region.solution[q.id]?.sector
                  ? "correct"
                  : "incorrect"
                : null;
            return (
              <g key={q.id} style={{ pointerEvents: "none" }}>
                <circle cx={p.x} cy={p.y} r={7} fill={q.color} filter="url(#quasar-glow)" />
                <circle cx={p.x} cy={p.y} r={4} fill={q.color} />
                {correctness && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={11}
                    fill="none"
                    stroke={correctness === "correct" ? "#5ce1c8" : "#ff6b6b"}
                    strokeWidth={1.4}
                  />
                )}
              </g>
            );
          })}

          {armed &&
            [...(ruledOut[armed] ?? [])]
              .filter((sid) => !occupantBySector.has(sid))
              .map((sid) => {
                const sector = sectors.find((s) => s.id === sid)!;
                const r0 = INNER_HOLE + sector.ring * RING_THICKNESS + RING_GAP / 2;
                const r1 = INNER_HOLE + (sector.ring + 1) * RING_THICKNESS - RING_GAP / 2;
                const a0 = sector.seg * SEG_SPAN + SEG_GAP_DEG / 2;
                const a1 = (sector.seg + 1) * SEG_SPAN - SEG_GAP_DEG / 2;
                const p = polarPoint(CX, CY, (r0 + r1) / 2, (a0 + a1) / 2);
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
        <div>
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
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    playButtonClick();
                    setArmed(armed === q.id ? null : q.id);
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs cursor-pointer transition-colors ${
                    armed === q.id
                      ? "bg-lcars-amber text-black font-semibold"
                      : "bg-lcars-panel text-lcars-ice hover:bg-white/10"
                  } ${sid ? "opacity-60" : ""}`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: q.color }}
                  />
                  <span>{q.designation}</span>
                  {sid && (
                    <span className="text-[9px] text-lcars-ice/50 font-mono">{sid}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!region) return;
              const allCorrect =
                placedCount === quasars.length &&
                quasars.every((q) => placements[q.id] === region.solution[q.id]?.sector);
              if (allCorrect) playVerifySuccess();
              else playVerifyFail();
              recordVerify(region.id, allCorrect);
              setVerified(true);
            }}
            className="lcars-caps text-xs px-4 py-1.5 rounded-full bg-lcars-teal text-black font-semibold cursor-pointer hover:bg-lcars-ice transition-colors"
          >
            Verify
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="lcars-caps text-xs px-4 py-1.5 rounded-full bg-lcars-red text-black font-semibold cursor-pointer hover:bg-lcars-salmon transition-colors"
          >
            Reset
          </button>
        </div>

        <div className="text-[11px] text-lcars-ice/50 font-mono">
          {placedCount} / {quasars.length} placed
          {verified && ` · ${correctCount} / ${quasars.length} correct`}
        </div>
      </div>
      )}
    </div>
  );
}
