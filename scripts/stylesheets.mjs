/** The stylesheets under a directory, with comments removed, for the CSS check scripts. */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export function stylesheets(dir) {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
    .map((entry) => {
      const file = join(entry.parentPath, entry.name);
      return { file, css: readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "") };
    });
}
