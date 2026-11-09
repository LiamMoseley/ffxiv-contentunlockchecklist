// PostToolUse hook: formats a source file with Prettier right after the Write or Edit tool changes it,
// so formatting never reaches review (CI still runs `npm run format:check`).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";

let input = "";
for await (const chunk of process.stdin) input += chunk;

const { tool_input: toolInput = {} } = JSON.parse(input || "{}");
const file = String(toolInput.file_path ?? "");
const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const inProject = file !== "" && !relative(projectDir, resolve(file)).startsWith("..");

if (inProject && existsSync(file) && /\.(tsx?|mjs|css|json|md)$/.test(file)) {
  // A file Prettier ignores (see .prettierignore) is left alone; any other failure is CI's to report.
  spawnSync("npx", ["prettier", "--write", "--ignore-unknown", file], { cwd: projectDir, shell: true, stdio: "ignore" });
}
