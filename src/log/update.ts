import type { Content, Entry, WikiPage } from "./content";
import type { SuggestedMatch } from "./suggestions";

/**
 * The wiki source adapter. Each call rejects when the wiki can't be reached. `fetchRevisionId` is a cheap
 * lookup of the Content Unlock page's current revision, so the automatic check needn't download the page.
 */
export type WikiSource = { fetchPage(): Promise<WikiPage>; fetchRevisionId(): Promise<number> };

/** The plain fields of an entry that an update can change. */
export const COMPARED_FIELDS = [
  "level",
  "itemLevel",
  "unlock",
  "type",
  "quest",
  "location",
  "information",
  "optionalChallenge",
] as const satisfies readonly (keyof Entry)[];

export type EntryField = (typeof COMPARED_FIELDS)[number];

/** An entry the update keeps (same ID) but whose other fields differ. */
export type ChangedEntry = { before: Entry; after: Entry; fields: EntryField[] };

/** What applying an update would do to the entries; nothing is applied until `applyUpdate`. */
export type UpdatePreview = {
  revisionId: number;
  added: Entry[];
  changed: ChangedEntry[];
  removed: Entry[];
  /** Removed entries that had progress, each paired with the new entry that may be its reworded version. */
  suggestions: SuggestedMatch[];
  /** The parsed page, kept so applying needs no second fetch. */
  content: Content;
};

export type UpdateCheck =
  { status: "unreachable" } | { status: "upToDate" } | { status: "changes"; preview: UpdatePreview };

const entriesOf = (content: Content) => content.sections.flatMap((s) => s.entries);

/** Compares entries by ID: new, changed (other fields differ) and removed. */
export function diffContent(
  current: Content,
  next: Content,
): Omit<UpdatePreview, "revisionId" | "content" | "suggestions"> {
  const before = new Map(entriesOf(current).map((e) => [e.id, e]));
  const after = new Map(entriesOf(next).map((e) => [e.id, e]));
  const changed: ChangedEntry[] = [];
  for (const [id, entry] of after) {
    const earlier = before.get(id);
    if (!earlier) continue;
    const fields = COMPARED_FIELDS.filter((field) => earlier[field] !== entry[field]);
    if (fields.length > 0) changed.push({ before: earlier, after: entry, fields });
  }
  return {
    added: [...after.values()].filter((e) => !before.has(e.id)),
    changed,
    removed: [...before.values()].filter((e) => !after.has(e.id)),
  };
}
