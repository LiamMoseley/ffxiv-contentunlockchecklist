// SessionStart hook: tells the agent when the checkout is behind origin/main or on a branch main already contains,
// so ticket work starts from current code instead of a merged branch.
import { execFileSync } from "node:child_process";

let input = "";
for await (const chunk of process.stdin) input += chunk;
const { cwd } = JSON.parse(input || "{}");

const git = (...args) => execFileSync("git", args, { cwd: cwd || process.cwd(), encoding: "utf8", timeout: 15000 }).trim();

let warning = "";
try {
  git("fetch", "--quiet", "origin", "main");
  const head = git("rev-parse", "HEAD");
  const main = git("rev-parse", "origin/main");
  const branch = git("branch", "--show-current");
  const behind = Number(git("rev-list", "--count", "HEAD..origin/main"));
  const merged = head !== main && behind > 0 && git("rev-list", "--count", "origin/main..HEAD") === "0";
  if (merged) {
    warning = `Branch ${branch} is already merged into origin/main (${behind} newer commits there). Start ticket work with \`git switch -c claude/<ticket-slug> origin/main\`.`;
  } else if (behind > 0) {
    warning = `Branch ${branch} is ${behind} commits behind origin/main. Bring it up to date before reading code for ticket work.`;
  }
} catch {
  // Offline, no origin, or not a git checkout: say nothing.
}

if (warning) {
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: warning } }));
}
