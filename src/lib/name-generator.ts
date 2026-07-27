// Catalog-style quasar designations, modeled loosely on real astronomical
// naming conventions (3C 273, PKS 2126-158, Markarian 231, Ton 618, ...)
// so generated signatures read as authentic survey entries.

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

const GENERATORS: (() => string)[] = [
  () => `3C ${randomInt(10, 999)}`,
  () => `4C ${randomInt(1, 89)}.${String(randomInt(0, 99)).padStart(2, "0")}`,
  () => `PKS ${randomInt(100, 2359)}`,
  () => `PG ${randomInt(1000, 2359)}`,
  () => `CTA ${randomInt(10, 199)}`,
  () => `OJ ${randomInt(100, 999)}`,
  () => `HE ${randomInt(100, 2359)}`,
  () => `Ton ${randomInt(10, 999)}`,
  () => `Mrk ${randomInt(1, 999)}`,
  () => `APM ${randomInt(1000, 9999)}`,
  () => `RX J${randomInt(1000, 2359)}`,
  () => `SDSS ${randomInt(1000, 9999)}`,
  () => `Q${randomInt(1000, 9999)}`,
];

function randomDesignation(): string {
  return GENERATORS[randomInt(0, GENERATORS.length - 1)]();
}

/** `count` unique catalog-style designations. */
export function generateQuasarNames(count: number): string[] {
  const names = new Set<string>();
  let guard = 0;
  while (names.size < count && guard < 2000) {
    names.add(randomDesignation());
    guard++;
  }
  return [...names];
}
