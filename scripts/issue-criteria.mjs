/**
 * Ticks or adds acceptance criteria on a GitHub issue, changing nothing else in its body.
 *
 *   node scripts/issue-criteria.mjs tick <issue> <n>...|all [--dry]
 *   node scripts/issue-criteria.mjs add  <issue> "<criterion text>" [--ticked] [--dry]
 *
 * `tick` marks the numbered criteria (1 = the first `- [ ]` / `- [x]` line under the body) as met, or every
 * criterion with `all`. `add` appends a criterion after the last one. `--dry` prints the new body instead
 * of editing the issue. Needs `gh` signed in.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const gh = (...args) => execFileSync("gh", args, { encoding: "utf8" });

const [command, issue, ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((a) => a.startsWith("--")));
const args = rest.filter((a) => !a.startsWith("--"));
const usage = 'Usage: issue-criteria.mjs tick <issue> <n>...|all | add <issue> "<text>" [--ticked] [--dry]';
if (!["tick", "add"].includes(command) || !/^\d+$/.test(issue ?? "") || args.length === 0) {
  console.error(usage);
  process.exit(1);
}

const body = gh("issue", "view", issue, "--json", "body", "--jq", ".body").replace(/\r\n/g, "\n").replace(/\n$/, "");
const lines = body.split("\n");
const criterionAt = lines.flatMap((line, i) => (/^- \[[ xX]\]/.test(line) ? [i] : []));
if (criterionAt.length === 0) {
  console.error(`Issue #${issue} has no acceptance criteria.`);
  process.exit(1);
}

let result;
if (command === "tick") {
  const chosen = args[0] === "all" ? criterionAt.map((_, i) => i + 1) : args.map(Number);
  const bad = chosen.filter((n) => !Number.isInteger(n) || n < 1 || n > criterionAt.length);
  if (bad.length > 0) {
    console.error(`No criterion ${bad.join(", ")}: the issue has ${criterionAt.length}.`);
    process.exit(1);
  }
  result = [...lines];
  for (const n of chosen) result[criterionAt[n - 1]] = result[criterionAt[n - 1]].replace(/^- \[ \]/, "- [x]");
} else {
  // A criterion can wrap onto continuation lines: insert after the last of them.
  let after = criterionAt[criterionAt.length - 1];
  while (after + 1 < lines.length && lines[after + 1].trim() !== "" && !/^(- |#)/.test(lines[after + 1])) after++;
  result = [...lines.slice(0, after + 1), `- [${flags.has("--ticked") ? "x" : " "}] ${args.join(" ")}`, ...lines.slice(after + 1)];
}

const next = result.join("\n");
if (flags.has("--dry")) {
  console.log(next);
} else if (next === body) {
  console.log("Nothing to change.");
} else {
  const file = join(mkdtempSync(join(tmpdir(), "criteria-")), "body.md");
  writeFileSync(file, next);
  gh("issue", "edit", issue, "--body-file", file);
  console.log(`Updated #${issue}.`);
}
