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

export function quasarColorHex(index: number): string {
  return QUASAR_HEX[index % QUASAR_HEX.length];
}
