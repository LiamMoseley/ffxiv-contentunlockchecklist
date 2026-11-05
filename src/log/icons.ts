import type { Content, IconSegment, RichText } from "./content";

/** The wiki's image folder; an icon is identified by its path inside it. */
export const WIKI_IMAGE_BASE = "https://ffxiv.consolegameswiki.com/mediawiki/images/";

/** Every distinct icon the content uses, as wiki image paths, in order of first use. */
export function iconsUsed(content: Content): string[] {
  const paths = new Set<string>();
  for (const section of content.sections) {
    for (const entry of section.entries) {
      for (const lines of Object.values(entry.rich)) {
        for (const segment of lines.flat()) {
          if ("icon" in segment) paths.add(segment.icon);
        }
      }
    }
  }
  return [...paths];
}

/** The file an icon is bundled as: the wiki's file name, with anything unsafe in a URL replaced. */
export function iconFile(icon: string): string {
  const name = decodeURIComponent(icon.slice(icon.lastIndexOf("/") + 1));
  return name.replace(/[^\w.-]+/g, "_");
}

/** The first icon in a cell, if the wiki shows one there. */
export function firstIcon(text: RichText): IconSegment | undefined {
  return text.flat().find((s): s is IconSegment => "icon" in s);
}
