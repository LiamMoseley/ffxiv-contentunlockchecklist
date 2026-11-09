import { readFileSync } from "node:fs";
import { createLog, parseContentUnlockPage, type Clock, type WikiPage, type WikiSource } from "../index";
import { createMemoryStorage } from "../../adapters/memoryStorage";
import type { Storage } from "../index";

const fixturePath = new URL("../../../fixtures/content-unlock-page.json", import.meta.url);

/** The saved copy of the real wiki Content Unlock page. */
export const realPage: WikiPage = JSON.parse(readFileSync(fixturePath, "utf8"));

/** A hand-edited copy of the real page: `edit` rewrites its HTML. */
export function editedPage(edit: (html: string) => string): WikiPage {
  const html = edit(realPage.html);
  if (html === realPage.html) throw new Error("edit changed nothing");
  return { ...realPage, html };
}

export function fixedClock(iso = "2026-11-03T12:00:00.000Z"): Clock & { set(iso: string): void } {
  let now = new Date(iso);
  return { now: () => now, set: (next) => (now = new Date(next)) };
}

/** A wiki that serves the page it is given, or fails to be reached. */
export function fakeWiki(page: WikiPage = realPage): WikiSource & { serve(next: WikiPage): void; goOffline(): void } {
  let serving: WikiPage | null = page;
  return {
    fetchPage: async () => {
      if (!serving) throw new Error("offline");
      return serving;
    },
    serve: (next) => (serving = next),
    goOffline: () => (serving = null),
  };
}

export function openLog(
  options: { page?: WikiPage; storage?: Storage; clock?: Clock; wiki?: ReturnType<typeof fakeWiki> } = {},
) {
  const wiki = options.wiki ?? fakeWiki();
  const storage = options.storage ?? createMemoryStorage();
  const clock = options.clock ?? fixedClock();
  const log = createLog({
    content: parseContentUnlockPage(options.page ?? realPage),
    storage,
    wiki,
    clock,
  });
  return { log, storage, clock, wiki };
}

/** Rewrites the one table row of `html` that contains `marker`. */
export function editRow(html: string, marker: string, edit: (row: string) => string): string {
  const at = html.indexOf(marker);
  if (at < 0 || html.indexOf(marker, at + 1) >= 0) throw new Error(`marker must occur once: ${marker}`);
  const start = html.lastIndexOf("<tr>", at);
  const end = html.indexOf("</tr>", at) + "</tr>".length;
  return html.slice(0, start) + edit(html.slice(start, end)) + html.slice(end);
}

/** The table row of `html` that contains `marker`. */
export function rowOf(html: string, marker: string): string {
  let row = "";
  editRow(html, marker, (r) => (row = r));
  return row;
}

/** Inserts `row` as the first row of the section headed `heading`. */
export function insertRowAtTopOf(html: string, heading: string, row: string): string {
  const headingAt = html.indexOf(`>${heading}</h2>`);
  if (headingAt < 0) throw new Error(`no section ${heading}`);
  const headerEnd = html.indexOf("</th></tr>", headingAt) + "</th></tr>".length;
  return html.slice(0, headerEnd) + "\n" + row + html.slice(headerEnd);
}
