/**
 * Snapshot build script: fetches the wiki's Content Unlock page, saves it (with its revision ID) as
 * the test fixture, and bundles the parsed content into the app. Run with `npm run snapshot`.
 */
import { writeFileSync } from "node:fs";
import { fetchContentUnlockPage } from "../src/adapters/wikiSource";
import { parseContentUnlockPage } from "../src/log";

const fixturePath = new URL("../fixtures/content-unlock-page.json", import.meta.url);
const bundlePath = new URL("../src/content/bundled-content.json", import.meta.url);

const page = await fetchContentUnlockPage();
writeFileSync(fixturePath, JSON.stringify(page));

const content = parseContentUnlockPage(page);
writeFileSync(bundlePath, JSON.stringify(content, null, 1) + "\n");

const entries = content.sections.reduce((n, s) => n + s.entries.length, 0);
console.log(`Revision ${page.revisionId}: ${content.sections.length} sections, ${entries} entries.`);
