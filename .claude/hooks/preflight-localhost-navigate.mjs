// PreToolUse / mcp__claude-in-chrome__navigate.
//
// Two jobs, both aimed at the same waste: browser checks that fail one
// precondition at a time, costing the user a message per failure.
//
// 1. If the target is localhost and nothing is listening, deny with the
//    actual diagnosis. A dead dev server does NOT present as "connection
//    refused" once you are scripting the page - it presents as
//    `SecurityError: Access is denied for this document` on localStorage,
//    because the tab is sitting on chrome-error://chromewebdata/. That reads
//    like a permissions problem and is not one; it cost two round trips to
//    work out on 2026-08-07.
//
// 2. If it is reachable, remind that being *open* is not being *painted*.
//    A background tab throttles rAF and returns stale screenshots, so any
//    measurement taken from one is fiction.

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);

let input = {};
try {
  input = JSON.parse(Buffer.concat(chunks).toString() || "{}");
} catch {
  process.exit(0);
}

const url = String(input?.tool_input?.url ?? "");
if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(url)) {
  process.exit(0); // Not ours to police.
}

let reachable = false;
try {
  await fetch(url, { signal: AbortSignal.timeout(3000), redirect: "manual" });
  reachable = true;
} catch {
  reachable = false;
}

if (!reachable) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: [
          `Nothing is listening on ${url}, so this navigation lands on`,
          `chrome-error://chromewebdata/ rather than the app.`,
          ``,
          `That failure is worth recognising because it does not look like`,
          `itself: the next javascript_tool call will throw`,
          `"SecurityError: Access is denied for this document" on`,
          `localStorage, which reads as a permissions or extension fault.`,
          `It is neither - it is an error page with an opaque origin.`,
          ``,
          `Start the dev server first (npm run dev, backgrounded), wait for`,
          `it to answer, then navigate.`,
        ].join("\n"),
      },
    })
  );
  process.exit(0);
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: [
        "Server is up. Before measuring or screenshotting, confirm the tab is",
        "actually being painted - open is not the same as painted:",
        "",
        "  document.visibilityState === 'visible'   // not 'hidden'",
        "  await new Promise(r => { const t = setTimeout(() => r(false), 400);",
        "    requestAnimationFrame(() => { clearTimeout(t); r(true); }); })",
        "",
        "A background tab throttles rAF and returns stale screenshots, so an",
        "animation looks frozen and measurements are fiction. If it fails, ask",
        "the user to switch to the tab - there is no tool that foregrounds one.",
        "Do NOT gate on document.hasFocus(): a tab foregrounded on a second",
        "monitor reports hasFocus false and is perfectly measurable.",
      ].join("\n"),
    },
  })
);
process.exit(0);
