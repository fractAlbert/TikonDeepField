// PreToolUse / Bash.
//
// Blocks `git commit -m` when the message contains something the shell will
// expand before git ever sees it.
//
// Why this exists: on 2026-08-07 a commit shipped with five identifiers
// missing from its message. Inside double quotes bash performs command
// substitution, so `` `gap-3` `` ran `gap-3` as a command and the message got
// its (empty) output. Git received prose with holes in it, which is why no
// `commit-msg` hook could have caught it - the text was gone upstream of git.
//
// A note saying "always use -F" already existed and was not followed. This is
// the same rule with teeth.

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);

let input = {};
try {
  input = JSON.parse(Buffer.concat(chunks).toString() || "{}");
} catch {
  process.exit(0); // Never block on a payload we cannot read.
}

const cmd = input?.tool_input?.command ?? "";

// The safe forms are safe whatever they contain, and they must be exempted
// *first*. Found the hard way about ninety seconds after this hook went live:
// it blocked a correct `git commit -F - <<'MSG'` whose body happened to
// mention `-m` and backticks while explaining this very rule. The command
// string handed to the hook includes the heredoc body, so pattern-matching
// the whole thing reads the message as if it were the flags.
const usesMessageFile = /(^|\s)(-F\b|--file\b)/.test(cmd);
const usesQuotedHeredoc = /<<-?\s*(['"])[A-Za-z_][A-Za-z0-9_]*\1/.test(cmd);
if (usesMessageFile || usesQuotedHeredoc) process.exit(0);

// Only the first line can carry flags; anything after a newline is body text
// of some other construct and must not be scanned for them.
const firstLine = cmd.split("\n")[0];

const isCommit = /\bgit\s+commit\b/.test(firstLine);
const usesInlineMessage = /(^|\s)(-[A-Za-z]*m\b|--message\b)/.test(firstLine);

// Backticks and $(...) execute; ${...} and $WORD substitute. All four silently
// rewrite the message. A bare `$` followed by a digit or space is left alone -
// it expands too, but it is rare and the false-positive cost is worse.
const EXPANSIONS = [
  { pattern: /`/, name: "a backtick" },
  { pattern: /\$\(/, name: "$(" },
  { pattern: /\$\{/, name: "${" },
  { pattern: /\$[A-Za-z_]/, name: "$VARIABLE" },
];
const found = EXPANSIONS.filter((e) => e.pattern.test(firstLine)).map((e) => e.name);

if (isCommit && usesInlineMessage && found.length > 0) {
  const reason = [
    `This commit message contains ${found.join(", ")}, which bash expands`,
    `inside double quotes - the text is rewritten before git sees it, and the`,
    `result is a message with holes in it that no later check can detect.`,
    ``,
    `Use a quoted heredoc instead, which disables all expansion:`,
    ``,
    `    git commit -F - <<'MSG'`,
    `    Subject line`,
    ``,
    `    Body with \`backticks\`, $vars and "quotes" all literal.`,
    `    MSG`,
    ``,
    `If the message genuinely has none of these and this is a false positive`,
    `(single-quoted, say), the heredoc is still the better form - use it.`,
  ].join("\n");

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    })
  );
}

process.exit(0);
