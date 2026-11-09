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
      const hash = createHash("sha256");
      for (const file of files) hash.update(file).update(readFileSync(join(outDir, file)));
      const precache = files.map((file) => (file === "index.html" ? "./" : file));
      const worker = readFileSync(TEMPLATE, "utf8")
        .replace("__VERSION__", hash.digest("hex").slice(0, 12))
        .replace("__PRECACHE__", JSON.stringify(precache))
        .replace(
          "__FONT_STYLESHEETS__",
          JSON.stringify(fontStylesheets(readFileSync(join(outDir, "index.html"), "utf8"))),
        );
      writeFileSync(join(outDir, "sw.js"), worker);
    },
  };
}
