import type { Content, Entry, Section, SectionKind } from "./content";
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  OPTIONAL_CHALLENGE_FILTERS,
  passesFilters,
  typeOf,
  type Filters,
} from "./filters";
import { dataCenterOfWorld, knownWorld, WORLDS } from "./worlds";
import { characterLabel, newProgress, type Character, type EntryStatus, type Progress } from "./progress";

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

/** The entries available now, grouped by the section they belong to; `level` is null when the character has none. */
export type Available = {
  level: number | null;
  sections: { id: string; expansionId: string; kind: SectionKind; entries: Entry[] }[];
};

export type LogOptions = { content: Content; storage: Storage; clock: Clock };

/** What the player enters for a character. A blank World is the one shared World; any other must be a known World, and sets the Data Center. */
export type CharacterDetails = { name: string; world?: string; level?: number | null };

export type CharacterError = "nameRequired" | "invalidLevel" | "nameTaken" | "unknownWorld" | "notFound";

export type CharacterResult = { ok: true; character: Character } | { ok: false; error: CharacterError };

const MAX_LEVEL = 100;

const PROGRESS_KEY = "contentUnlockLog.progress";
const CURRENT_KEY = "contentUnlockLog.currentCharacter";
const VIEW_KEY = "contentUnlockLog.view";

/** Which expansion (or "all") and section tab the player is looking at. */
export type Selection = { expansion: string; tab: SectionKind | "all" };

const TABS: Selection["tab"][] = ["levelling", "levelCap", "all"];

/** The device's remembered view: the selection and the filters, apart from the search text. */
type StoredView = Selection & Omit<Filters, "search">;

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

  const contentTypes = [...new Set(content.sections.flatMap((s) => s.entries).map(typeOf))];

  let selection: Selection = { expansion: content.expansions[0]?.id ?? "all", tab: "levelling" };
  let filters: Filters = { ...DEFAULT_FILTERS };
  restoreView();

  /** Reads the remembered view, keeping each saved value that is still valid and the default for the rest. */
  function restoreView() {
    let saved: Partial<StoredView> = {};
    try {
      saved = JSON.parse(storage.read(VIEW_KEY) ?? "{}") ?? {};
    } catch {
      return;
    }
    if (saved.expansion === "all" || content.expansions.some((e) => e.id === saved.expansion))
      selection.expansion = saved.expansion!;
    if (saved.tab && TABS.includes(saved.tab)) selection.tab = saved.tab;
    if (typeof saved.type === "string" && contentTypes.includes(saved.type)) filters.type = saved.type;
    if (saved.optionalChallenge && OPTIONAL_CHALLENGE_FILTERS.includes(saved.optionalChallenge))
      filters.optionalChallenge = saved.optionalChallenge;
    if (typeof saved.hideCompleted === "boolean") filters.hideCompleted = saved.hideCompleted;
    if (typeof saved.hideNotInterested === "boolean") filters.hideNotInterested = saved.hideNotInterested;
  }

  function saveView() {
    const stored: StoredView = {
      ...selection,
      type: filters.type,
      optionalChallenge: filters.optionalChallenge,
      hideCompleted: filters.hideCompleted,
      hideNotInterested: filters.hideNotInterested,
    };
    storage.write(VIEW_KEY, JSON.stringify(stored));
  }

  const characters = (): Character[] => Object.values(progress.characters).filter((c) => !c.deleted);
  /** The character the player chose, remembered on the device; the first one if that is missing or deleted. */
  let currentId = storage.read(CURRENT_KEY);
  const currentCharacter = (): Character => {
    const chosen = currentId ? progress.characters[currentId] : undefined;
    return chosen && !chosen.deleted ? chosen : characters()[0];
  };

  function switchCharacter(id: string): boolean {
    const target = progress.characters[id];
    if (!target || target.deleted) return false;
    currentId = id;
    storage.write(CURRENT_KEY, id);
    return true;
  }

  function editCharacter(id: string, details: CharacterDetails): CharacterResult {
    const existing = progress.characters[id];
    if (!existing || existing.deleted) return { ok: false, error: "notFound" };
    const checked = validate(details, id);
    if (!checked.ok) return checked;
    const character: Character = { ...existing, ...checked.details, updatedAt: now() };
    progress.characters[id] = character;
    save();
    return { ok: true, character };
  }

  const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  /** Another character already has this name on this World (a blank World is one shared World). */
  const isTaken = (name: string, world: string, ignoreId?: string) =>
    characters().some((c) => c.id !== ignoreId && sameText(c.name, name) && sameText(c.world, world));

  /** Checks details and fills in the Data Center of a known World left blank; `ignoreId` is the character being edited. */
  function validate(
    details: CharacterDetails,
    ignoreId?: string,
  ): { ok: true; details: Required<CharacterDetails> & { dataCenter: string } } | { ok: false; error: CharacterError } {
    const name = details.name.trim();
    const typedWorld = (details.world ?? "").trim();
    const world = typedWorld === "" ? "" : knownWorld(typedWorld);
    const level = details.level ?? null;
    if (!name) return { ok: false, error: "nameRequired" };
    if (world === null) return { ok: false, error: "unknownWorld" };
    if (level !== null && (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL))
      return { ok: false, error: "invalidLevel" };
    if (isTaken(name, world, ignoreId)) return { ok: false, error: "nameTaken" };
    return { ok: true, details: { name, world, dataCenter: dataCenterOfWorld(world) ?? "", level } };
  }

  function addCharacter(details: CharacterDetails): CharacterResult {
    const checked = validate(details);
    if (!checked.ok) return checked;
    const character: Character = { id: crypto.randomUUID(), ...checked.details, updatedAt: now(), deleted: false };
    progress.characters[character.id] = character;
    save();
    return { ok: true, character };
  }

  const statusOf = (characterId: string, entryId: string): EntryStatus =>
    progress.statuses[characterId]?.[entryId]?.status ?? "unmarked";
  const entryStatus = (entryId: string): EntryStatus => statusOf(currentCharacter().id, entryId);

  /** Completed entries out of all entries in the sections for a character (the current one by default), both leaving Not interested entries out. */
  const progressOf = (sections: Section[], characterId = currentCharacter().id): ProgressCount => {
    const counted = sections
      .flatMap((s) => s.entries)
      .map((e) => statusOf(characterId, e.id))
      .filter((s) => s !== "notInterested");
    return { completed: counted.filter((s) => s === "completed").length, total: counted.length };
  };

  /** Earlier statuses of the entries each change touched, newest last. In memory only. */
  const history: ({ characterId: string; earlier: Map<string, EntryStatus> } | { deletedCharacterId: string })[] = [];

  /**
   * Writes the given statuses for the character as one change, skipping entries already at that status.
   * Returns the earlier statuses of the entries it changed, and the sections it finished.
   */
  function write(
    characterId: string,
    next: Map<string, EntryStatus>,
  ): ChangeResult & { earlier: Map<string, EntryStatus> } {
    const finishedBefore = new Set(content.sections.filter((s) => isFinished(s, characterId)).map((s) => s.id));
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
    const sectionsFinished = content.sections
      .filter((s) => !finishedBefore.has(s.id) && isFinished(s, characterId))
      .map((s) => s.id);
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
  function isFinished(section: Section, characterId: string): boolean {
    const { completed, total } = progressOf([section], characterId);
    return total > 0 && completed === total;
  }

  function setEntryStatus(entryId: string, status: EntryStatus): ChangeResult {
    return change(new Map([[entryId, status]]));
  }

  /** Sets every entry the current character has marked back to Unmarked, orphaned statuses included. */
  function resetCharacter(): ChangeResult {
    const records = progress.statuses[currentCharacter().id] ?? {};
    return change(new Map(Object.keys(records).map((entryId) => [entryId, "unmarked"])));
  }

  /** Marks the character deleted, keeping its record and progress so a device that was offline can't bring it back. */
  function deleteCharacter(id: string): { ok: true } | { ok: false; error: "notFound" | "lastCharacter" } {
    const target = progress.characters[id];
    if (!target || target.deleted) return { ok: false, error: "notFound" };
    if (characters().length === 1) return { ok: false, error: "lastCharacter" };
    progress.characters[id] = { ...target, deleted: true, updatedAt: now() };
    save();
    history.push({ deletedCharacterId: id });
    return { ok: true };
  }

  /** Brings a deleted character back as a new change, unless another has taken its name and World since. */
  function restoreCharacter(id: string): boolean {
    const target = progress.characters[id];
    if (isTaken(target.name, target.world)) return false;
    progress.characters[id] = { ...target, deleted: false, updatedAt: now() };
    save();
    switchCharacter(id);
    return true;
  }

  return {
    expansions: () => content.expansions,
    sections: () => content.sections,
    characters,
    currentCharacter,
    addCharacter,
    editCharacter,
    switchCharacter,
    /** Clears the current character's progress only; undoable. */
    resetCharacter,
    /** Deletes a character unless it is the last one; undoable. */
    deleteCharacter,
    /** Progress across every section of the log for one character, for the character list. */
    characterProgress: (characterId: string): ProgressCount => progressOf(content.sections, characterId),
    characterLabel,
    dataCenterOf: dataCenterOfWorld,
    worlds: () => WORLDS,
    entryStatus,
    /** The expansion and tab the player last chose, remembered on the device. */
    selection: (): Selection => ({ ...selection }),
    setSelection(next: Partial<Selection>) {
      const valid =
        (next.expansion === undefined ||
          next.expansion === "all" ||
          content.expansions.some((e) => e.id === next.expansion)) &&
        (next.tab === undefined || TABS.includes(next.tab));
      if (!valid) return;
      selection = { ...selection, ...next };
      saveView();
    },
    /** What currently narrows the log. Everything but the search is remembered on the device. */
    filters: (): Filters => ({ ...filters }),
    setFilters(next: Partial<Filters>) {
      // A type or optional challenge choice that doesn't exist is ignored, as when restoring a saved view.
      const valid =
        (next.type === undefined || next.type === null || contentTypes.includes(next.type)) &&
        (next.optionalChallenge === undefined || OPTIONAL_CHALLENGE_FILTERS.includes(next.optionalChallenge));
      if (!valid) return;
      filters = { ...filters, ...next };
      saveView();
    },
    /** How many filters are narrowing the log right now. */
    activeFilterCount: (): number => activeFilterCount(filters),
    /** Every content type with its number of entries, most common first. */
    typeCounts: (): { type: string; count: number }[] =>
      contentTypes
        .map((type) => ({
          type,
          count: content.sections.flatMap((s) => s.entries).filter((e) => typeOf(e) === type).length,
        }))
        .sort((a, b) => b.count - a.count),
    /** The section's entries that pass the current search and filters, in the wiki's order. */
    shownEntries(sectionId: string): Entry[] {
      const section = content.sections.find((s) => s.id === sectionId);
      if (!section) throw new Error(`No section ${sectionId}`);
      return section.entries.filter((e) => passesFilters(e, entryStatus(e.id), filters));
    },
    /**
     * Everything the current character can reach now and has not marked: levelling entries at or below
     * their level (a range such as "56-60" by its lower bound), and level-cap entries once they have the
     * expansion's level cap. A character with no level gets `level: null` and nothing. Ignores search and filters.
     */
    availableNow(): Available {
      const level = currentCharacter().level;
      if (level === null) return { level, sections: [] };
      const sections = content.sections.flatMap((section) => {
        const cap = content.expansions.find((e) => e.id === section.expansionId)?.levelCap ?? Infinity;
        const reachable = (entry: Entry) =>
          section.kind === "levelCap" ? level >= cap : level >= parseInt(entry.level, 10);
        const entries = section.entries.filter((e) => reachable(e) && entryStatus(e.id) === "unmarked");
        return entries.length > 0
          ? [{ id: section.id, expansionId: section.expansionId, kind: section.kind, entries }]
          : [];
      });
      return { level, sections };
    },
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
      if ("deletedCharacterId" in latest) return restoreCharacter(latest.deletedCharacterId);
      write(latest.characterId, latest.earlier);
      return true;
    },
  };
}

export type Log = ReturnType<typeof createLog>;
