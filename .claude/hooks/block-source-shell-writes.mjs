// PreToolUse hook: refuses shell commands that write project source (heredocs, redirects, `sed -i`, `node -e`),
// so source changes go through the Write and Edit tools, where quoting and `\n` survive intact.

let input = "";
for await (const chunk of process.stdin) input += chunk;

const { tool_input: toolInput = {} } = JSON.parse(input || "{}");
const command = String(toolInput.command ?? "");

const SOURCE = String.raw`["']?\S*\b(?:src|scripts)/`;
const mentionsSource = new RegExp(SOURCE).test(command);
// `node -e "fs.writeFileSync('src/...')"` writes source as surely as a redirect does.
const evalWritesSource =
  mentionsSource &&
  /\bnode\b[^|;&]*\s(?:-\w*[ep]\w*|--eval|--print)\b/.test(command) &&
  /\b(?:write|append|copy|rename|rm|unlink)\w*(?:Sync)?\s*\(/.test(command);
const writesSource =
  evalWritesSource ||
  [
    new RegExp(String.raw`>>?\s*${SOURCE}`), // cat > src/..., echo >> src/...
    new RegExp(String.raw`\btee\b[^|;&]*${SOURCE}`),
    new RegExp(String.raw`\bsed\b[^|;&]*\s-\w*i\w*\b[^|;&]*${SOURCE}`),
  ].some((pattern) => pattern.test(command));

if (writesSource) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          "Write source files with the Write tool and change them with the Edit tool, not shell heredocs, redirects, `sed -i` or `node -e` scripts.",
      },
    }),
  );
}
