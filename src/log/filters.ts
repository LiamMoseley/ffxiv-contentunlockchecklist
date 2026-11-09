import type { Entry } from "./content";
import type { EntryStatus } from "./progress";

export type OptionalChallengeFilter = "all" | "none" | "only";

/** What narrows the log. `type` is a content type, or null for every type. */
export type Filters = {
  search: string;
  type: string | null;
  optionalChallenge: OptionalChallengeFilter;
  hideCompleted: boolean;
  hideNotInterested: boolean;
};

export const DEFAULT_FILTERS: Filters = {
  search: "",
  type: null,
  optionalChallenge: "all",
  hideCompleted: false,
  hideNotInterested: false,
};

export const OPTIONAL_CHALLENGE_FILTERS: OptionalChallengeFilter[] = ["all", "none", "only"];

/** An entry's content type: the first line of the wiki's Type cell ("PvP\nLocation" is a PvP entry). */
export const typeOf = (entry: Entry): string => entry.type.split("\n")[0];

/** How many filters are narrowing the log: the search, the type, the optional challenge choice and each checkbox. */
export const activeFilterCount = (filters: Filters): number =>
  [
    filters.search.trim() !== "",
    filters.type !== null,
    filters.optionalChallenge !== "all",
    filters.hideCompleted,
    filters.hideNotInterested,
  ].filter(Boolean).length;

/** Every field the search looks in. */
const searchText = (entry: Entry): string =>
  [entry.level, entry.itemLevel, entry.unlock, entry.type, entry.quest, entry.location, entry.information]
    .join("\n")
    .toLowerCase();

/** Whether the entry passes every filter; `status` is its status for the current character. */
export function passesFilters(entry: Entry, status: EntryStatus, filters: Filters): boolean {
  if (filters.hideCompleted && status === "completed") return false;
  if (filters.hideNotInterested && status === "notInterested") return false;
  if (filters.type !== null && typeOf(entry) !== filters.type) return false;
  if (filters.optionalChallenge === "none" && entry.optionalChallenge) return false;
  if (filters.optionalChallenge === "only" && !entry.optionalChallenge) return false;
  const words = filters.search.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    const text = searchText(entry);
    if (!words.every((word) => text.includes(word))) return false;
  }
  return true;
}
