import { parse, HTMLElement, TextNode, type Node } from "node-html-parser";
import { EXPANSIONS, type Expansion } from "./expansions";

/** A copy of the wiki's Content Unlock page as the MediaWiki API returns it. */
export type WikiPage = { revisionId: number; html: string };

/** A run of text, linked to a wiki page where the wiki links it. */
export type TextSegment = { text: string; href?: string };

/** One of the wiki's icons; `icon` is its path inside the wiki's image folder. */
export type IconSegment = { icon: string; alt: string; size: number };

export type Segment = TextSegment | IconSegment;

/** A cell's text with the wiki's icons and links kept: one array of segments per line. */
export type RichText = Segment[][];

/** The cells whose icons and links the log keeps. */
export type RichFields = Record<"unlock" | "type" | "quest" | "location" | "information", RichText>;

/** One row of the log, as the wiki lists it. The fields are plain text; `rich` adds icons and links. */
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
  /** The wiki tags the entry "Optional challenge content"; free-text mentions of "optional" don't count. */
  optionalChallenge: boolean;
  rich: RichFields;
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
  // Level bands the app has no expansion for, by level cap.
  const unknown = new Map<number, Expansion>();
  for (const heading of root.querySelectorAll("h2")) {
    const table = tableAfter(heading);
    if (!table) continue;
    const band = levelBand(heading.text);
    if (!band) continue;
    let expansion = EXPANSIONS.find((e) => e.levelCap === band.upper) ?? unknown.get(band.upper);
    if (!expansion) {
      expansion = placeholderExpansion(band.upper);
      unknown.set(band.upper, expansion);
    }
    // The levelling section's lower bound gives the placeholder its name; a level-cap section has none.
    if (unknown.has(band.upper) && band.lower < expansion.minLevel) {
      expansion = placeholderExpansion(band.upper, band.lower);
      unknown.set(band.upper, expansion);
    }
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
  const placeholders = [...unknown.values()].sort((a, b) => a.levelCap - b.levelCap);
  return {
    revisionId: page.revisionId,
    expansions: [...EXPANSIONS, ...placeholders].filter((e) => expansionIds.has(e.id)),
    sections: withEntryIds(sections),
  };
}

/** A stand-in for an expansion the app doesn't know yet, named by its levels (e.g. "Level 101–110"). */
function placeholderExpansion(levelCap: number, minLevel = levelCap): Expansion {
  const levels = minLevel === levelCap ? `Level ${levelCap}` : `Level ${minLevel}–${levelCap}`;
  return { id: `level-${levelCap}`, name: levels, shortName: levels.replace("Level ", ""), minLevel, levelCap };
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

/** The rich cells, by the wiki column header that fills each. */
const RICH_COLUMNS: Record<keyof RichFields, string> = {
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
    const cellFor = (header: string): HTMLElement | undefined => cells[headers.indexOf(header)];
    // Rich text is read before plain text, because reading plain text rewrites the cell's line breaks.
    const rich = Object.fromEntries(
      Object.entries(RICH_COLUMNS).map(([key, header]) => {
        const cell = cellFor(header);
        return [key, cell && cellText(cell.clone() as HTMLElement) !== "" ? richText(cell) : []];
      }),
    ) as RichFields;
    const field = (header: string) => {
      const cell = cellFor(header);
      return cell ? cellText(cell) : "";
    };
    return [
      {
        level: field("level"),
        itemLevel: field("ilevel"),
        unlock: field("unlock"),
        type: field("type"),
        quest: field("quest"),
        location: field("location"),
        information: field("information"),
        optionalChallenge: /optional challenge content/i.test(field("information")),
        rich,
      },
    ];
  });
}

/** A cell's text with markup removed; line breaks become newlines and a lone "-" means no value. */
function cellText(cell: HTMLElement): string {
  for (const br of cell.querySelectorAll("br")) br.replaceWith("\n");
  const text = cell.text.split("\n").map(cleanText).filter(Boolean).join("\n");
  return text === "-" ? "" : text;
}

const WIKI_ORIGIN = "https://ffxiv.consolegameswiki.com";
const IMAGE_FOLDER = "/mediawiki/images/";

/** A cell's text with the wiki's icons and links kept, one array of segments per line. */
function richText(cell: HTMLElement): RichText {
  const pieces: (Segment | "\n")[] = [];
  const walk = (node: Node, href?: string) => {
    if (node instanceof TextNode) {
      pieces.push(href ? { text: node.text, href } : { text: node.text });
    } else if (node instanceof HTMLElement) {
      if (node.tagName === "BR") pieces.push("\n");
      else if (node.tagName === "IMG") pieces.push(...iconOf(node));
      else if (node.tagName !== "STYLE" && node.tagName !== "SCRIPT") {
        const target = node.tagName === "A" ? wikiUrl(node.getAttribute("href")) : undefined;
        for (const child of node.childNodes) walk(child, target ?? href);
      }
    }
  };
  for (const child of cell.childNodes) walk(child);

  const lines: Segment[][] = [[]];
  for (const piece of pieces) {
    if (piece === "\n") lines.push([]);
    else if ("icon" in piece) lines[lines.length - 1].push(piece);
    else {
      // A line break inside the wiki's source text also ends a line, as in the plain text.
      piece.text.split("\n").forEach((part, i) => {
        if (i > 0) lines.push([]);
        lines[lines.length - 1].push({ ...piece, text: part });
      });
    }
  }
  return lines.map(tidyLine).filter((line) => line.length > 0);
}

/** Collapses whitespace, merges neighbouring runs with the same link and trims the line's ends. */
function tidyLine(line: Segment[]): Segment[] {
  const merged: Segment[] = [];
  for (const segment of line) {
    if ("icon" in segment) {
      merged.push(segment);
      continue;
    }
    const text = segment.text.replace(/\s+/g, " ");
    const last = merged[merged.length - 1];
    if (last && "text" in last && last.href === segment.href) last.text += text;
    else merged.push({ ...segment, text });
  }
  const first = merged[0];
  if (first && "text" in first) first.text = first.text.trimStart();
  const last = merged[merged.length - 1];
  if (last && "text" in last) last.text = last.text.trimEnd();
  return merged.filter((s) => "icon" in s || s.text !== "");
}

/** The icon an <img> shows: its sharpest source, as a path inside the wiki's image folder. */
function iconOf(img: HTMLElement): IconSegment[] {
  const candidates = img
    .getAttribute("srcset")
    ?.split(",")
    .map((c) => c.trim().split(/\s+/)[0]);
  const src = candidates?.[candidates.length - 1] ?? img.getAttribute("src");
  if (!src?.startsWith(IMAGE_FOLDER)) return [];
  return [
    {
      icon: src.slice(IMAGE_FOLDER.length),
      alt: img.getAttribute("alt") ?? "",
      size: Number(img.getAttribute("width")) || 24,
    },
  ];
}

/** A wiki link as an absolute address; undefined for a link with nowhere to go. */
function wikiUrl(href: string | undefined): string | undefined {
  return href ? new URL(href, WIKI_ORIGIN).href : undefined;
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
