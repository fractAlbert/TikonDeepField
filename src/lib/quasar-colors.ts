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

/** The palette itself, for the recolour picker in the Star Manifest. */
export const QUASAR_PALETTE: readonly string[] = QUASAR_HEX;

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
