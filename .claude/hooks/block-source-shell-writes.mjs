// PreToolUse hook: refuses shell commands that write project source (heredocs, redirects, `sed -i`, `node -e`,
// or a throwaway `node script.mjs` whose text writes `src/` or `scripts/`), so source changes go through the
// Write and Edit tools, where quoting and `\n` survive intact.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
/** A throwaway script run with `node` or `tsx` whose text writes project source; the repo's own scripts are exempt. */
function scriptWritesSource() {
  const runs = command.matchAll(/\b(?:node|tsx)\s+(?:--?\S+\s+)*["']?([^\s"'|;&]+\.(?:mjs|cjs|js|ts))/g);
  for (const [, path] of runs) {
    if (new RegExp(SOURCE).test(path)) continue;
    // The command may create the script itself (`cat > x.mjs <<EOF … EOF; node x.mjs`): the file does not exist yet,
    // so judge the command's own text.
    if (mentionsSource && /\b(?:write|append|copy|rename|rm|unlink)\w*(?:Sync)?\s*\(/.test(command)) return true;
    const local = process.platform === "win32" ? path.replace(/^\/([a-z])\//i, "$1:/") : path;
    try {
      const text = readFileSync(resolve(toolInput.cwd ?? process.cwd(), local), "utf8");
      if (new RegExp(SOURCE).test(text) && /\b(?:write|append|copy|rename|rm|unlink)\w*(?:Sync)?\s*\(/.test(text))
        return true;
    } catch {
      // A script that can't be read can't be judged.
    }
  }
  return false;
}
// `sed -i` with a source path anywhere in the command. The sed script may hold `|`, `;` or `&` (`s|a|b|` is common),
// so the path is not looked for between the flag and the end of the script: only the flag must sit in sed's own
// arguments, before any pipe or `;`/`&` token. A `;` or `&` glued to a word ends sed's arguments too
// (`sed -n 1p f.md; grep -i x` has no `sed -i`), so a token that ends in one is sed's last. Inside quotes they
// are script text (`sed -e 's/a/b; s/c/d/' -i f`), so they are blanked first.
const unquoted = command.replace(/'[^']*'|"[^"]*"/g, (quoted) => quoted.replace(/[|;&]/g, "_"));
const sedEditsInPlace =
  mentionsSource && /\bsed\b(?:\s+(?![|;&])\S*[^\s|;&](?=\s))*?\s+(?:-\w*i\S*|--in-place\S*)(?=\s|$)/.test(unquoted);
const writesSource =
  evalWritesSource ||
  scriptWritesSource() ||
  [
    new RegExp(String.raw`>>?\s*${SOURCE}`), // cat > src/..., echo >> src/...
    new RegExp(String.raw`\btee\b[^|;&]*${SOURCE}`),
  ].some((pattern) => pattern.test(command)) || sedEditsInPlace;

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
