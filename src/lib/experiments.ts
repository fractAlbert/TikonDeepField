"use client";

import { useEffect, useState } from "react";

/**
 * The gate for experimental instruments - things built to be *tried*, which
 * must never reach a deployed build.
 *
 * The user's requirement, 2026-08-11: *"Flag them as test items that won't
 * make it to deployment. They should only work on localhost."*
 *
 * ## Two gates, and the reason for each
 *
 * `process.env.NODE_ENV !== "production"` is the one that actually removes
 * the code. Next inlines it at build time, so in a production bundle the
 * whole branch is a constant `false` and the experimental panels are
 * dead-code eliminated - not shipped-and-hidden, *absent*.
 *
 * The hostname allowlist exists only so that `next build && next start` on
 * this machine still shows them, which is how you check an experiment
 * survives a production build. It is deliberately an allowlist of loopback
 * names rather than a "not my domain" test, because a blocklist fails open
 * and this one has to fail closed.
 *
 * The cost of the second gate is honest and worth stating: with it, the code
 * *is* present in a deployed bundle, just unreachable. If you want the
 * stronger guarantee - bytes physically absent from what you deploy - delete
 * the hostname clause and the `NODE_ENV` check alone eliminates it.
 *
 * ## Why a hook rather than a constant
 *
 * `location` does not exist while the server renders, so a bare constant
 * would be one value on the server and another in the browser, and React
 * would flag the mismatch and discard the first paint. This is the same trap
 * the mobile breakpoint hit - see `use-media-query.ts`. So the hook returns
 * `false` until it has mounted, and an experimental panel simply appears a
 * frame late, which for a thing that only exists on a developer's machine
 * costs nothing.
 */
/**
 * Safe to call anywhere, including on the server.
 *
 * **A hostname allowlist was tried here first and removed**, and the reason
 * is worth keeping. Written as `NODE_ENV !== "production" || isLoopback(...)`
 * the expression is no longer a compile-time constant, so nothing is
 * eliminated - and grepping the production chunks for "Test Bench" found it,
 * shipped and merely hidden. That is not what "won't make it to deployment"
 * means. The `next build && next start` convenience it bought was not worth
 * the guarantee it cost.
 */
export function experimentsAvailable(): boolean {
  return process.env.NODE_ENV !== "production";
}

/**
 * Whether experimental instruments should render.
 *
 * False on the server and on the first client paint, then settles to the
 * real answer - so nothing here can cause a hydration mismatch.
 */
export function useExperiments(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(experimentsAvailable());
  }, []);
  return enabled;
}

/**
 * How far the Sweep Scope can see, in orthogonal steps.
 *
 * Hoisted here 2026-08-11 because it was written out as a bare `5` in twelve
 * files, each carrying a comment saying it must match the others. That is
 * fine while nobody changes it and a bug factory the moment somebody does -
 * and the user wants to try 4 as part of the constellation experiment, which
 * is exactly that moment.
 *
 * **Changing this invalidates every measured solvability figure**, because
 * the pairwise distance matrix is the game's largest information channel.
 * `docs/region-difficulty.md` and `docs/win-conditions.md` both quote rates
 * measured at 5. Re-run `scripts/analyze-solvability.ts` before believing
 * any of them at another value.
 */
export const VISIBILITY_RANGE = readSweepRange();

/**
 * 5 unless `SWEEP_RANGE` says otherwise, which only the analysis scripts do.
 *
 * An env override rather than a second constant, so a measurement runs the
 * *real* `solvability.ts` at the candidate value instead of a script's copy
 * of it. A reimplementation would be measuring the reimplementation - and
 * this project already has one lesson about a constant that lived in twelve
 * places disagreeing with itself.
 *
 * Browser bundles never see it: Next only inlines `NEXT_PUBLIC_`-prefixed
 * vars into client code, so this reads undefined there and falls back to 5.
 * Anything but a number in 1..8 falls back too - an out-of-range sweep would
 * silently rewrite what every instrument reports.
 */
function readSweepRange(): number {
  const raw = typeof process !== "undefined" ? process.env?.SWEEP_RANGE : undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 8 ? n : 5;
}

/**
 * The reduced range the constellation experiment is meant to be tried
 * against. Not wired to anything yet - the experiment has to exist before
 * narrowing the scope to compensate for it makes sense, and narrowing it
 * first would just make the game harder.
 */
export const EXPERIMENTAL_VISIBILITY_RANGE = 4;
