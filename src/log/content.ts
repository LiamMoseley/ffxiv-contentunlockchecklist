import { parse, type HTMLElement } from "node-html-parser";
import { EXPANSIONS, type Expansion } from "./expansions";

/** A copy of the wiki's Content Unlock page as the MediaWiki API returns it. */
export type WikiPage = { revisionId: number; html: string };

/** One row of the log, exactly as the wiki lists it. Every field is plain text. */
export type Entry = {
  /** Derived from the unlock and quest names (ADR-0003). */
  id: string;
  level: string;
  itemLevel: string;
  unlock: string;
  type: string;
  quest: string;
  location: string;
  information: string;
};

export type SectionKind = "levelling" | "levelCap";

/** An entry as read from its wiki row, before it is given an ID. */
type Row = Omit<Entry, "id">;

export type Section = {
  id: string;
  expansionId: string;
  kind: SectionKind;
  heading: string;
  entries: Entry[];
};

/** A section as read from the page, before its rows are given entry IDs. */
type ParsedSection = Omit<Section, "entries"> & { rows: Row[] };

export type Content = {
  revisionId: number;
  expansions: Expansion[];
  sections: Section[];
};

/** Turns the wiki's Content Unlock page into expansions, sections and entries. */
export function parseContentUnlockPage(page: WikiPage): Content {
  const root = parse(page.html);
  const sections: ParsedSection[] = [];
  for (const heading of root.querySelectorAll("h2")) {
    const table = tableAfter(heading);
    if (!table) continue;
    const band = levelBand(heading.text);
    if (!band) continue;
    const expansion = EXPANSIONS.find((e) => e.levelCap === band.upper);
    if (!expansion) continue;
    const kind: SectionKind = band.lower === band.upper ? "levelCap" : "levelling";
    sections.push({
      id: `${expansion.id}-${kind}`,
      expansionId: expansion.id,
      kind,
      heading: cleanText(heading.text),
      rows: readRows(table),
    });
  }
  const expansionIds = new Set(sections.map((s) => s.expansionId));
  return {
    revisionId: page.revisionId,
    expansions: EXPANSIONS.filter((e) => expansionIds.has(e.id)),
    sections: withEntryIds(sections),
  };
}

/**
 * Gives each row its entry ID: the normalised unlock name plus quest names. Rows that share one are
 * told apart by expansion, then by order of appearance within it. Every row of a shared name is
 * qualified, so a duplicate added elsewhere on the page never takes over an existing entry's ID.
 */
function withEntryIds(sections: ParsedSection[]): Section[] {
  const nameOf = (row: Row) => [row.unlock, row.quest].map(normalise).filter(Boolean).join("/");
  const rowsPerName = new Map<string, number>();
  for (const row of sections.flatMap((s) => s.rows)) {
    rowsPerName.set(nameOf(row), (rowsPerName.get(nameOf(row)) ?? 0) + 1);
  }
  const seenInExpansion = new Map<string, number>();
  return sections.map(({ rows, ...section }) => ({
    ...section,
    entries: rows.map((row) => {
      const name = nameOf(row);
      if (rowsPerName.get(name) === 1) return { id: name, ...row };
      const inExpansion = `${name}@${section.expansionId}`;
      const position = (seenInExpansion.get(inExpansion) ?? 0) + 1;
      seenInExpansion.set(inExpansion, position);
      return { id: position === 1 ? inExpansion : `${inExpansion}#${position}`, ...row };
    }),
  }));
}

/** Lower case, punctuation removed, words joined by hyphens. Markup is already gone. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join("-");
}

/** Wiki column headers, by the entry field each one fills. */
const COLUMNS: Record<keyof Row, string> = {
  level: "level",
  itemLevel: "ilevel",
  unlock: "unlock",
  type: "type",
  quest: "quest",
  location: "location",
  information: "information",
};

function readRows(table: HTMLElement): Row[] {
  const rows = table.querySelectorAll("tr");
  const headers = rows[0].querySelectorAll("th").map((th) => cleanText(th.text).toLowerCase());
  return rows.slice(1).flatMap((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length === 0) return [];
    const field = (header: string) => {
      const cell = cells[headers.indexOf(header)];
      return cell ? cellText(cell) : "";
    };
    return [Object.fromEntries(Object.entries(COLUMNS).map(([key, header]) => [key, field(header)])) as Row];
  });
}

/** A cell's text with markup removed; line breaks become newlines and a lone "-" means no value. */
function cellText(cell: HTMLElement): string {
  for (const br of cell.querySelectorAll("br")) br.replaceWith("\n");
  const text = cell.text.split("\n").map(cleanText).filter(Boolean).join("\n");
  return text === "-" ? "" : text;
}

/** The table that follows a section heading (MediaWiki wraps the h2 in a div). */
function tableAfter(heading: HTMLElement): HTMLElement | null {
  const wrapper = heading.parentNode?.classList.contains("mw-heading") ? heading.parentNode : heading;
  const next = wrapper.nextElementSibling;
  return next?.tagName === "TABLE" ? next : null;
}

/** Reads "Level 51 - 60" or "Level 60" as a range of levels. */
function levelBand(heading: string): { lower: number; upper: number } | null {
  const numbers = heading.match(/\d+/g)?.map(Number);
  if (!numbers?.length) return null;
  return { lower: numbers[0], upper: numbers[numbers.length - 1] };
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
