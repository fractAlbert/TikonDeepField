// Replicates both versions of the sweep clock and drags the period slider
// mid-pass, to see what the line does at the moment of the change.
const REF_POS = 0, AXIS_END = 95, VISIBILITY_RANGE = 5, FADE = 0.5;
const fadeWidth = (AXIS_END / VISIBILITY_RANGE) * FADE;
const sweepEnd = Math.min(AXIS_END + fadeWidth, 99);

const posFor = (cycle, t) =>
  cycle % 2 === 0 ? REF_POS + t * (sweepEnd - REF_POS) : sweepEnd - t * (sweepEnd - REF_POS);

// --- old: position derived from total elapsed / current period ---
function oldWay(elapsed, period) {
  const cycle = Math.floor(elapsed / period);
  const t = elapsed / period - cycle;
  return { cycle, pos: posFor(cycle, t) };
}

// --- new: phase carried forward, advanced by dt / period each frame ---
function newRun(steps) {
  let phase = 0;
  for (const { dt, period } of steps) phase += dt / period;
  const cycle = Math.floor(phase);
  return { cycle, pos: posFor(cycle, phase - cycle) };
}

const FRAME = 1000 / 60;
const before = 20000;       // 20s of sweeping at 6s per pass
const slow = 14000, fast = 2500, start = 6000;

for (const [name, next] of [["slower (6.0s -> 14.0s)", slow], ["faster (6.0s -> 2.5s)", fast]]) {
  const o1 = oldWay(before, start);
  const o2 = oldWay(before, next);
  const stepsBefore = Array.from({ length: Math.round(before / FRAME) }, () => ({ dt: FRAME, period: start }));
  const n1 = newRun(stepsBefore);
  const n2 = newRun([...stepsBefore, { dt: FRAME, period: next }]);
  console.log(`\n${name}`);
  console.log(`  old: pos ${o1.pos.toFixed(1)}% (cycle ${o1.cycle})  ->  ${o2.pos.toFixed(1)}% (cycle ${o2.cycle})   JUMP ${Math.abs(o2.pos - o1.pos).toFixed(1)}%`);
  console.log(`  new: pos ${n1.pos.toFixed(1)}% (cycle ${n1.cycle})  ->  ${n2.pos.toFixed(1)}% (cycle ${n2.cycle})   move ${Math.abs(n2.pos - n1.pos).toFixed(2)}%`);
}

// And confirm the rate really did change afterwards: one second of frames.
const stepsBefore = Array.from({ length: Math.round(before / FRAME) }, () => ({ dt: FRAME, period: start }));
const oneSec = (period) => {
  const a = newRun(stepsBefore);
  const b = newRun([...stepsBefore, ...Array.from({ length: 60 }, () => ({ dt: FRAME, period }))]);
  return Math.abs(b.pos - a.pos);
};
console.log(`\nrate after the change, over 1s of frames:`);
console.log(`  at 6.0s period: ${oneSec(start).toFixed(1)}% of the axis`);
console.log(`  at 14.0s      : ${oneSec(slow).toFixed(1)}%   (slower)`);
console.log(`  at 2.5s       : ${oneSec(fast).toFixed(1)}%   (faster)`);
