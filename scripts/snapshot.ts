/**
 * Snapshot build script: fetches the wiki's Content Unlock page, saves it (with its revision ID) as
 * the test fixture, bundles the parsed content into the app, and downloads every icon the content
 * uses into public/icons (the wiki rejects hotlinked images that carry a Referer, so the app serves
 * its own copies). Run with `npm run snapshot`.
 *
 * `npm run snapshot -- --from-fixture` re-parses the saved fixture instead of fetching the page.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fetchContentUnlockPage } from "../src/adapters/wikiSource";
import { iconFile, iconsUsed, parseContentUnlockPage, WIKI_IMAGE_BASE, type WikiPage } from "../src/log";

const fixturePath = new URL("../fixtures/content-unlock-page.json", import.meta.url);
const bundlePath = new URL("../src/content/bundled-content.json", import.meta.url);
const iconFolder = new URL("../public/icons/", import.meta.url);

let page: WikiPage;
if (process.argv.includes("--from-fixture")) {
  page = JSON.parse(readFileSync(fixturePath, "utf8"));
} else {
  page = await fetchContentUnlockPage();
  writeFileSync(fixturePath, JSON.stringify(page));
}

const content = parseContentUnlockPage(page);
writeFileSync(bundlePath, JSON.stringify(content, null, 1) + "\n");

mkdirSync(iconFolder, { recursive: true });
const icons = iconsUsed(content);
let downloaded = 0;
for (const icon of icons) {
  const file = new URL(iconFile(icon), iconFolder);
  if (existsSync(file)) continue;
  // Node's fetch sends no Referer, which is what the wiki's image server requires.
  const response = await fetch(WIKI_IMAGE_BASE + icon);
  if (!response.ok) throw new Error(`Icon ${icon} failed: ${response.status}`);
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  downloaded++;
}

const entries = content.sections.reduce((n, s) => n + s.entries.length, 0);
console.log(
  `Revision ${page.revisionId}: ${content.sections.length} sections, ${entries} entries, ${icons.length} icons (${downloaded} downloaded).`,
);
