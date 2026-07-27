// Templated random flavor text for generated regions. These are deep-space
// quasar fields, not star systems, so descriptions stay in sensor/field
// terms - no planets, no orbital mechanics.

const NAME_ADJECTIVES = [
  "Thanix",
  "Veridian",
  "Kessik",
  "Ashen",
  "Umbral",
  "Pallid",
  "Coral",
  "Ferrous",
  "Glacial",
  "Ember",
  "Hollow",
  "Silt",
  "Wraith",
  "Bruma",
  "Nocturne",
  "Cinder",
  "Fallow",
  "Brindle",
];

const NAME_NOUNS = [
  "Drift",
  "Expanse",
  "Nebula",
  "Reach",
  "Rift",
  "Basin",
  "Corridor",
  "Shoal",
  "Field",
  "Void",
  "Trench",
  "Span",
  "Fringe",
  "Gulf",
  "Verge",
  "Hollow",
];

const CONDITIONS = [
  "Ion storms have scattered the sensor buoys across this field.",
  "Background radiation readings are unusually high here.",
  "Long-range sensors report a quiet, stable field.",
  "Gravitational lensing is distorting portions of the scan.",
  "A dense debris field is interfering with fine resolution.",
  "Solar wind from a nearby remnant is degrading signal clarity.",
  "Sensor drift has been minimal — a clean read on this one.",
  "Interference from a distant pulsar is clipping the outer rings.",
  "Telemetry has been intermittent since the last relay handoff.",
  "Outpost sensors are running at full resolution for this pass.",
];

const TASKS = [
  "Cross-reference the sensor log against the field grid to complete the survey.",
  "Bearings only, science officer — triangulate carefully.",
  "Use relative bearings between signatures to complete the classification.",
  "Standard classification protocol applies — work the bearings systematically.",
  "Command wants a full classification before the next transit window.",
  "Take your time on this one; accuracy matters more than speed.",
  "File a full census once classification is complete.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRegionName(): string {
  return `${pick(NAME_ADJECTIVES)} ${pick(NAME_NOUNS)}`;
}

export function generateBriefing(quasarCount: number): string {
  return `${pick(CONDITIONS)} ${quasarCount} quasar signatures logged. ${pick(TASKS)}`;
}
