import { Region } from "@/lib/puzzle-types";

export const region2: Region = {
  id: "region-02-bruma-drift",
  name: "Bruma Drift",
  briefing:
    "A dense debris field is interfering with fine resolution. 6 quasar signatures logged. Bearings only, science officer - triangulate carefully.",
  quasarTypes: ["Ancient Relic", "Binary-Class", "Pulsar-Class", "Redshift Anomaly"],
  quasars: [
    { id: "PKS 753", designation: "PKS 753" },
    { id: "4C 5.35", designation: "4C 5.35" },
    { id: "PKS 364", designation: "PKS 364" },
    { id: "HE 568", designation: "HE 568" },
    { id: "Q3170", designation: "Q3170" },
    { id: "Mrk 309", designation: "Mrk 309" },
  ],
  solution: {
    "PKS 753": { type: "Redshift Anomaly", sector: "R5S5" },
    "4C 5.35": { type: "Pulsar-Class", sector: "R5S7" },
    "PKS 364": { type: "Ancient Relic", sector: "R1S1" },
    "HE 568": { type: "Redshift Anomaly", sector: "R2S1" },
    Q3170: { type: "Redshift Anomaly", sector: "R1S2" },
    "Mrk 309": { type: "Binary-Class", sector: "R5S2" },
  },
  clues: [
    { kind: "quasar-sector", quasar: "PKS 753", sector: "R5S5" },
    { kind: "quasar-sector", quasar: "Mrk 309", sector: "R5S2" },
    { kind: "quasar-quadrant", quasar: "PKS 364", quadrant: "I" },
    { kind: "quasar-quadrant", quasar: "Q3170", quadrant: "I" },
  ],
};
