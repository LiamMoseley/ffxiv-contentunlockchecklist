// PreToolUse hook: refuses `git commit` while the checkout is on main, so ticket work lands on a branch.
import { execFileSync } from "node:child_process";

let input = "";
for await (const chunk of process.stdin) input += chunk;

const { tool_input: toolInput = {}, cwd } = JSON.parse(input || "{}");
const command = String(toolInput.command ?? "");

if (/\bgit\b(\s+-\S+(\s+\S+)?)*\s+commit\b/.test(command)) {
  let branch = "";
  try {
    branch = execFileSync("git", ["branch", "--show-current"], { cwd: cwd || process.cwd(), encoding: "utf8" }).trim();
  } catch {
    // Not a git checkout, or git is unavailable: let the command run and fail on its own terms.
  }
  if (branch === "main") {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason:
            "This checkout is on main. Switch to a branch first (`git switch -c claude/<ticket-slug>`); uncommitted changes come with you.",
        },
      }),
    );
  }
}
