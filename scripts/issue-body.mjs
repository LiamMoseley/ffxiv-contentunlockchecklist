/**
 * Copies a GitHub issue body to a file and back, so it can be changed with the Edit tool.
 *
 *   node scripts/issue-body.mjs get <issue> <file>
 *   node scripts/issue-body.mjs set <issue> <file>
 *
 * Put <file> in the session's scratchpad directory, never the repo. Needs `gh` signed in.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const gh = (...args) => execFileSync("gh", args, { encoding: "utf8" });

const [command, issue, file] = process.argv.slice(2);
if (!["get", "set"].includes(command) || !/^\d+$/.test(issue ?? "") || !file) {
  console.error("Usage: issue-body.mjs get|set <issue> <file>");
  process.exit(1);
}

if (command === "get") {
  writeFileSync(file, gh("issue", "view", issue, "--json", "body", "--jq", ".body").replace(/\r\n/g, "\n"));
  console.log(`Wrote #${issue} to ${file}.`);
} else {
  readFileSync(file, "utf8");
  gh("issue", "edit", issue, "--body-file", file);
  console.log(`Updated #${issue}.`);
}
