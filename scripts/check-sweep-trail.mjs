// Proves the sweep's wake survives the turn.
//
// Backlog 20: the trail used to vanish the instant the line reversed, because
// one element was re-anchored from whichever direction was current. There are
// now two, one per direction, and the claims below are the ones that make
// that read as a continuing wake rather than as a second sweep. They are
// checked here rather than by watching the animation, because the defect was
// one frame wide and "it looks fine" is exactly how it shipped in the first
// place.
//
// Run: node scripts/check-sweep-trail.mjs

const VISIBILITY_RANGE = 5;
const FADE_WIDTH_TICKS = 0.5;
const REF_POS = 0;
const AXIS_END = 95;
const AXIS_SPAN = AXIS_END - REF_POS;

const fadeWidth = (AXIS_SPAN / VISIBILITY_RANGE) * FADE_WIDTH_TICKS;
const sweepEnd = Math.min(AXIS_END + fadeWidth, 99);
const span = sweepEnd - REF_POS;

// Mirrors the rAF body in RelativeDistanceScope.tsx.
function frameAt(phase) {
  const cycle = Math.floor(phase);
  const t = phase - cycle;
  const sweepingRight = cycle % 2 === 0;
  const detectorPos = sweepingRight
    ? REF_POS + t * (sweepEnd - REF_POS)
    : sweepEnd - t * (sweepEnd - REF_POS);

  const growing = sweepingRight
    ? { left: REF_POS, width: detectorPos - REF_POS, opacity: 1 }
    : { left: detectorPos, width: sweepEnd - detectorPos, opacity: 1 };

  const travelled = t * span;
  const leaving =
    cycle === 0
      ? { left: 0, width: 0, opacity: 0 }
      : {
          left: sweepingRight ? REF_POS - travelled : REF_POS + travelled,
          width: span,
          opacity: 1 - t,
        };

  // Which physical element each role is using this frame.
  return {
    cycle,
    t,
    detectorPos,
    right: sweepingRight ? growing : leaving,
    left: sweepingRight ? leaving : growing,
  };
}

const ink = (band) => band.width * band.opacity;
const fail = [];
const check = (label, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` - ${detail}` : ""}`);
  if (!ok) fail.push(label);
};

// 1. The wake never disappears at a turn. This is the actual bug: sample a
//    tight window either side of every turn in the first few cycles and
//    require that visible trail is present in every single frame.
const EPS = 1e-9;
let worst = { ink: Infinity, phase: null };
for (let turn = 1; turn <= 5; turn++) {
  for (let d = -0.02; d <= 0.02 + EPS; d += 0.001) {
    const phase = turn + d;
    const f = frameAt(phase);
    const total = ink(f.right) + ink(f.left);
    if (total < worst.ink) worst = { ink: total, phase };
  }
}
check(
  "trail is present in every frame across all five turns",
  worst.ink > 1,
  `thinnest is ${worst.ink.toFixed(2)}%-of-width at phase ${worst.phase.toFixed(3)}`,
);

// 2. The handoff is seamless: the element that was growing one frame before
//    a turn is in the same place, at the same size and opacity, one frame
//    after it. A frame at 60fps on the default 6s period is dt/period ~= 0.0028
//    of a cycle, so compare across exactly that.
const FRAME = 16.7 / 6000;
for (const turn of [1, 2, 3]) {
  const before = frameAt(turn - FRAME);
  const after = frameAt(turn + FRAME);
  // Cycle N-1 sweeping right hands its trail to the right slot, and vice versa.
  const slot = (turn - 1) % 2 === 0 ? "right" : "left";
  const jump = Math.max(
    Math.abs(before[slot].left - after[slot].left),
    Math.abs(before[slot].width - after[slot].width),
    Math.abs(before[slot].opacity - after[slot].opacity) * 100,
  );
  check(
    `turn ${turn}: the ${slot} trail carries through without a jump`,
    jump < 1,
    `largest step ${jump.toFixed(3)}% across two frames`,
  );
}

// 3. It leaves at the sweep's own speed - the same distance per unit phase
//    the line itself covers. Anything else reads as a separate object.
const a = frameAt(1.2);
const b = frameAt(1.4);
const trailSpeed = Math.abs(b.right.left - a.right.left) / 0.2;
const lineSpeed = Math.abs(b.detectorPos - a.detectorPos) / 0.2;
check(
  "the leaving trail travels at the line's speed",
  Math.abs(trailSpeed - lineSpeed) < 1e-9,
  `${trailSpeed.toFixed(2)}%/cycle vs the line's ${lineSpeed.toFixed(2)}%/cycle`,
);

// 4. It is invisible by the time its element is recycled, so reuse cannot pop.
//    Note which slot is leaving when: cycle 1 sweeps left, so the trail on
//    its way out during it is the *right* one, and vice versa.
const endOfCycle1 = frameAt(2 - 1e-9); // right trail leaving
const endOfCycle2 = frameAt(3 - 1e-9); // left trail leaving
check(
  "the leaving trail has faded to nothing before it is reused",
  ink(endOfCycle1.right) < 0.01 && ink(endOfCycle2.left) < 0.01,
  `opacity ${endOfCycle1.right.opacity.toExponential(1)} (right) and ` +
    `${endOfCycle2.left.opacity.toExponential(1)} (left) at the end of their passes`,
);

// 5. And it has all but cleared the 0..100 frame by then, so the fade is not
//    the only thing hiding it. Each band is 99 wide and travels 99, so what
//    is left inside the frame is its tail: for the rightward one that is its
//    left edge, arriving at 99, and for the leftward one its right edge,
//    arriving at 0. Either way the remnant is a <=1%-wide strip of the
//    gradient's transparent end, at zero opacity.
const TOL = 1e-6;
const rightTail = endOfCycle1.right.left;
const leftTail = endOfCycle2.left.left + endOfCycle2.left.width;
check(
  "each trail reaches the edge of the frame as its pass ends",
  rightTail >= 99 - TOL && leftTail <= TOL,
  `right trail's tail at ${rightTail.toFixed(4)}% of 99, ` +
    `left trail's tail at ${leftTail.toFixed(4)}% of 0`,
);

// 6. Cycle 0 shows one trail only - there is no previous pass to leave one,
//    and picking a new reference resets phase to 0, so this is also what
//    clears the abandoned reading's wake.
const first = frameAt(0.5);
check(
  "cycle 0 draws no leaving trail",
  ink(first.left) === 0,
  `growing ${first.right.width.toFixed(1)}%, leaving ${first.left.width.toFixed(1)}%`,
);

console.log(
  fail.length ? `\n${fail.length} check(s) failed.` : "\nAll checks passed.",
);
process.exit(fail.length ? 1 : 0);
