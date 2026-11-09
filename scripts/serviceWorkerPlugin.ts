import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Plugin } from "vite";

const TEMPLATE = new URL("./sw.template.js", import.meta.url);

/** Every file under `dir`, as paths relative to it with forward slashes. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join("/"))
    .sort();
}

/** The Google Fonts stylesheets the page links to. */
function fontStylesheets(indexHtml: string): string[] {
  return [...indexHtml.matchAll(/href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"/g)].map((m) =>
    m[1].replaceAll("&amp;", "&"),
  );
}

/**
 * Writes `sw.js` into the build output once the rest of it exists: the files to keep for offline use (everything the
 * build emitted, public icons included) and a version that changes whenever any of them does.
 */
export function serviceWorker(): Plugin {
  let outDir = "dist";
  return {
    name: "service-worker",
    apply: "build",
    configResolved(config) {
      outDir = join(config.root, config.build.outDir);
    },
    closeBundle() {
      const files = filesUnder(outDir).filter((file) => file !== "sw.js");
      const template = readFileSync(TEMPLATE, "utf8");
      // The worker's own code is part of the version: a changed worker starts with a fresh cache.
      const hash = createHash("sha256").update(template);
      for (const file of files) hash.update(file).update(readFileSync(join(outDir, file)));
      const precache = files.map((file) => (file === "index.html" ? "./" : file));
      const worker = template
        .replace("__VERSION__", hash.digest("hex").slice(0, 12))
        .replace("__PRECACHE__", JSON.stringify(precache))
        .replace(
          "__FONT_STYLESHEETS__",
          JSON.stringify(fontStylesheets(readFileSync(join(outDir, "index.html"), "utf8"))),
        );
      // A placeholder the template lost or misspelt would otherwise ship as literal text.
      const unfilled = worker.match(/"__VERSION__"|__PRECACHE__|__FONT_STYLESHEETS__/);
      if (unfilled) throw new Error(`sw.template.js: placeholder not filled: ${unfilled[0]}`);
      writeFileSync(join(outDir, "sw.js"), worker);
    },
  };
}
