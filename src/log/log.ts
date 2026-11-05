import type { Content, Section } from "./content";
import { newProgress, type Character, type EntryStatus, type Progress } from "./progress";

/** Storage adapter: persists strings by key. Browser storage in the app, in-memory in tests. */
export type Storage = {
  read(key: string): string | null;
  write(key: string, value: string): void;
};

/** Clock adapter: supplies timestamps. Fixed in tests. */
export type Clock = { now(): Date };

/** Completed entries out of the entries counted; Not interested entries are in neither number. */
export type ProgressCount = { completed: number; total: number };

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

  /** Completed entries out of all entries in the sections, both leaving Not interested entries out. */
  const progressOf = (sections: Section[]): ProgressCount => {
    const counted = sections
      .flatMap((s) => s.entries)
      .map((e) => entryStatus(e.id))
      .filter((s) => s !== "notInterested");
    return { completed: counted.filter((s) => s === "completed").length, total: counted.length };
  };

  function setEntryStatus(entryId: string, status: EntryStatus) {
    const characterId = currentCharacter().id;
    progress.statuses[characterId] = {
      ...progress.statuses[characterId],
      [entryId]: { status, updatedAt: now() },
    };
    save();
  }

  return {
    expansions: () => content.expansions,
    sections: () => content.sections,
    characters,
    currentCharacter,
    entryStatus,
    sectionProgress(sectionId: string): ProgressCount {
      const section = content.sections.find((s) => s.id === sectionId);
      if (!section) throw new Error(`No section ${sectionId}`);
      return progressOf([section]);
    },
    /** Progress across both of the expansion's sections. */
    expansionProgress(expansionId: string): ProgressCount {
      if (!content.expansions.some((e) => e.id === expansionId)) throw new Error(`No expansion ${expansionId}`);
      return progressOf(content.sections.filter((s) => s.expansionId === expansionId));
    },
    /** Progress across every section of the log. */
    overallProgress: (): ProgressCount => progressOf(content.sections),
    cycleEntryStatus(entryId: string) {
      setEntryStatus(entryId, NEXT_STATUS[entryStatus(entryId)]);
    },
    setEntryStatus,
  };
}

export type Log = ReturnType<typeof createLog>;
