/**
 * Fails when a stylesheet sets text size or weight outside the type tokens (#119).
 *
 *   node scripts/type-tokens.mjs [dir]
 *
 * Sizes come from the `--size-*` scale and the `--type-*` roles defined in `:root` (the phone block redefines some of
 * them in its own `:root`), so a rule says `font-size: var(--size-sm)` or `font: var(--type-name)`. This flags, in any
 * rule except a `:root` one:
 *   - a `font-size` with a length literal (`13px`, `0.82em`, `1rem`)
 *   - a `font` shorthand with a pixel size (`400 24px/1 ...`)
 *   - a 600 weight, which the type scale does not use
 * `font-size: inherit` and `font: inherit` are fine.
 */
import { stylesheets } from "./stylesheets.mjs";

const length = /\d(?:px|r?em)\b/;

const found = [];
for (const { file, css } of stylesheets(process.argv[2] ?? "src")) {
  // The innermost blocks: a selector, then declarations with no braces of their own.
  for (const [, prelude, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = prelude.trim();
    if (selector.startsWith("@") || selector === ":root") continue;
    for (const declaration of body.split(";")) {
      const [property, ...rest] = declaration.split(":");
      const name = property.trim();
      const value = rest.join(":").trim();
      const bad =
        (name === "font-size" && length.test(value)) ||
        (name === "font" && /\d+(?:\.\d+)?px/.test(value)) ||
        ((name === "font" || name === "font-weight") && /\b600\b/.test(value));
      if (bad) found.push(`${file}: ${selector} { ${name}: ${value.replace(/\s+/g, " ")} }`);
    }
  }
}

if (found.length > 0) {
  console.error(
    `Text size or weight set outside the type tokens:\n${found.map((s) => `  ${s}`).join("\n")}\n` +
      "Use a size from the --size-* scale or a --type-* role (see Typography in CODING_STANDARDS.md). " +
      "A size that differs on phones is redefined in the phone block's :root.",
  );
  process.exit(1);
}
console.log("No text styles outside the type tokens.");
