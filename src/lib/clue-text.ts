import { Clue } from "./puzzle-types";

const RADIAL_WORDS: Record<string, string> = {
  inward: "inward of",
  outward: "outward of",
};

const ANGULAR_WORDS: Record<string, string> = {
  clockwise: "clockwise of",
  counterclockwise: "counterclockwise of",
};

/** Renders a structured Clue into LCARS-style briefing text. */
export function clueText(clue: Clue): string {
  const not = clue.negate ? "NOT " : "";

  switch (clue.kind) {
    case "quasar-type":
      return `Sensor signature ${clue.quasar} is ${not}classified ${clue.type}.`;

    case "quasar-sector":
      return `Sensor signature ${clue.quasar} is ${not}located at sector ${clue.sector}.`;

    case "type-sector":
      return `The ${clue.type} signature is ${not}located at sector ${clue.sector}.`;

    case "type-ring":
      return `The ${clue.type} signature is ${not}in ring ${clue.ring + 1} from center.`;

    case "type-segment":
      return `The ${clue.type} signature is ${not}on bearing segment ${clue.segment + 1}.`;

    case "quasar-quadrant":
      return `Sensor signature ${clue.quasar} is ${not}in Quadrant ${clue.quadrant}.`;

    case "type-quadrant":
      return `The ${clue.type} signature is ${not}in Quadrant ${clue.quadrant}.`;

    case "type-adjacent-type":
      return `The ${clue.typeA} signature is ${not}adjacent to the ${clue.typeB} signature.`;

    case "quasar-adjacent-quasar":
      return `${clue.quasarA} is ${not}adjacent to ${clue.quasarB}.`;

    case "type-same-ring-type":
      return `The ${clue.typeA} signature is ${not}the same distance from center as the ${clue.typeB} signature.`;

    case "type-same-segment-type":
      return `The ${clue.typeA} signature is ${not}on the same bearing as the ${clue.typeB} signature.`;

    case "type-radial":
      return `The ${clue.typeA} signature is ${not}${RADIAL_WORDS[clue.direction]} the ${clue.typeB} signature.`;

    case "type-angular":
      return `The ${clue.typeA} signature is ${not}${ANGULAR_WORDS[clue.direction]} the ${clue.typeB} signature.`;

    case "quasar-same-ring":
      return `${clue.quasarA} is ${not}the same distance from center as ${clue.quasarB}.`;

    case "quasar-same-segment":
      return `${clue.quasarA} is ${not}on the same bearing as ${clue.quasarB}.`;

    case "quasar-radial":
      return `${clue.quasarA} is ${not}${RADIAL_WORDS[clue.direction]} ${clue.quasarB}.`;

    case "quasar-angular":
      return `${clue.quasarA} is ${not}${ANGULAR_WORDS[clue.direction]} ${clue.quasarB}.`;
  }
}
