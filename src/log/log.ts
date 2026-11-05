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

/** What a command changed: how many entries, and the IDs of sections it brought to fully Completed. */
export type ChangeResult = { changed: number; sectionsFinished: string[] };

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

  /** Earlier statuses of the entries each change touched, newest last. In memory only. */
  const history: { characterId: string; earlier: Map<string, EntryStatus> }[] = [];

  /**
   * Writes the given statuses for the character as one change, skipping entries already at that status.
   * Returns the earlier statuses of the entries it changed, and the sections it finished.
   */
  function write(characterId: string, next: Map<string, EntryStatus>): ChangeResult & { earlier: Map<string, EntryStatus> } {
    const finishedBefore = new Set(content.sections.filter((s) => isFinished(s)).map((s) => s.id));
    const earlier = new Map<string, EntryStatus>();
    const stamp = now();
    const records = { ...progress.statuses[characterId] };
    for (const [entryId, status] of next) {
      const before = records[entryId]?.status ?? "unmarked";
      if (before === status) continue;
      earlier.set(entryId, before);
      records[entryId] = { status, updatedAt: stamp };
    }
    if (earlier.size > 0) {
      progress.statuses[characterId] = records;
      save();
    }
    const sectionsFinished = content.sections.filter((s) => !finishedBefore.has(s.id) && isFinished(s)).map((s) => s.id);
    return { changed: earlier.size, sectionsFinished, earlier };
  }

  /** A change the player can undo: every command that changes statuses goes through here. */
  function change(next: Map<string, EntryStatus>): ChangeResult {
    const characterId = currentCharacter().id;
    const { earlier, ...result } = write(characterId, next);
    if (earlier.size > 0) history.push({ characterId, earlier });
    return result;
  }

  /** Every entry of the section that is wanted is Completed, and at least one is. */
  function isFinished(section: Section): boolean {
    const { completed, total } = progressOf([section]);
    return total > 0 && completed === total;
  }

  function setEntryStatus(entryId: string, status: EntryStatus): ChangeResult {
    return change(new Map([[entryId, status]]));
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
    cycleEntryStatus(entryId: string): ChangeResult {
      return setEntryStatus(entryId, NEXT_STATUS[entryStatus(entryId)]);
    },
    setEntryStatus,
    /** How many of the shown entries Complete Shown would change: those neither Completed nor Not interested. */
    completeShownCount: (entryIds: string[]): number => entryIds.filter((id) => entryStatus(id) === "unmarked").length,
    completeShown: (entryIds: string[]): ChangeResult =>
      change(new Map(entryIds.filter((id) => entryStatus(id) !== "notInterested").map((id) => [id, "completed"]))),
    /** How many of the shown entries Clear Shown would change: those not already Unmarked. */
    clearShownCount: (entryIds: string[]): number => entryIds.filter((id) => entryStatus(id) !== "unmarked").length,
    clearShown: (entryIds: string[]): ChangeResult => change(new Map(entryIds.map((id) => [id, "unmarked"]))),
    canUndo: () => history.length > 0,
    /**
     * Writes the statuses before the latest change back, as a new change with a fresh timestamp.
     * Returns whether there was anything to undo.
     */
    undo(): boolean {
      const latest = history.pop();
      if (!latest) return false;
      write(latest.characterId, latest.earlier);
      return true;
    },
  };
}

export type Log = ReturnType<typeof createLog>;
