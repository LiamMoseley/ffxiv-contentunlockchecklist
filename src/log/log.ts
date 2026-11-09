import { parseContentUnlockPage, type Content, type Entry, type Section, type SectionKind } from "./content";
import { pairKey, suggestMatches, type SuggestedMatch } from "./suggestions";
import { diffContent, type UpdateCheck, type UpdatePreview, type WikiSource } from "./update";
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  OPTIONAL_CHALLENGE_FILTERS,
  passesFilters,
  typeOf,
  type Filters,
} from "./filters";
import { BACKUP_FORMAT_VERSION, parseBackup, type Backup, type BackupError } from "./backup";
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
  sections: Section[];
  /** Reachable Unmarked entries the search and filters leave out. */
  hidden: number;
};

/** `content` is the bundled copy; a copy applied from the wiki and stored on the device takes its place. */
export type LogOptions = { content: Content; storage: Storage; clock: Clock; wiki: WikiSource };

/** What the player enters for a character. A blank World is the one shared World; any other must be a known World, and sets the Data Center. */
export type CharacterDetails = { name: string; world?: string; level?: number | null };

export type CharacterError = "nameRequired" | "invalidLevel" | "nameTaken" | "unknownWorld" | "notFound";

export type CharacterResult = { ok: true; character: Character } | { ok: false; error: CharacterError };

/** A backup file ready to save. */
export type BackupFile = { fileName: string; json: string };

/** What an import did: characters added, existing characters it filled in, and entries it set. */
export type ImportResult =
  | { ok: true; charactersAdded: number; charactersMerged: number; entriesAdded: number }
  | { ok: false; error: BackupError };

const MAX_LEVEL = 100;

const PROGRESS_KEY = "contentUnlockLog.progress";
const CURRENT_KEY = "contentUnlockLog.currentCharacter";
const VIEW_KEY = "contentUnlockLog.view";
const CONTENT_KEY = "contentUnlockLog.content";
const NEW_KEY = "contentUnlockLog.newEntries";
const DECLINED_KEY = "contentUnlockLog.declinedMatches";

/** The NEW notice: up to three entry names, and how many more there are. */
export type NewNotice = { names: string[]; more: number };

const NOTICE_NAMES = 3;

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

export function createLog({ content: bundled, storage, clock, wiki }: LogOptions) {
  let content = loadContent() ?? bundled;
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

  /** The copy applied from the wiki on this device, if there is a usable one. */
  function loadContent(): Content | null {
    try {
      const saved = JSON.parse(storage.read(CONTENT_KEY) ?? "null") as Content | null;
      return saved && Array.isArray(saved.sections) && Array.isArray(saved.expansions) ? saved : null;
    } catch {
      return null;
    }
  }

  /** IDs of the entries the most recently applied update added and the player has not marked as seen. Shared by every character. */
  let newIds: string[] = loadNewIds();
  /** Whether the log lists the NEW entries in place of the expansion and tab. A view choice for this visit only. */
  let showingNew = false;

  function loadNewIds(): string[] {
    try {
      const saved = JSON.parse(storage.read(NEW_KEY) ?? "[]") as unknown;
      return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : [];
    } catch {
      return [];
    }
  }

  /** The NEW entries still in the log, in the wiki's order. */
  const currentNew = (): Entry[] => {
    const ids = new Set(newIds);
    return content.sections.flatMap((s) => s.entries).filter((e) => ids.has(e.id));
  };

  const contentTypes = (): string[] => [...new Set(content.sections.flatMap((s) => s.entries).map(typeOf))];

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
    if (typeof saved.type === "string" && contentTypes().includes(saved.type)) filters.type = saved.type;
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
  const history: (
    | { characterId: string; earlier: Map<string, EntryStatus> }
    | { deletedCharacterId: string }
    | { importedCharacterIds: string[]; earlierByCharacter: Map<string, Map<string, EntryStatus>> }
  )[] = [];

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

  /** Every character that is not deleted, with all its statuses, as a backup file. */
  function exportBackup(): BackupFile {
    const exportedAt = now();
    const backup: Backup = {
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt,
      characters: characters().map((c) => ({
        name: c.name,
        world: c.world,
        dataCenter: c.dataCenter,
        level: c.level,
        updatedAt: c.updatedAt,
        statuses: { ...progress.statuses[c.id] },
      })),
    };
    return {
      fileName: `content-unlock-log-backup-${exportedAt.slice(0, 10)}.json`,
      json: JSON.stringify(backup, null, 2),
    };
  }

  /**
   * Adds a backup's progress without overwriting any: characters are matched by name and World and added
   * when missing, and only entries that are Unmarked here are filled in. One undoable change.
   */
  function importBackup(text: string): ImportResult {
    const parsed = parseBackup(text);
    if (!parsed.ok) return parsed;
    const importedCharacterIds: string[] = [];
    const earlierByCharacter = new Map<string, Map<string, EntryStatus>>();
    let charactersMerged = 0;
    let entriesAdded = 0;
    for (const incoming of parsed.backup.characters) {
      let local = characters().find((c) => sameText(c.name, incoming.name) && sameText(c.world, incoming.world));
      if (local) charactersMerged++;
      else {
        local = {
          id: crypto.randomUUID(),
          name: incoming.name.trim(),
          world: incoming.world.trim(),
          dataCenter: dataCenterOfWorld(incoming.world.trim()) ?? "",
          level:
            incoming.level !== null &&
            Number.isInteger(incoming.level) &&
            incoming.level >= 1 &&
            incoming.level <= MAX_LEVEL
              ? incoming.level
              : null,
          updatedAt: now(),
          deleted: false,
        };
        progress.characters[local.id] = local;
        importedCharacterIds.push(local.id);
      }
      const fill = new Map<string, EntryStatus>();
      for (const [entryId, record] of Object.entries(incoming.statuses)) {
        if (record.status !== "unmarked" && statusOf(local.id, entryId) === "unmarked")
          fill.set(entryId, record.status);
      }
      const { earlier } = write(local.id, fill);
      entriesAdded += earlier.size;
      if (earlier.size > 0) earlierByCharacter.set(local.id, earlier);
    }
    if (importedCharacterIds.length > 0) save();
    if (importedCharacterIds.length > 0 || earlierByCharacter.size > 0)
      history.push({ importedCharacterIds, earlierByCharacter });
    return { ok: true, charactersAdded: importedCharacterIds.length, charactersMerged, entriesAdded };
  }

  /** Whether any character that is not deleted has marked the entry. */
  function hasProgress(entry: Entry): boolean {
    return Object.values(progress.characters).some((c) => !c.deleted && statusOf(c.id, entry.id) !== "unmarked");
  }

  /** Keys of the pairs the player declined; they are never suggested again. */
  function declinedPairs(): Set<string> {
    try {
      const saved = JSON.parse(storage.read(DECLINED_KEY) ?? "[]") as unknown;
      return new Set(Array.isArray(saved) ? saved.filter((k): k is string => typeof k === "string") : []);
    } catch {
      return new Set();
    }
  }

  /** Moves every character's status from the orphan to the entry that replaces it, as one saved change. */
  function moveStatuses({ from, to }: SuggestedMatch) {
    const stamp = now();
    let moved = false;
    for (const records of Object.values(progress.statuses)) {
      const status = records[from.id]?.status ?? "unmarked";
      if (status === "unmarked" || (records[to.id]?.status ?? "unmarked") !== "unmarked") continue;
      records[to.id] = { status, updatedAt: stamp };
      records[from.id] = { status: "unmarked", updatedAt: stamp };
      moved = true;
    }
    if (moved) save();
  }

  /** Replaces the content and stores it with its revision ID. Progress is keyed by entry ID, so it is never touched. */
  function adopt(next: Content) {
    content = next;
    storage.write(CONTENT_KEY, JSON.stringify(next));
    // The remembered view may point at an expansion or type the new content no longer has.
    if (selection.expansion !== "all" && !next.expansions.some((e) => e.id === selection.expansion))
      selection = { ...selection, expansion: next.expansions[0]?.id ?? "all" };
    if (filters.type !== null && !contentTypes().includes(filters.type)) filters = { ...filters, type: null };
    saveView();
  }

  /**
   * Fetches the wiki's page and compares it with the log. Nothing is applied when there are new, changed or
   * removed entries: the player reviews the preview first. A page that changes no entry (a reworded heading,
   * reordered rows) is adopted at once, since it can't affect anything the player sees marked.
   */
  async function checkForUpdate(): Promise<UpdateCheck> {
    let next: Content;
    try {
      next = parseContentUnlockPage(await wiki.fetchPage());
    } catch {
      return { status: "unreachable" };
    }
    // A page with no sections is not the Content Unlock page (the wiki returned something else).
    if (next.sections.length === 0) return { status: "unreachable" };
    const { added, changed, removed } = diffContent(content, next);
    const suggestions = suggestMatches(removed.filter(hasProgress), added, content, next, declinedPairs());
    if (added.length + changed.length + removed.length === 0) {
      if (JSON.stringify(next) !== JSON.stringify(content)) adopt(next);
      return { status: "upToDate" };
    }
    return {
      status: "changes",
      preview: { revisionId: next.revisionId, added, changed, removed, suggestions, content: next },
    };
  }

  return {
    expansions: () => content.expansions,
    /** Fetches the wiki page and reports what would change; nothing is applied until `applyUpdate`. */
    checkForUpdate,
    /** Remembers that the player declined the suggested match, so no later update offers it again. */
    declineMatch({ from, to }: SuggestedMatch) {
      const declined = declinedPairs();
      declined.add(pairKey(from, to));
      storage.write(DECLINED_KEY, JSON.stringify([...declined]));
    },
    /**
     * Replaces the content with a previewed update. Progress is untouched except for the suggested matches the
     * player accepted, which move every character's status to the new entry; statuses of other removed entries
     * are kept as orphaned.
     */
    applyUpdate(preview: UpdatePreview, accepted: SuggestedMatch[] = []) {
      adopt(preview.content);
      const offered = new Set(preview.suggestions.map((s) => pairKey(s.from, s.to)));
      for (const match of accepted) if (offered.has(pairKey(match.from, match.to))) moveStatuses(match);
      // The entries this update added are the NEW ones; the last update's are no longer new.
      newIds = preview.added.map((e) => e.id);
      storage.write(NEW_KEY, JSON.stringify(newIds));
      showingNew = false;
    },
    /** Whether the entry was added by the most recently applied update and not yet marked as seen. */
    isNew: (entryId: string): boolean => newIds.includes(entryId),
    /** Whether the expansion has NEW entries, for its tile's marker. */
    expansionHasNew: (expansionId: string): boolean =>
      content.sections.some((s) => s.expansionId === expansionId && s.entries.some((e) => newIds.includes(e.id))),
    /** What the notice above Filters says, or null when there are no NEW entries to see. */
    newNotice(): NewNotice | null {
      const entries = currentNew();
      if (entries.length === 0) return null;
      return {
        names: entries.slice(0, NOTICE_NAMES).map((e) => e.unlock.replaceAll("\n", " ")),
        more: Math.max(0, entries.length - NOTICE_NAMES),
      };
    },
    /** Whether the log lists the NEW entries from every expansion in place of the expansion and tab. */
    viewingNew: (): boolean => showingNew,
    /** Lists the NEW entries across all expansions. Does nothing when there are none. */
    showNewEntries() {
      showingNew = currentNew().length > 0;
    },
    /** Returns to the expansion and tab view. The NEW tags stay. */
    showAllEntries() {
      showingNew = false;
    },
    /** The NEW entries that pass the search and filters, grouped by section, empty sections left out. */
    newEntries(): Section[] {
      const shown = new Set(
        currentNew()
          .filter((e) => passesFilters(e, entryStatus(e.id), filters))
          .map((e) => e.id),
      );
      return content.sections.flatMap((section) => {
        const entries = section.entries.filter((e) => shown.has(e.id));
        return entries.length > 0 ? [{ ...section, entries }] : [];
      });
    },
    /** Clears every NEW tag and marker at once and ends the Show view. Returns how many entries it cleared. */
    markNewSeen(): number {
      const cleared = currentNew().length;
      showingNew = false;
      if (newIds.length > 0) {
        newIds = [];
        storage.write(NEW_KEY, JSON.stringify(newIds));
      }
      return cleared;
    },
    /** The wiki revision the log's content comes from. */
    revisionId: () => content.revisionId,
    /** Saves every character as one backup file (format version 1); deleted characters are left out. */
    exportBackup,
    /** Merges a backup file's text into this device's progress, adding only; undoable. */
    importBackup,
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
      showingNew = false;
      saveView();
    },
    /** What currently narrows the log. Everything but the search is remembered on the device. */
    filters: (): Filters => ({ ...filters }),
    setFilters(next: Partial<Filters>) {
      // A type or optional challenge choice that doesn't exist is ignored, as when restoring a saved view.
      const valid =
        (next.type === undefined || next.type === null || contentTypes().includes(next.type)) &&
        (next.optionalChallenge === undefined || OPTIONAL_CHALLENGE_FILTERS.includes(next.optionalChallenge));
      if (!valid) return;
      filters = { ...filters, ...next };
      saveView();
    },
    /** How many filters are narrowing the log right now. */
    activeFilterCount: ({ availableNow = false } = {}): number =>
      // Available now lists only Unmarked entries, so it always hides Completed and Not interested ones.
      activeFilterCount(availableNow ? { ...filters, hideCompleted: true, hideNotInterested: true } : filters),
    /** Every content type with its number of entries, most common first. */
    typeCounts: (): { type: string; count: number }[] =>
      contentTypes()
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
     * expansion's level cap. A character with no level gets `level: null` and nothing. The search and filters
     * apply; `hidden` counts the reachable entries they leave out.
     */
    availableNow(): Available {
      const level = currentCharacter().level;
      if (level === null) return { level, sections: [], hidden: 0 };
      let hidden = 0;
      const sections = content.sections.flatMap((section) => {
        const expansion = content.expansions.find((e) => e.id === section.expansionId);
        if (!expansion) throw new Error(`No expansion ${section.expansionId}`);
        const cap = expansion.levelCap;
        const reachable = (entry: Entry) =>
          section.kind === "levelCap" ? level >= cap : level >= parseInt(entry.level, 10);
        const reached = section.entries.filter((e) => reachable(e) && entryStatus(e.id) === "unmarked");
        const entries = reached.filter((e) => passesFilters(e, "unmarked", filters));
        hidden += reached.length - entries.length;
        return entries.length > 0 ? [{ ...section, entries }] : [];
      });
      return { level, sections, hidden };
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
      if ("importedCharacterIds" in latest) {
        for (const [characterId, earlier] of latest.earlierByCharacter) write(characterId, earlier);
        for (const id of latest.importedCharacterIds)
          progress.characters[id] = { ...progress.characters[id], deleted: true, updatedAt: now() };
        save();
        return true;
      }
      write(latest.characterId, latest.earlier);
      return true;
    },
  };
}

export type Log = ReturnType<typeof createLog>;
