/**
 * PreToolUse hook: reject `git commit` whose message contains CJK characters.
 *
 * Repo rule: code, comments and commit messages are English; explanations to the
 * user belong in the chat reply. This is the mechanical backstop for that rule.
 *
 * Reads the hook payload on stdin, prints a deny decision on stdout when the
 * command carries CJK, and stays silent (exit 0) otherwise.
 */

// Hiragana/Katakana, CJK ext-A, CJK unified, Hangul, halfwidth katakana.
const CJK = /[぀-ヿ㐀-䶿一-鿿가-힯ｦ-ﾟ]/;

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  let command = "";
  try {
    command = (JSON.parse(raw).tool_input || {}).command || "";
  } catch {
    return; // Unparseable payload: let the tool call through untouched.
  }

  if (!/\bgit\s+commit\b/.test(command) || !CJK.test(command)) return;

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          "Commit message contains CJK characters. This repo requires English " +
          "commit messages (title and body). Rewrite the message in English and " +
          "explain the change to the user in the chat reply instead.",
      },
    })
  );
});
