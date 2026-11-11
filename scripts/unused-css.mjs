/**
 * Fails when a stylesheet names a class that no source file mentions: the leftover of a removed element.
 *
 *   node scripts/unused-css.mjs
 *
 * A class counts as used when its name appears in any non-test `.ts`/`.tsx` file under `src`. Classes the code
 * builds from a template string (`update-${kind}`) never appear whole: list them in DYNAMIC.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Classes assembled at runtime, so no source file spells them out. */
const DYNAMIC = new Set([]);

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));

const all = files("src");
const source = all
  .filter((file) => /\.tsx?$/.test(file) && !/\.test\./.test(file))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

const unused = new Map();
for (const file of all.filter((f) => f.endsWith(".css"))) {
  const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  // A selector is the text before a `{`, minus at-rule preludes such as `@media (...)`.
  for (const [, prelude] of css.matchAll(/([^{}]+)\{/g)) {
    if (prelude.trim().startsWith("@")) continue;
    for (const [, name] of prelude.matchAll(/\.([A-Za-z_][\w-]*)/g)) {
      if (!DYNAMIC.has(name) && !source.includes(name)) unused.set(`${file}: .${name}`, true);
    }
  }
}

if (unused.size > 0) {
  console.error(
    `CSS classes no source file mentions:\n${[...unused.keys()].map((k) => `  ${k}`).join("\n")}\n` +
      'Write each class name whole in the source ("flash-completed", not `flash-${status}`), or list a runtime-built one in DYNAMIC.',
  );
  process.exit(1);
}
console.log("No unused CSS classes.");
