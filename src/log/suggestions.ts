import type { Content, Entry } from "./content";

/** A proposal that `to`, new in an update, is a reworded `from`, which the update orphans. */
export type SuggestedMatch = { from: Entry; to: Entry };

/** How alike two names must be (1 is identical) for a match to be suggested. */
const SIMILARITY_THRESHOLD = 0.8;

const normalise = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = row;
  }
  return previous[b.length];
}

/** 1 for identical text, down to 0 for nothing in common; 0 when either is blank. */
function similarity(a: string, b: string): number {
  const [x, y] = [normalise(a), normalise(b)];
  if (!x || !y) return 0;
  return 1 - editDistance(x, y) / Math.max(x.length, y.length);
}

/** How alike two entries are: the better of their unlock names and their quests. */
const score = (from: Entry, to: Entry) =>
  Math.max(similarity(from.unlock, to.unlock), similarity(from.quest, to.quest));

const expansionOf = (content: Content) => {
  const byEntry = new Map<string, string>();
  for (const section of content.sections)
    for (const entry of section.entries) byEntry.set(entry.id, section.expansionId);
  return byEntry;
};

/**
 * Pairs each orphan with the best new entry in its expansion whose unlock name or quest is the same or very
 * similar. An entry takes part in at most one pair; the closest pairs are settled first.
 */
export function suggestMatches(
  orphans: Entry[],
  added: Entry[],
  current: Content,
  next: Content,
  declined: ReadonlySet<string>,
): SuggestedMatch[] {
  const before = expansionOf(current);
  const after = expansionOf(next);
  const candidates = orphans.flatMap((from) =>
    added.flatMap((to) => {
      const value = score(from, to);
      const wanted = before.get(from.id) === after.get(to.id) && value >= SIMILARITY_THRESHOLD;
      return wanted && !declined.has(pairKey(from, to)) ? [{ from, to, value }] : [];
    }),
  );
  candidates.sort((a, b) => b.value - a.value);
  const taken = new Set<string>();
  const chosen: (SuggestedMatch & { value: number })[] = [];
  for (const candidate of candidates) {
    if (taken.has(candidate.from.id) || taken.has(candidate.to.id)) continue;
    taken.add(candidate.from.id);
    taken.add(candidate.to.id);
    chosen.push(candidate);
  }
  const order = new Map(orphans.map((e, i) => [e.id, i]));
  return chosen.sort((a, b) => order.get(a.from.id)! - order.get(b.from.id)!).map(({ from, to }) => ({ from, to }));
}

/** The identity of a pair, for remembering that the player declined it. */
export const pairKey = (from: Entry, to: Entry) => `${from.id}\n${to.id}`;
