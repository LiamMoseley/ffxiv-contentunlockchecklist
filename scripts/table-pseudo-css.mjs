/**
 * Fails when a stylesheet puts a `::before` or `::after` on a table row or row group.
 *
 *   node scripts/table-pseudo-css.mjs [dir]
 *
 * A table turns such a pseudo-element into an anonymous cell, which takes a share of the row's width and resizes it
 * (#88: the Completed sheen shrank the Information column while it played). Hang the effect off a cell instead, such as
 * `tr.flash-completed > td.unlock::after`.
 *
 * It sees only selectors that name the row element (`tr::after`, `tr.flash::after`). A bare class that the code puts on
 * a `<tr>` (`.flash-completed::after`) looks the same as one on a `<div>`, so the browser check in
 * docs/agents/verifying-the-ui.md covers that case.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "src";

const stylesheets = readdirSync(dir, { withFileTypes: true, recursive: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
  .map((entry) => join(entry.parentPath, entry.name));

const found = [];
for (const file of stylesheets) {
  const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  // A selector is the text before a `{`, minus at-rule preludes such as `@media (...)`.
  for (const [, prelude] of css.matchAll(/([^{}]+)\{/g)) {
    if (prelude.trim().startsWith("@")) continue;
    for (const selector of prelude.split(",")) {
      // The compound selector the pseudo-element sits on: the text after the last combinator.
      const target = selector
        .trim()
        .split(/\s*[\s>+~]\s*/)
        .pop();
      if (/^(tr|tbody|thead|tfoot)\b.*::?(before|after)\b/.test(target)) found.push(`${file}: ${selector.trim()}`);
    }
  }
}

if (found.length > 0) {
  console.error(
    `Pseudo-elements on a table row or row group:\n${found.map((s) => `  ${s}`).join("\n")}\n` +
      "A table makes each one an anonymous cell that resizes the row. Put it on a cell (`td::after`) instead.",
  );
  process.exit(1);
}
console.log("No pseudo-elements on table rows.");
