// Hex palette for quasar *identity* markers (Sweep Scope blips, Star Map
// icons), keyed by the quasar's position in a region's quasar list - not
// its (unknown-to-the-player) type. Sized past the max region quasar count
// (6-8, see project memory on repeated types) so two quasars in the same
// puzzle never collide on the same color.
const QUASAR_HEX = [
  "#6fe3a0", // green
  "#ff6b6b", // red
  "#f5d35c", // yellow
  "#6fd0e8", // cyan
  "#b79cf0", // violet
  "#ffb454", // orange
  "#e88fd8", // magenta
  "#c8e86e", // lime
  "#7ab8ff", // sky blue
  "#ff9e7a", // coral
];

/**
 * Offered by the picker but never auto-assigned.
 *
 * The ten above are all mid-lightness chromatic tints, which is right for
 * defaults - they read as a set. That also means the picker could only ever
 * trade one bright tint for another, so a player trying to separate two
 * lookalikes had nowhere genuinely different to go.
 *
 * These fill the gaps that list has no entry anywhere near: the neutral
 * axis (white, grey), a dark saturated blue, a desaturated warm, and the
 * ends of the teal/pink ranges the defaults only sample the pale end of.
 *
 * Kept out of `QUASAR_HEX` rather than appended to it because that array is
 * the default-assignment order. Appending would be harmless today only
 * because regions cap at 8 signatures; the moment that changed, grey would
 * start being handed out as a default, and a grey blip on a grey-labelled
 * dial is the one colour here that should always be a deliberate choice.
 *
 * `scripts/check-palette-distance.ts` is the check: every entry here clears
 * dE 22.6 against all ten defaults, above the defaults' own tightest pair
 * (21.1, yellow/orange), so nothing below is a closer call than something
 * the palette already shipped. A pale aqua was cut at dE 17.0 against cyan.
 */
const EXTRA_HEX = [
  "#ffffff", // white
  "#98a2ae", // grey
  "#2fb8a0", // deep teal
  "#5b6ee8", // indigo
  "#c2926a", // bronze
  "#ff4d94", // hot pink
];

/** Everything the recolour picker in the Star Manifest offers. */
export const QUASAR_PALETTE: readonly string[] = [...QUASAR_HEX, ...EXTRA_HEX];

export function quasarColorHex(index: number): string {
  return QUASAR_HEX[index % QUASAR_HEX.length];
}

// ---------------------------------------------------------------------
// Player overrides
//
// The palette above is assigned by position in the region's quasar list, so
// which colours a region gets is luck. Ten entries against 6-8 signatures
// means collisions never happen, but *adjacency* does: cyan next to sky
// blue, or orange next to yellow, is hard to tell apart at blip size - and
// if those two are the ones you are cross-referencing, the instrument is
// harder to read than the puzzle warrants.
//
// Overrides live here rather than being threaded through as props on
// purpose. A signature is drawn in seven components; a prop would be
// forgotten in one of them, and a colour that changes everywhere except the
// Sweep Scope is worse than not offering the feature.

const STORAGE_KEY = "quasar-isolinear:colors";

/** regionId -> quasarId -> hex */
type ColorOverrides = Record<string, Record<string, string>>;

const EMPTY: ColorOverrides = Object.freeze({});

let cached: ColorOverrides | null = null;
const listeners = new Set<() => void>();

function read(): ColorOverrides {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ColorOverrides) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function subscribeQuasarColors(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Stable reference until an override actually changes. */
export function getQuasarColors(): ColorOverrides {
  if (typeof window === "undefined") return EMPTY;
  if (!cached) cached = read();
  return cached;
}

export function getServerQuasarColors(): ColorOverrides {
  return EMPTY;
}

/** Pass `null` to drop back to the palette default. */
export function setQuasarColor(regionId: string, quasarId: string, hex: string | null) {
  if (typeof window === "undefined") return;
  const current = getQuasarColors();
  const forRegion = { ...(current[regionId] ?? {}) };
  if (hex) forRegion[quasarId] = hex;
  else delete forRegion[quasarId];

  const next: ColorOverrides = { ...current };
  if (Object.keys(forRegion).length) next[regionId] = forRegion;
  else delete next[regionId];

  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked - the session keeps working from cache.
  }
  listeners.forEach((fn) => fn());
}

/**
 * The colour a signature should be drawn in: the player's choice if they
 * made one, otherwise its position in the palette.
 */
export function resolveQuasarColor(
  overrides: ColorOverrides,
  regionId: string,
  quasarId: string,
  index: number
): string {
  return overrides[regionId]?.[quasarId] ?? quasarColorHex(index);
}
