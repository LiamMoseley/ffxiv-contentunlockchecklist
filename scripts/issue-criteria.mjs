/**
 * Ticks or adds acceptance criteria on a GitHub issue, changing nothing else in its body.
 *
 *   node scripts/issue-criteria.mjs tick   <issue> <n|a-b>...|all [--dry]
 *   node scripts/issue-criteria.mjs untick <issue> <n|a-b>...|all [--dry]
 *   node scripts/issue-criteria.mjs add    <issue> "<criterion text>" [--ticked] [--dry]
 *   node scripts/issue-criteria.mjs reword <issue> <n> "<new text>" [--dry]   (only when the owner changes a requirement)
 *
 * `tick` marks the numbered criteria (1 = the first `- [ ]` / `- [x]` line under the body) as met, or every
 * criterion with `all`; `untick` puts them back to unmet. `add` appends a criterion after the last one. `--dry` prints the new body instead
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
const usage = 'Usage: issue-criteria.mjs tick|untick <issue> <n|a-b>...|all | add <issue> "<text>" [--ticked] [--dry]';
if (!["tick", "untick", "add", "reword"].includes(command) || !/^\d+$/.test(issue ?? "") || args.length === 0) {
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

/** `3` is [3]; `1-5` is [1, 2, 3, 4, 5]; the caller splits a comma list (`1-5,7`) first. Anything else, including a backwards range, is NaN and reported as bad. */
function expandNumbers(token) {
  const range = /^(\d+)-(\d+)$/.exec(token);
  if (!range || Number(range[1]) > Number(range[2])) return [Number(token)];
  const [from, to] = [Number(range[1]), Number(range[2])];
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

let result;
if (command === "tick" || command === "untick") {
  const chosen =
    args[0] === "all" ? criterionAt.map((_, i) => i + 1) : args.flatMap((arg) => arg.split(",")).flatMap(expandNumbers);
  const bad = chosen.filter((n) => !Number.isInteger(n) || n < 1 || n > criterionAt.length);
  if (bad.length > 0) {
    console.error(`No criterion ${bad.join(", ")}: the issue has ${criterionAt.length}.`);
    process.exit(1);
  }
  result = [...lines];
  const [from, to] = command === "tick" ? [/^- \[ \]/, "- [x]"] : [/^- \[[xX]\]/, "- [ ]"];
  for (const n of chosen) result[criterionAt[n - 1]] = result[criterionAt[n - 1]].replace(from, to);
} else if (command === "reword") {
  const n = Number(args[0]);
  if (!Number.isInteger(n) || n < 1 || n > criterionAt.length || args.length < 2) {
    console.error(`Usage: reword <issue> <1-${criterionAt.length}> "<new text>"`);
    process.exit(1);
  }
  result = [...lines];
  // Keeps the marker; a criterion that wrapped onto continuation lines becomes one line.
  const at = criterionAt[n - 1];
  let end = at;
  while (end + 1 < lines.length && lines[end + 1].trim() !== "" && !/^(- |#)/.test(lines[end + 1])) end++;
  result.splice(at, end - at + 1, `${lines[at].slice(0, 5)} ${args.slice(1).join(" ")}`);
} else {
  // A criterion can wrap onto continuation lines: insert after the last of them.
  let after = criterionAt[criterionAt.length - 1];
  while (after + 1 < lines.length && lines[after + 1].trim() !== "" && !/^(- |#)/.test(lines[after + 1])) after++;
  result = [
    ...lines.slice(0, after + 1),
    `- [${flags.has("--ticked") ? "x" : " "}] ${args.join(" ")}`,
    ...lines.slice(after + 1),
  ];
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
  // Names each criterion it wrote, so a wrong number from `reword` or `tick` shows at once, not on the next read.
  const before = new Set(lines);
  console.log(`Updated #${issue}:\n${result.filter((l) => /^- \[[ xX]\]/.test(l) && !before.has(l)).join("\n")}`);
}
