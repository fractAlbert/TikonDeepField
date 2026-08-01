// Why are some regions unsolvable? Produces concrete counterexamples.
//
// analyze-solvability.ts reports a rate. This one shows the actual
// alternative assignment a player could not rule out, re-verifies it from
// scratch against every channel (rather than trusting the search that
// produced it), and classifies WHY it survives.
//
// Usage: npx tsx scripts/explain-ambiguity.ts [samples]

import { buildSectors, orthogonalDistanceSigned, quadrantOf, sectorId } from "../src/lib/grid";
import { generateRegion } from "../src/lib/generate-region";
import { Quadrant, Region, Sector } from "../src/lib/puzzle-types";

const SAMPLES = Number(process.argv[2] ?? 400);
const VISIBILITY_RANGE = 5;
const OUT_OF_RANGE = 99;
const SEGMENT_COUNT = 8;
const QUADRANTS: Quadrant[] = ["I", "II", "III", "IV"];

const sectors = buildSectors();
const sectorLookup = new Map(sectors.map((s) => [s.id, s]));

const observed = (a: Sector, b: Sector) => {
  const d = Math.abs(orthogonalDistanceSigned(a, b));
  return d <= VISIBILITY_RANGE ? d : OUT_OF_RANGE;
};

type Assignment = Map<string, Sector>;

function allConsistent(region: Region, cap = 5): Assignment[] {
  const names = Object.keys(region.solution);
  const truth: Assignment = new Map(
    names.map((n) => [n, sectorLookup.get(region.solution[n].sector)!])
  );

  const fixed = new Map<string, string>();
  const quadClue = new Map<string, Quadrant>();
  for (const c of region.clues) {
    if (c.negate) continue;
    if (c.kind === "quasar-sector") fixed.set(c.quasar, c.sector);
    if (c.kind === "quasar-quadrant") quadClue.set(c.quasar, c.quadrant);
  }

  const trueQuadTotals = [0, 0, 0, 0];
  for (const n of names) trueQuadTotals[QUADRANTS.indexOf(quadrantOf(truth.get(n)!))]++;

  const order = [...names].sort((a, b) => (fixed.has(b) ? 1 : 0) - (fixed.has(a) ? 1 : 0));
  const out: Assignment[] = [];
  const assigned: Assignment = new Map();
  const used = new Set<string>();

  function recurse(i: number) {
    if (out.length >= cap) return;
    if (i === order.length) {
      const totals = [0, 0, 0, 0];
      for (const s of assigned.values()) totals[QUADRANTS.indexOf(quadrantOf(s))]++;
      if (totals.some((t, k) => t !== trueQuadTotals[k])) return;
      out.push(new Map(assigned));
      return;
    }
    const name = order[i];
    const cands = fixed.has(name) ? [sectorLookup.get(fixed.get(name)!)!] : sectors;
    for (const cand of cands) {
      if (used.has(cand.id)) continue;
      if (quadClue.has(name) && quadrantOf(cand) !== quadClue.get(name)) continue;
      let ok = true;
      for (const [other, os] of assigned) {
        if (observed(cand, os) !== observed(truth.get(name)!, truth.get(other)!)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      assigned.set(name, cand);
      used.add(cand.id);
      recurse(i + 1);
      assigned.delete(name);
      used.delete(cand.id);
      if (out.length >= cap) return;
    }
  }
  recurse(0);
  return out;
}

/**
 * Independent re-verification. Deliberately does NOT reuse the search's
 * bookkeeping - it recomputes every observation from the candidate
 * assignment and compares against the truth, so a bug in the search cannot
 * launder a bad alternative through.
 */
function reverify(region: Region, alt: Assignment): { ok: boolean; why: string[] } {
  const names = Object.keys(region.solution);
  const truth: Assignment = new Map(
    names.map((n) => [n, sectorLookup.get(region.solution[n].sector)!])
  );
  const problems: string[] = [];

  if (new Set([...alt.values()].map((s) => s.id)).size !== names.length)
    problems.push("not a bijection");

  for (const c of region.clues) {
    if (c.negate) continue;
    if (c.kind === "quasar-sector" && alt.get(c.quasar)!.id !== c.sector)
      problems.push(`anchor ${c.quasar} moved`);
    if (c.kind === "quasar-quadrant" && quadrantOf(alt.get(c.quasar)!) !== c.quadrant)
      problems.push(`quadrant clue ${c.quasar} violated`);
  }

  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i], b = names[j];
      const o1 = observed(alt.get(a)!, alt.get(b)!);
      const o2 = observed(truth.get(a)!, truth.get(b)!);
      if (o1 !== o2) problems.push(`sweep ${a}-${b}: ${o1} vs ${o2}`);
    }

  const t1 = [0, 0, 0, 0], t2 = [0, 0, 0, 0];
  for (const n of names) {
    t1[QUADRANTS.indexOf(quadrantOf(alt.get(n)!))]++;
    t2[QUADRANTS.indexOf(quadrantOf(truth.get(n)!))]++;
  }
  if (t1.some((v, k) => v !== t2[k])) problems.push(`quadrant totals ${t1} vs ${t2}`);

  return { ok: problems.length === 0, why: problems };
}

/** Is `alt` the mirror image of the truth about some reflection axis? */
function mirrorAxis(region: Region, alt: Assignment): number | null {
  const names = Object.keys(region.solution);
  for (let k = 0; k < SEGMENT_COUNT; k++) {
    const matches = names.every((n) => {
      const t = sectorLookup.get(region.solution[n].sector)!;
      const reflected = sectorId(t.ring, ((k - t.seg) % SEGMENT_COUNT + SEGMENT_COUNT) % SEGMENT_COUNT);
      return alt.get(n)!.id === reflected;
    });
    if (matches) return k;
  }
  return null;
}

// ---------------------------------------------------------------------

let ambiguous = 0, checked = 0, mirrors = 0, reverifyFailures = 0, diagonal = 0;
const movedCounts = new Map<number, number>();
let shown = 0;
const altCounts = new Map<number, number>();

for (let i = 0; i < SAMPLES; i++) {
  const region = generateRegion();
  const sols = allConsistent(region);
  checked++;
  if (sols.length <= 1) continue;
  ambiguous++;
  altCounts.set(sols.length, (altCounts.get(sols.length) ?? 0) + 1);

  const names = Object.keys(region.solution);
  const truthId = (n: string) => region.solution[n].sector;
  const alt = sols.find((s) => names.some((n) => s.get(n)!.id !== truthId(n)))!;

  const check = reverify(region, alt);
  if (!check.ok) {
    reverifyFailures++;
    console.log(`!! RE-VERIFY FAILED: ${check.why.join(", ")}`);
    continue;
  }
  const axis = mirrorAxis(region, alt);
  if (axis !== null) mirrors++;

  const moved = names.filter((n) => alt.get(n)!.id !== truthId(n));
  movedCounts.set(moved.length, (movedCounts.get(moved.length) ?? 0) + 1);
  // Is every displaced signature a one-step diagonal (1 ring + 1 segment)?
  // That is the signature of L1/Manhattan degeneracy rather than a global
  // symmetry: the two moves cancel for any reference lying the right way.
  const allDiagonal = moved.every((n) => {
    const t = sectorLookup.get(truthId(n))!;
    const a = alt.get(n)!;
    const dSeg = Math.min(
      Math.abs(a.seg - t.seg),
      SEGMENT_COUNT - Math.abs(a.seg - t.seg)
    );
    return Math.abs(a.ring - t.ring) === 1 && dSeg === 1;
  });
  if (allDiagonal) diagonal++;

  if (shown < 2) {
    shown++;
    const anchors = region.clues.filter((c) => c.kind === "quasar-sector");
    const anchorSecs = anchors.map((c) =>
      sectorLookup.get(region.solution[(c as { quasar: string }).quasar].sector)!
    );
    console.log(`\n=== Worked example ${shown} — ${region.name} (${names.length} signatures) ===`);
    console.log(`Anchors: ${anchors.map((c) => (c as { quasar: string }).quasar).join(", ")} ` +
      `at ${anchorSecs.map((s) => s.id).join(" and ")}, ` +
      `separation ${Math.abs(orthogonalDistanceSigned(anchorSecs[0], anchorSecs[1]))}` +
      `${anchorSecs[0].seg === anchorSecs[1].seg ? "  (SAME SEGMENT)" : ""}`);
    for (const c of region.clues.filter((x) => x.kind === "quasar-quadrant"))
      console.log(`Quadrant clue: ${(c as { quasar: string }).quasar} in ${(c as { quadrant: string }).quadrant}`);
    console.log(`\n  ${"signature".padEnd(12)} ${"true".padEnd(6)} ${"alternative".padEnd(12)}`);
    for (const n of names) {
      const t = truthId(n), a = alt.get(n)!.id;
      console.log(`  ${n.padEnd(12)} ${t.padEnd(6)} ${a.padEnd(12)} ${t === a ? "" : "<- differs"}`);
    }
    console.log(`\n  Total consistent assignments found (cap 5): ${sols.length}`);
    console.log(`  Re-verified independently: every sweep reading, both anchors,`);
    console.log(`  both quadrant clues and all quadrant totals identical.`);
    console.log(`  Mirror image about a reflection axis: ${axis !== null ? `yes (k=${axis})` : "no"}`);
  }
}

console.log(`\n\n--- Summary over ${checked} regions ---`);
console.log(`Ambiguous:              ${ambiguous} (${((ambiguous / checked) * 100).toFixed(1)}%)`);
console.log(`Re-verify failures:     ${reverifyFailures}  (must be 0)`);
console.log(`Explained by mirroring: ${mirrors} of ${ambiguous} ` +
  `(${ambiguous ? ((mirrors / ambiguous) * 100).toFixed(1) : "0"}%)`);
console.log(`Alternative counts:     ${[...altCounts.entries()].sort((a, b) => a[0] - b[0])
  .map(([k, v]) => `${k === 5 ? "5+" : k} solutions: ${v}`).join(", ")}`);
console.log(`Pure 1-step diagonals:  ${diagonal} of ${ambiguous} ` +
  `(${ambiguous ? ((diagonal / ambiguous) * 100).toFixed(1) : "0"}%)`);
console.log(`Signatures displaced:   ${[...movedCounts.entries()].sort((a, b) => a[0] - b[0])
  .map(([k, v]) => `${k}: ${v}`).join(", ")}`);
