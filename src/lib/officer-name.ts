// Names for the officer sitting at the console. Deliberately a wide mix of
// origins - Tikon draws long rotations from everywhere, and a crew roster
// that all reads from one language would say something about the setting
// that isn't true. Not all of them are human, for the same reason.
//
// Sibling of `name-generator.ts`, which does the same job for quasar
// designations. Kept separate because the two never share a list and the
// rules are nothing alike.
//
// Also kept clear of the charter names in `region-name.ts`, which are the
// people fields are named after. There are more than enough names to go
// around, and an overlap would quietly imply the officer at the console had
// charted the region they were being handed.

const GIVEN_NAMES = [
  "Adaeze", "Alandra", "Anneke", "Arun", "Beatriz", "Bexley", "Cai", "Calla",
  "Chike", "Dabir", "Dara", "Eilidh", "Elian", "Esen", "Farrah", "Fenwick",
  "Gemma", "Halvard", "Hana", "Idris", "Imani", "Ines", "Isak", "Jian",
  "Juno", "Kaveh", "Keiko", "Kwame", "Lachlan", "Lior", "Lucia", "Maeve",
  "Marek", "Mira", "Nadia", "Nikolai", "Noor", "Odalys", "Oleander", "Ottilie",
  "Priya", "Quill", "Rafael", "Rasha", "Rhiannon", "Rune", "Sable", "Sanjay",
  "Saoirse", "Selin", "Solveig", "Tam", "Tarquin", "Thandiwe", "Tobias",
  "Ume", "Valko", "Vesna", "Wren", "Xiulan", "Yara", "Yosef", "Zephyr", "Zuri",
  "Aszel", "Ka'el", "Oreth", "Sivaan", "Tessik", "Vaun", "Emeth", "Ilvani",
];

const SURNAMES = [
  "Abara", "Ashgrove", "Bakhtiari", "Beaumont", "Carrow", "Castellan", "Damari",
  "Dunlevy", "Eskildsen", "Fairweather", "Ferreira", "Gallardo", "Halloway",
  "Hearne", "Ibori", "Ishikawa", "Jarosz", "Kalu", "Kettering", "Khoury",
  "Lindqvist", "Loveridge", "Maalouf", "Marchetti", "Mbeki", "Nakamura",
  "Nightingale", "Okonkwo", "Ostrowski", "Pell", "Quintero", "Rasmussen",
  "Ravenna", "Saito", "Selvaraj", "Silvermoor", "Sorenson", "Tavares",
  "Thornbury", "Ualtar", "Vandermeer", "Vasquez", "Voronin", "Whitlock",
  "Wycliffe", "Xander", "Yelverton", "Zabala", "Zheng",
  "Ossiran", "Trellum", "Vekk", "Ashenvar", "Ozhek", "Nuur-Sel", "Sekaya",
];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** A given name and a surname, e.g. "Solveig Nakamura". */
export function randomOfficerName(): string {
  return `${pick(GIVEN_NAMES)} ${pick(SURNAMES)}`;
}

/**
 * Personnel file reference. Purely flavour - nothing keys off it - but it
 * makes the profile read as a station record rather than a settings page,
 * and unlike the name it never changes, so it stays a stable handle on the
 * career even after a rename.
 */
export function randomServiceNumber(): string {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ"; // no I/O/Q, which misread as 1/0
  const prefix = pick([...letters]) + pick([...letters]);
  const digits = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `${prefix}-${digits}`;
}
