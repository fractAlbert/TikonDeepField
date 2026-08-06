// How much *work* is left in a region, not just whether it can be solved.
//
// analyze-solvability.ts answers "is the answer unique?". That is the wrong
// question for a difficulty argument: Sudoku is fully deterministic and
// unique too, and is enjoyed precisely for the grind of getting there. What
// distinguishes a good Sudoku from a Sudoku that arrives 90% filled in is
// the number and depth of inference steps, so that is what this measures.
//
// The model is ordinary constraint propagation, which maps onto Sudoku
// solving technique directly:
//
//   - Start from what the briefing gives you (the two exact anchors).
//   - Each round, narrow every unresolved signature's candidate sectors
//     against everything currently known, and promote any that drop to a
//     single candidate.
//   - A signature resolved in round 1 is a "naked single" off the anchors.
//     One that needs round 3 required two other signatures to be pinned
//     first - a chain, and the interesting kind of step.
//   - If a round resolves nothing, propagation is stuck: what remains needs
//     a global argument (quadrant totals, mutual exclusion) rather than
//     pairwise elimination. That is the hardest tier.
//
// Usage: npx tsx scripts/measure-deduction-depth.ts [samples]

import { generateRegion } from "../src/lib/generate-region";
import { Config, solveByPropagation } from "./propagation";

const SAMPLES = Number(process.argv[2] ?? 1500);

// ---------------------------------------------------------------------

const configs: Config[] = [
  { label: "Today (no ring survey)", ringBudget: 0 },
  { label: "By type (per-ring totals, names nobody)", ringBudget: 0, ringTotals: true },
  { label: "By signature, budget of 1", ringBudget: 1 },
  { label: "Census + by signature, budget of 1", ringBudget: 1, ringTotals: true },
  { label: "By signature, budget of 2", ringBudget: 2 },
  { label: "By signature, budget of 3", ringBudget: 3 },
  { label: "By signature, unlimited", ringBudget: "all" },
  { label: "Pinpoint reveal x1", ringBudget: 0, pinpointBudget: 1 },
  { label: "Pinpoint reveal x2", ringBudget: 0, pinpointBudget: 2 },
  { label: "Census + pinpoint x1", ringBudget: 0, pinpointBudget: 1, ringTotals: true },
];

console.log(`Propagation depth over ${SAMPLES} regions per configuration.\n`);

for (const cfg of configs) {
  let fullySolved = 0;
  let totalRounds = 0;
  let totalElim = 0;
  let totalUnknowns = 0;
  let stuckTotal = 0;
  const roundHistogram = new Map<number, number>();
  // How many signatures fell out at each depth, pooled across regions.
  const depthCounts = new Map<number, number>();

  for (let i = 0; i < SAMPLES; i++) {
    const region = generateRegion();
    const r = solveByPropagation(region, cfg);
    totalUnknowns += r.unknowns;
    totalElim += r.eliminations;
    stuckTotal += r.stuck;
    if (r.stuck === 0) {
      fullySolved++;
      totalRounds += r.rounds;
      roundHistogram.set(r.rounds, (roundHistogram.get(r.rounds) ?? 0) + 1);
    }
    r.perRound.forEach((count, depth) => {
      depthCounts.set(depth + 1, (depthCounts.get(depth + 1) ?? 0) + count);
    });
  }

  const solvedPct = (fullySolved / SAMPLES) * 100;
  console.log(`${cfg.label}`);
  console.log(
    `  Fully resolved by propagation alone: ${solvedPct.toFixed(1)}%  ` +
      `(the rest need a global argument or are ambiguous)`
  );
  console.log(
    `  Mean rounds when it does resolve:    ${(totalRounds / Math.max(1, fullySolved)).toFixed(2)}`
  );
  console.log(
    `  Rounds distribution:                 ${[...roundHistogram.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([k, v]) => `${k}:${((v / fullySolved) * 100).toFixed(0)}%`)
      .join("  ")}`
  );
  console.log(
    `  Signatures resolved at each depth:   ${[...depthCounts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([k, v]) => `r${k}:${((v / totalUnknowns) * 100).toFixed(0)}%`)
      .join("  ")}`
  );
  console.log(
    `  Mean candidate eliminations/region:  ${(totalElim / SAMPLES).toFixed(0)}`
  );
  console.log(
    `  Mean signatures left stuck:          ${(stuckTotal / SAMPLES).toFixed(2)} ` +
      `of ${(totalUnknowns / SAMPLES).toFixed(1)} unknown\n`
  );
}
