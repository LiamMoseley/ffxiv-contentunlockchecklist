import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const hook = new URL("./block-source-shell-writes.mjs", import.meta.url);

/** Whether the hook refuses `command`. */
function blocks(command) {
  const run = spawnSync("node", [hook.pathname.replace(/^\/([A-Za-z]:)/, "$1")], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: "utf8",
  });
  return run.stdout.includes('"permissionDecision":"deny"');
}

describe("block-source-shell-writes hook", () => {
  it.each([
    `cat > src/a.ts`,
    `echo x >> scripts/a.ts`,
    `sed -i 's/a/b/' src/log/log.ts`,
    `sed -i 's|a|b|' src/log/log.ts`,
    `sed -i 's|scripts/a"|scripts/a.ts"|' vite.config.ts`,
    `sed -i -e 's|a|b|;s|c|d|' src/main.tsx`,
    `sed -n 1p x && sed -i.bak 's|a|b|' src/ui/App.tsx`,
    `sed --in-place 's|a|b|' scripts/sw.template.js`,
    `sed -e 's/a/b; s/c/d/' -i src/x.ts`,
    `sed -e "s/a/b && c/" -i src/x.ts`,
    `sed -n 1p docs/prd.md; sed -i 's/a/b/' src/x.ts`,
    `cat > /tmp/e.mjs <<'EOF'\nfs.writeFileSync("src/ui/app.css", s)\nEOF\nnode /tmp/e.mjs`,
  ])("blocks %s", (command) => {
    expect(blocks(command)).toBe(true);
  });

  it.each([
    `sed -n '1,10p' src/log/log.ts`,
    `grep -i foo src/log/log.ts | sed 's|a|b|'`,
    `sed -i 's|a|b|' notes.txt`,
    `git status`,
    `node /tmp/read.mjs src/log/log.ts`,
    `sed -n 1,5p docs/prd.md; grep -n -i level docs/prd.md; sed -n 3p src/log/log.ts`,
    `sed -n 1,5p docs/prd.md && grep -i level src/log/log.ts`,
  ])("allows %s", (command) => {
    expect(blocks(command)).toBe(false);
  });
});
