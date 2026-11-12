import {
  entryCount,
  entryName,
  parseContentUnlockPage,
  type Content,
  type Entry,
  type Section,
  type SectionKind,
} from "./content";
import { iconsUsed } from "./icons";
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

/**
 * What a command changed: how many entries, the IDs of sections it brought to fully Completed, and the IDs
 * of expansions it took to 100% (as the progress bar counts it; an expansion with nothing counted never is).
 */
export type ChangeResult = { changed: number; sectionsFinished: string[]; expansionsCompleted: string[] };

/** The entries available now, grouped by the section they belong to; `level` is null when the character has none. */
export type Available = {
  level: number | null;
  sections: Section[];
  /** Reachable Unmarked entries the search and filters leave out. */
  filteredOut: number;
};

/** Which view is open: the expansion and tab sections, every NEW entry, or what is available now. */
export type LogView = "sections" | "new" | "available";

/**
 * What the open view lists: its sections with the entries that pass the search and filters. The sections view
 * keeps a section whose entries are all filtered out (so the UI can say so); the other views leave it out.
 * `level` and `filteredOut` are Available now's: the character's level (null with none) and the reachable entries
 * the search and filters leave out. They are null and 0 in the other views.
 */
export type Listing = { view: LogView; sections: Section[]; level: number | null; filteredOut: number };

/** `content` is the bundled copy; a copy applied from the wiki and stored on the device takes its place. */
export type LogOptions = { content: Content; storage: Storage; clock: Clock; wiki: WikiSource };

/** What the player enters for a character. A blank World is the one shared World; any other must be a known World, and sets the Data Center. */
export type CharacterDetails = { name: string; world?: string; level?: number | null };

export type CharacterError = "nameRequired" | "invalidLevel" | "nameTaken" | "unknownWorld" | "notFound";

export type CharacterResult = { ok: true; character: Character } | { ok: false; error: CharacterError };

/** A backup file ready to save. */
export type BackupFile = { fileName: string; json: string };

/** What an import did: characters added, existing characters it filled in, entries it set, and the message to show. */
export type ImportResult =
  | { ok: true; charactersAdded: number; charactersMerged: number; entriesAdded: number; message: string }
  | { ok: false; error: BackupError };

/** The highest level a character can have. */
export const MAX_LEVEL = 100;

/** Whether a level is a whole number the game allows. */
const isLevel = (level: number): boolean => Number.isInteger(level) && level >= 1 && level <= MAX_LEVEL;

/** The one World rule, for adding, editing and importing: blank stays blank, a known World is normalised, any other is null. */
function acceptedWorld(typed: string): string | null {
  const world = typed.trim();
  return world === "" ? "" : knownWorld(world);
}

const PROGRESS_KEY = "contentUnlockLog.progress";
const CURRENT_KEY = "contentUnlockLog.currentCharacter";
const VIEW_KEY = "contentUnlockLog.view";
const CONTENT_KEY = "contentUnlockLog.content";
const NEW_KEY = "contentUnlockLog.newEntries";
const DECLINED_KEY = "contentUnlockLog.declinedMatches";
const LAST_CHECK_KEY = "contentUnlockLog.lastUpdateCheck";
const DISMISSED_KEY = "contentUnlockLog.dismissedRevision";
const OFFERED_KEY = "contentUnlockLog.offeredUpdate";

/** The automatic check looks at the wiki at most this often. */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** The NEW notice: up to three entry names, and how many more there are. */
export type NewNotice = { names: string[]; more: number };

const NOTICE_NAMES = 3;

/** Which expansion (or "all") and section tab the player is looking at. */
export type Selection = { expansion: string; tab: SectionKind | "all" };

const TABS: Selection["tab"][] = ["levelling", "levelCap", "all"];

/** The device's remembered view: the selection and the filters, apart from the search text. */
type StoredView = Selection & Omit<Filters, "search"> & { railCollapsed: boolean };

const NEXT_STATUS: Record<EntryStatus, EntryStatus> = {
  unmarked: "completed",
  completed: "notInterested",
  notInterested: "unmarked",
};

export function createLog({ content: bundled, storage, clock, wiki }: LogOptions) {
  // A device keeps whichever copy has the higher revision (ADR-0002): its own stored copy, unless it has none.
  // A bundled copy newer than the stored one is offered for review further down, never applied silently.
  const stored = loadContentAt(CONTENT_KEY);
  let content = stored ?? bundled;
  const bundledIcons = new Set(iconsUsed(bundled));
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

  /** The JSON stored under a key; null when there is none or it does not parse. */
  function loadJson(key: string): unknown {
    try {
      return JSON.parse(storage.read(key) ?? "null");
    } catch {
      return null;
    }
  }

  /** The strings in a stored list; anything else in it, or a stored value that is no list, counts for nothing. */
  function loadStrings(key: string): string[] {
    const saved = loadJson(key);
    return Array.isArray(saved) ? saved.filter((item): item is string => typeof item === "string") : [];
  }

  /** The content stored under a key, if there is a usable copy: the one applied from the wiki, or the one held for review. */
  function loadContentAt(key: string): Content | null {
    const saved = loadJson(key) as Content | null;
    return saved && Array.isArray(saved.sections) && Array.isArray(saved.expansions) ? saved : null;
  }

  /** Finds a section of the current content, or throws. */
  function sectionOrThrow(sectionId: string): Section {
    const section = content.sections.find((s) => s.id === sectionId);
    if (!section) throw new Error(`No section ${sectionId}`);
    return section;
  }

  /** Finds an expansion of the current content, or throws. */
  function expansionOrThrow(expansionId: string) {
    const expansion = content.expansions.find((e) => e.id === expansionId);
    if (!expansion) throw new Error(`No expansion ${expansionId}`);
    return expansion;
  }

  /** IDs of the entries the most recently applied update added and the player has not marked as seen. Shared by every character. */
  let newIds: string[] = loadStrings(NEW_KEY);
  /** Which view is open; only one is at a time. A view choice for this visit only. */
  let openView: LogView = "sections";

  /** The NEW entries still in the log, in the wiki's order. */
  const currentNew = (): Entry[] => {
    const ids = new Set(newIds);
    return content.sections.flatMap((s) => s.entries).filter((e) => ids.has(e.id));
  };

  /** The NEW entries that pass the search and filters, grouped by section, empty sections left out. */
  function newSections(): Section[] {
    const shown = new Set(
      currentNew()
        .filter((e) => passesFilters(e, entryStatus(e.id), filters))
        .map((e) => e.id),
    );
    return content.sections.flatMap((section) => {
      const entries = section.entries.filter((e) => shown.has(e.id));
      return entries.length > 0 ? [{ ...section, entries }] : [];
    });
  }

  /**
   * Everything the current character can reach now and has not marked: levelling entries at or below
   * their level (a range such as "56-60" by its lower bound), and level-cap entries once they have the
   * expansion's level cap. A character with no level gets `level: null` and nothing. The search and filters
   * apply; `filteredOut` counts the reachable entries they leave out.
   */
  function availableNow(): Available {
    const level = currentCharacter().level;
    if (level === null) return { level, sections: [], filteredOut: 0 };
    let filteredOut = 0;
    const sections = content.sections.flatMap((section) => {
      const cap = expansionOrThrow(section.expansionId).levelCap;
      const reachable = (entry: Entry) =>
        section.kind === "levelCap" ? level >= cap : level >= parseInt(entry.level, 10);
      const reached = section.entries.filter((e) => reachable(e) && entryStatus(e.id) === "unmarked");
      const entries = reached.filter((e) => passesFilters(e, "unmarked", filters));
      filteredOut += reached.length - entries.length;
      return entries.length > 0 ? [{ ...section, entries }] : [];
    });
    return { level, sections, filteredOut };
  }

  function listing(): Listing {
    if (openView === "new") return { view: openView, sections: newSections(), level: null, filteredOut: 0 };
    if (openView === "available") return { view: openView, ...availableNow() };
    const { expansion, tab } = selection;
    const chosen = content.sections.filter(
      (s) => expansion === "all" || (s.expansionId === expansion && (tab === "all" || s.kind === tab)),
    );
    const sections = chosen.map((s) => ({
      ...s,
      entries: s.entries.filter((e) => passesFilters(e, entryStatus(e.id), filters)),
    }));
    return { view: openView, sections, level: null, filteredOut: 0 };
  }

  /** The IDs of the entries the open view lists, which Complete Shown and Clear Shown act on. */
  const shownIds = (): string[] => listing().sections.flatMap((s) => s.entries.map((e) => e.id));

  /** Ending the NEW view returns to the sections; another open view is left alone. */
  function endNewView() {
    if (openView === "new") openView = "sections";
  }

  const contentTypes = (): string[] => [...new Set(content.sections.flatMap((s) => s.entries).map(typeOf))];

  let selection: Selection = { expansion: content.expansions[0]?.id ?? "all", tab: "levelling" };
  let filters: Filters = { ...DEFAULT_FILTERS };
  /** Whether the tile column is collapsed; remembered on the device with the view. */
  let railCollapsed = false;
  restoreView();

  /** Reads the remembered view, keeping each saved value that is still valid and the default for the rest. */
  function restoreView() {
    const saved = (loadJson(VIEW_KEY) ?? {}) as Partial<StoredView>;
    if (saved.expansion === "all" || content.expansions.some((e) => e.id === saved.expansion))
      selection.expansion = saved.expansion!;
    if (saved.tab && TABS.includes(saved.tab)) selection.tab = saved.tab;
    if (typeof saved.type === "string" && contentTypes().includes(saved.type)) filters.type = saved.type;
    if (saved.optionalChallenge && OPTIONAL_CHALLENGE_FILTERS.includes(saved.optionalChallenge))
      filters.optionalChallenge = saved.optionalChallenge;
    if (typeof saved.hideCompleted === "boolean") filters.hideCompleted = saved.hideCompleted;
    if (typeof saved.hideNotInterested === "boolean") filters.hideNotInterested = saved.hideNotInterested;
    if (typeof saved.railCollapsed === "boolean") railCollapsed = saved.railCollapsed;
  }

  function saveView() {
    const stored: StoredView = {
      ...selection,
      type: filters.type,
      optionalChallenge: filters.optionalChallenge,
      hideCompleted: filters.hideCompleted,
      hideNotInterested: filters.hideNotInterested,
      railCollapsed,
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
    const world = acceptedWorld(details.world ?? "");
    const level = details.level ?? null;
    if (!name) return { ok: false, error: "nameRequired" };
    if (world === null) return { ok: false, error: "unknownWorld" };
    if (level !== null && !isLevel(level)) return { ok: false, error: "invalidLevel" };
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
    const completeBefore = new Set(completeExpansions(characterId));
    const earlier = new Map<string, EntryStatus>();
    const stamp = now();
    const records = { ...progress.statuses[characterId] };
    for (const [entryId, status] of next) {
      const before = statusOf(characterId, entryId);
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
    const expansionsCompleted = completeExpansions(characterId).filter((id) => !completeBefore.has(id));
    return { changed: earlier.size, sectionsFinished, expansionsCompleted, earlier };
  }

  /** The IDs of the expansions whose counted entries are all Completed, and at least one is counted. */
  function completeExpansions(characterId: string): string[] {
    return content.expansions
      .filter((expansion) => {
        const { completed, total } = progressOf(
          content.sections.filter((s) => s.expansionId === expansion.id),
          characterId,
        );
        return total > 0 && completed === total;
      })
      .map((expansion) => expansion.id);
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
    // Checked first so a refusal changes nothing.
    if (parsed.backup.characters.some((c) => acceptedWorld(c.world) === null))
      return { ok: false, error: "unknownWorld" };
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
          world: acceptedWorld(incoming.world) ?? "",
          dataCenter: dataCenterOfWorld(acceptedWorld(incoming.world) ?? "") ?? "",
          level: incoming.level !== null && isLevel(incoming.level) ? incoming.level : null,
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
    const charactersAdded = importedCharacterIds.length;
    const message =
      charactersAdded === 0 && entriesAdded === 0
        ? "Nothing to import: this device already has everything in that backup."
        : `Imported ${entryCount(entriesAdded)}: ${charactersAdded} character${charactersAdded === 1 ? "" : "s"} added, ${charactersMerged} filled in. Undo to revert.`;
    return { ok: true, charactersAdded, charactersMerged, entriesAdded, message };
  }

  /** Whether any character that is not deleted has marked the entry. */
  function hasProgress(entry: Entry): boolean {
    return Object.values(progress.characters).some((c) => !c.deleted && statusOf(c.id, entry.id) !== "unmarked");
  }

  /** Keys of the pairs the player declined; they are never suggested again. */
  const declinedPairs = (): Set<string> => new Set(loadStrings(DECLINED_KEY));

  /** Moves every character's status from the orphan to the entry that replaces it, as one saved change. */
  function moveStatuses({ from, to }: SuggestedMatch) {
    const stamp = now();
    let moved = false;
    for (const [characterId, records] of Object.entries(progress.statuses)) {
      const status = statusOf(characterId, from.id);
      if (status === "unmarked" || statusOf(characterId, to.id) !== "unmarked") continue;
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
    return compareWith(next);
  }

  /** What `next` would change in the log; a copy that changes no entry is adopted at once. */
  function compareWith(next: Content): UpdateCheck {
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

  /** The update the notice offers, held until the player applies or dismisses it. Not stored: it is rebuilt on each visit. */
  let offered: UpdatePreview | null = null;
  let dismissedRevision = loadDismissedRevision();

  function loadDismissedRevision(): number {
    const saved = Number(storage.read(DISMISSED_KEY));
    return Number.isFinite(saved) ? saved : 0;
  }

  /** The update the notice offers: newer than the log's content and not dismissed. */
  function updateNotice(): UpdatePreview | null {
    return offered && offered.revisionId > content.revisionId && offered.revisionId > dismissedRevision
      ? offered
      : null;
  }

  function recordCheck() {
    storage.write(LAST_CHECK_KEY, now());
  }

  /** Whether the last check was recent enough to skip this one; a last check in the future (clock changed) is not. */
  function checkedRecently(): boolean {
    const last = Date.parse(storage.read(LAST_CHECK_KEY) ?? "");
    const elapsed = clock.now().getTime() - last;
    return elapsed >= 0 && elapsed <= CHECK_INTERVAL_MS;
  }

  /**
   * The check made when the app opens. Skipped within 6 hours of the last one. It asks the wiki only for its
   * revision ID, and fetches the page only when that differs from the newest revision the device knows. The
   * notice appears only when entries changed, and the fetched page is kept on the device so the notice
   * returns on later visits without asking the wiki again. A failed check changes nothing and is not
   * counted, so the next visit tries again.
   */
  async function autoCheckForUpdate(): Promise<void> {
    if (checkedRecently()) return;
    let revision: number;
    try {
      revision = await wiki.fetchRevisionId();
    } catch {
      return;
    }
    if (revision === Math.max(content.revisionId, offered?.revisionId ?? 0) || revision === dismissedRevision) {
      recordCheck();
      return;
    }
    const check = await checkForUpdate();
    if (check.status === "unreachable") return;
    if (check.status === "changes" && check.preview.revisionId > dismissedRevision) {
      if (check.preview.revisionId > (offered?.revisionId ?? 0)) {
        offered = check.preview;
        storage.write(OFFERED_KEY, JSON.stringify(check.preview.content));
      }
    }
    recordCheck();
  }

  // A copy the device is holding for review (a fetched update not yet applied or dismissed) and a bundled copy
  // newer than the device's own are both offered like a fetched update; the newer revision wins.
  for (const candidate of [
    loadContentAt(OFFERED_KEY),
    stored && bundled.revisionId > stored.revisionId ? bundled : null,
  ]) {
    if (!candidate || candidate.revisionId <= content.revisionId || candidate.revisionId <= (offered?.revisionId ?? 0))
      continue;
    const check = compareWith(candidate);
    if (check.status === "changes") offered = check.preview;
  }

  return {
    expansions: () => content.expansions,
    /** Whether the app ships this wiki icon (by its path in the wiki's image folder) rather than fetching it. */
    isBundledIcon: (icon: string): boolean => bundledIcons.has(icon),
    /** The icons the current content uses that the app does not ship: fetched from the wiki once, then kept for offline use. */
    unbundledIcons: (): string[] => iconsUsed(content).filter((icon) => !bundledIcons.has(icon)),
    /** Fetches the wiki page and reports what would change; nothing is applied until `applyUpdate`. */
    checkForUpdate,
    autoCheckForUpdate,
    /** The update the notice above the log offers (Review opens it), or null when there is none to show. */
    updateNotice,
    /** Hides the notice until the wiki's revision, or the bundled copy's, changes again. */
    dismissUpdateNotice() {
      const notice = updateNotice();
      if (!notice) return;
      dismissedRevision = notice.revisionId;
      storage.write(DISMISSED_KEY, String(dismissedRevision));
    },
    /**
     * Replaces the content with a previewed update. Progress is untouched except for the suggested matches the
     * player accepted, which move every character's status to the new entry; statuses of other removed entries
     * are kept as orphaned. Every suggested match the player did not accept counts as declined and is
     * remembered, so no later update offers it again. Nothing is decided before the update is applied.
     */
    applyUpdate(preview: UpdatePreview, accepted: SuggestedMatch[] = []) {
      adopt(preview.content);
      const takenKeys = new Set(accepted.map((m) => pairKey(m.from, m.to)));
      const accept = preview.suggestions.filter((m) => takenKeys.has(pairKey(m.from, m.to)));
      for (const match of accept) moveStatuses(match);
      const refused = preview.suggestions.filter((m) => !accept.includes(m));
      if (refused.length > 0) {
        const all = declinedPairs();
        for (const { from, to } of refused) all.add(pairKey(from, to));
        storage.write(DECLINED_KEY, JSON.stringify([...all]));
      }
      // The entries this update added are the NEW ones; the last update's are no longer new.
      newIds = preview.added.map((e) => e.id);
      storage.write(NEW_KEY, JSON.stringify(newIds));
      endNewView();
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
        names: entries.slice(0, NOTICE_NAMES).map(entryName),
        more: Math.max(0, entries.length - NOTICE_NAMES),
      };
    },
    /** Which view is open. Opening one closes the others. */
    view: (): LogView => openView,
    /** Opens the NEW entries from every expansion. Does nothing when there are none. */
    showNewEntries() {
      if (currentNew().length > 0) openView = "new";
    },
    /** Opens Available now. */
    showAvailableNow() {
      openView = "available";
    },
    /** Returns to the expansion and tab view. The NEW tags stay. */
    showAllEntries() {
      openView = "sections";
    },
    /**
     * What the open view lists. Complete Shown, Clear Shown, their counts, and every view's rows and empty
     * states read this one query.
     */
    listing,
    /** The NEW entries that pass the search and filters, grouped by section, empty sections left out. */
    newEntries: newSections,
    /** Clears every NEW tag and marker at once and ends the Show view. Returns how many entries it cleared. */
    markNewSeen(): number {
      const cleared = currentNew().length;
      endNewView();
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
      // Choosing an expansion or tab leaves any other view, Available now included.
      openView = "sections";
      saveView();
    },
    /** Whether the tile column is collapsed, remembered on the device. */
    railCollapsed: (): boolean => railCollapsed,
    setRailCollapsed(collapsed: boolean) {
      railCollapsed = collapsed;
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
    /**
     * Resets the search, type, optional challenge choice and both Hide filters. Available now keeps its two Hide
     * filters as they are, since it always hides Completed and Not interested entries. Filters are not progress,
     * so this is not undoable.
     */
    clearFilters() {
      filters = {
        ...DEFAULT_FILTERS,
        ...(openView === "available"
          ? { hideCompleted: filters.hideCompleted, hideNotInterested: filters.hideNotInterested }
          : {}),
      };
      saveView();
    },
    /** Whether Clear filters would change anything: a filter it resets is active. */
    canClearFilters: (): boolean =>
      activeFilterCount(
        openView === "available" ? { ...filters, hideCompleted: false, hideNotInterested: false } : filters,
      ) > 0,
    /** How many filters are narrowing the log right now. */
    activeFilterCount: (): number =>
      // Available now lists only Unmarked entries, so it always hides Completed and Not interested ones.
      activeFilterCount(
        openView === "available" ? { ...filters, hideCompleted: true, hideNotInterested: true } : filters,
      ),
    /** Every content type with its number of entries, most common first. */
    typeCounts: (): { type: string; count: number }[] =>
      contentTypes()
        .map((type) => ({
          type,
          count: content.sections.flatMap((s) => s.entries).filter((e) => typeOf(e) === type).length,
        }))
        .sort((a, b) => b.count - a.count),
    /** Available now's own reading of the listing: see `listing`. */
    availableNow,
    /**
     * Available now's tab: the levels it covers (its name while the character has no level), and the number of rows
     * the view lists. That number is null with no level, and falls as entries are marked, since the view lists
     * only Unmarked ones; the search and filters narrow it as they narrow the list.
     */
    availableTab(): { label: string; rows: number | null } {
      const { level } = currentCharacter();
      if (level === null) return { label: "Available now", rows: null };
      const rows = availableNow().sections.reduce((n, s) => n + s.entries.length, 0);
      return { label: `Level 1 to ${level}`, rows };
    },
    sectionProgress(sectionId: string): ProgressCount {
      return progressOf([sectionOrThrow(sectionId)]);
    },
    /** Progress across both of the expansion's sections. */
    expansionProgress(expansionId: string): ProgressCount {
      expansionOrThrow(expansionId);
      return progressOf(content.sections.filter((s) => s.expansionId === expansionId));
    },
    /** Progress across every section of the log. */
    overallProgress: (): ProgressCount => progressOf(content.sections),
    cycleEntryStatus(entryId: string): ChangeResult {
      return setEntryStatus(entryId, NEXT_STATUS[entryStatus(entryId)]);
    },
    /** Left click: Completed, or Unmarked when it already is Completed. */
    toggleCompleted(entryId: string): ChangeResult {
      return setEntryStatus(entryId, entryStatus(entryId) === "completed" ? "unmarked" : "completed");
    },
    /** Right click: Not interested, or Unmarked when it already is Not interested. */
    toggleNotInterested(entryId: string): ChangeResult {
      return setEntryStatus(entryId, entryStatus(entryId) === "notInterested" ? "unmarked" : "notInterested");
    },
    setEntryStatus,
    /** How many of the listed entries Complete Shown would change: those neither Completed nor Not interested. */
    completeShownCount: (): number => shownIds().filter((id) => entryStatus(id) === "unmarked").length,
    /** Marks the open view's listed entries Completed, leaving Not interested alone. */
    completeShown: (): ChangeResult =>
      change(
        new Map(
          shownIds()
            .filter((id) => entryStatus(id) !== "notInterested")
            .map((id) => [id, "completed"]),
        ),
      ),
    /** How many of the listed entries Clear Shown would change: those not already Unmarked. */
    clearShownCount: (): number => shownIds().filter((id) => entryStatus(id) !== "unmarked").length,
    /** Sets the open view's listed entries back to Unmarked. */
    clearShown: (): ChangeResult => change(new Map(shownIds().map((id) => [id, "unmarked"]))),
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
