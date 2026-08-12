"use client";

import { useMemo } from "react";
import { Region } from "@/lib/puzzle-types";
import { buildSectors, RING_COUNT, SEGMENT_COUNT } from "@/lib/grid";

const sectorLookup = new Map(buildSectors().map((s) => [s.id, s]));

/** Deterministic per region, so the view does not re-roll on every render. */
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One colour per classification, assigned by the region's own type list. */
const TYPE_COLORS = ["#ffcc66", "#8899ff", "#cf4f4f", "#baa4e5", "#66ccbb", "#ea9c72"];

export interface ConstellationStar {
  type: string;
  x: number;
  y: number;
}

/**
 * Picks the stars and lays them out: true relative geometry, arbitrarily
 * rotated, labelled by classification and by nothing else.
 *
 * Exported separately from the drawing so the layout can be reasoned about
 * and checked without a browser.
 */
export function buildConstellation(region: Region, count: number): ConstellationStar[] {
  const rand = seededRandom(region.id);
  const names = Object.keys(region.solution);

  // Seeded shuffle, then take a few - "only include a few stars.. not all".
  const order = [...names];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const chosen = order.slice(0, Math.min(count, order.length));

  // Polar to cartesian. `ring + 1` so the innermost ring is not a point at
  // the origin, which would collapse every inner signature onto one spot.
  // Rotated by a whole number of *segments*, never a free angle.
  //
  // Not a correctness fix - a tractability one, and worth stating precisely
  // because the obvious argument for it is wrong. A free-angle rotation is
  // still *rigid*, so the shape stays congruent to the real arrangement and
  // could in principle be rotated back. Nothing is falsified by it.
  //
  // What it destroys is the player's ability to search. The field is polar
  // with eight segments, so a real arrangement can only be seen from eight
  // orientations. Quantising to those turns registration into eight things to
  // try; a free angle turns it into eyeballing a continuous rotation, which
  // is the same puzzle with the handle filed off.
  //
  // That matters most once this is paired with an anonymous anchor (backlog
  // 28): the anchor is one fixed cell of known classification, and
  // registering means trying the turns until the shape fits it. Eight is also
  // about the right ambiguity - enough that the shape alone gives nothing
  // away, few enough to work through.
  const turn = Math.floor(rand() * SEGMENT_COUNT);
  const angle = (turn / SEGMENT_COUNT) * Math.PI * 2;
  const raw = chosen.map((name) => {
    const sector = sectorLookup.get(region.solution[name].sector)!;
    const r = sector.ring + 1;
    const theta = (sector.seg / SEGMENT_COUNT) * Math.PI * 2;
    return {
      type: region.solution[name].type,
      x: r * Math.cos(theta + angle),
      y: r * Math.sin(theta + angle),
    };
  });

  // Centre on the group, so the arbitrary rotation is the only thing the
  // player sees and absolute position leaks nothing.
  const cx = raw.reduce((n, p) => n + p.x, 0) / raw.length;
  const cy = raw.reduce((n, p) => n + p.y, 0) / raw.length;
  return raw.map((p) => ({ type: p.type, x: p.x - cx, y: p.y - cy }));
}

/**
 * The constellation: a handful of signatures drawn as a shape, with no grid,
 * no orientation and no names - only classifications.
 *
 * The user's description, 2026-08-11: *"some sort of constellation view that
 * shows you a number of stars without the star map grid. It would be rotated
 * arbitrarily so you won't necessarily know what is what... So you can say, I
 * have to ancient relics near each other and farther away at thrice the
 * distance is some other type of quasar."*
 *
 * ## The hazard to evaluate first
 *
 * **What you see here is Euclidean; what the Sweep Scope reports is not.**
 * The field's metric is orthogonal - rings and segments, the distance used
 * everywhere else in this game - and two signatures that look equally far
 * apart on this picture can read differently on the scope. That is not a bug
 * to fix before trying it; it is the thing to decide about. Either the view
 * is a true picture and the player must learn it speaks a second language,
 * or it should be laid out to honour the orthogonal metric and stop being a
 * picture. Trying the honest version first is the way to find out which.
 *
 * Positions are centred on the group and rotated by a per-region angle, so
 * nothing here leaks an absolute sector. Labels are the classification only.
 */
export function ConstellationView({
  region,
  count = 4,
  className = "",
}: {
  region: Region;
  /** How many signatures to include. Never all of them. */
  count?: number;
  className?: string;
}) {
  const stars = useMemo(() => buildConstellation(region, count), [region, count]);

  const colorOfType = useMemo(() => {
    const map = new Map<string, string>();
    region.quasarTypes.forEach((t, i) => map.set(t, TYPE_COLORS[i % TYPE_COLORS.length]));
    return (t: string) => map.get(t) ?? "#cce6ff";
  }, [region.quasarTypes]);

  // Fit the group to the box with room for labels, rather than assuming a
  // scale - a tight cluster and a spread one both have to fill it.
  const extent = Math.max(1, ...stars.map((s) => Math.max(Math.abs(s.x), Math.abs(s.y))));
  const scale = 34 / extent;
  const VIEW = 100;

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className={className}
      role="img"
      aria-label={`Constellation of ${stars.length} signatures, classifications only`}
    >
      <rect x={0} y={0} width={VIEW} height={VIEW} fill="#05070a" rx={2} />

      {/* Every pair joined, faintly. The shape is the information, and
          without the joins a scatter of dots reads as unrelated marks. */}
      {stars.map((a, i) =>
        stars.slice(i + 1).map((b, j) => (
          <line
            key={`${i}-${j}`}
            x1={VIEW / 2 + a.x * scale}
            y1={VIEW / 2 + a.y * scale}
            x2={VIEW / 2 + b.x * scale}
            y2={VIEW / 2 + b.y * scale}
            stroke="rgba(204,230,255,0.16)"
            strokeWidth={0.4}
          />
        ))
      )}

      {stars.map((s, i) => {
        const x = VIEW / 2 + s.x * scale;
        const y = VIEW / 2 + s.y * scale;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={2.6} fill={colorOfType(s.type)} />
            <text
              x={x}
              y={y - 4.4}
              textAnchor="middle"
              fontSize={4.2}
              fill={colorOfType(s.type)}
              className="lcars-caps"
            >
              {s.type}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export { RING_COUNT };
