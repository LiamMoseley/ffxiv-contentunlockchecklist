import type { Content } from "./content";
import { newProgress, type Character, type EntryStatus, type Progress } from "./progress";

/** Storage adapter: persists strings by key. Browser storage in the app, in-memory in tests. */
export type Storage = {
  read(key: string): string | null;
  write(key: string, value: string): void;
};

/** Clock adapter: supplies timestamps. Fixed in tests. */
export type Clock = { now(): Date };

export type LogOptions = { content: Content; storage: Storage; clock: Clock };

const PROGRESS_KEY = "contentUnlockLog.progress";

const NEXT_STATUS: Record<EntryStatus, EntryStatus> = {
  unmarked: "completed",
  completed: "notInterested",
  notInterested: "unmarked",
};

export function createLog({ content, storage, clock }: LogOptions) {
  const now = () => clock.now().toISOString();
  const progress = loadProgress() ?? newProgress(crypto.randomUUID(), now());
  save();

  function loadProgress(): Progress | null {
    const saved = storage.read(PROGRESS_KEY);
    return saved ? (JSON.parse(saved) as Progress) : null;
  }

  function save() {
    storage.write(PROGRESS_KEY, JSON.stringify(progress));
  }

  const characters = (): Character[] => Object.values(progress.characters).filter((c) => !c.deleted);
  const currentCharacter = (): Character => characters()[0];

  const entryStatus = (entryId: string): EntryStatus =>
    progress.statuses[currentCharacter().id]?.[entryId]?.status ?? "unmarked";

  return {
    expansions: () => content.expansions,
    sections: () => content.sections,
    characters,
    currentCharacter,
    entryStatus,
    /** Completed entries out of all entries, both leaving Not interested entries out. */
    sectionProgress(sectionId: string): { completed: number; total: number } {
      const section = content.sections.find((s) => s.id === sectionId);
      if (!section) throw new Error(`No section ${sectionId}`);
      const counted = section.entries.map((e) => entryStatus(e.id)).filter((s) => s !== "notInterested");
      return { completed: counted.filter((s) => s === "completed").length, total: counted.length };
    },
    cycleEntryStatus(entryId: string) {
      const characterId = currentCharacter().id;
      progress.statuses[characterId] = {
        ...progress.statuses[characterId],
        [entryId]: { status: NEXT_STATUS[entryStatus(entryId)], updatedAt: now() },
      };
      save();
    },
  };
}

export type Log = ReturnType<typeof createLog>;
