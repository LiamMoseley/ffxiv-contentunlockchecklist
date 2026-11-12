import { useDeferredValue, useEffect, useLayoutEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { cacheWikiIcons } from "../adapters/offline";
import {
  entryCount,
  readDisplayMode,
  writeDisplayMode,
  type ChangeResult,
  type DisplayMode,
  type Entry,
  type Listing,
  type Log,
  type Section,
  type Selection,
  type Storage,
  type UpdatePreview,
} from "../log";
import { EntryGrid, EntryTable, HintBar, NewBadge, type EntryActions, type EntryFlash } from "./EntryList";
import { CharacterMenu } from "./CharacterMenu";
import { ConfirmDialog, Toast } from "./Messages";
import { FilterBar } from "./FilterBar";
import { HelpDialog } from "./HelpDialog";
import { ExpansionRail, type ExpansionChoice } from "./ExpansionRail";
import { ChangedByHandContext, Count, ProgressBar } from "./ProgressBar";
import { ScrollJump } from "./ScrollJump";
import { UpdateButton } from "./UpdateButton";
import { UpdateDialog } from "./UpdateDialog";
import { SectionTabs, type TabChoice } from "./SectionTabs";

const WIKI_PAGE_URL = "https://ffxiv.consolegameswiki.com/wiki/Content_Unlock";

/** A section tab: one of the expansion's two sections, or both. */
type TabKey = Selection["tab"];

/** A key pressed inside an open dialog belongs to the dialog: the app's own shortcuts leave it alone. */
const inDialog = (event: KeyboardEvent) =>
  event.target instanceof Element && !!event.target.closest(".dialog-backdrop");

/** The wiki writes "Level 51 - 60"; the window shows "Level 51–60". */
const sectionTitle = (section: Section) => section.heading.replace(/\s*-\s*/, "–");

/** `preferences` keeps device settings, such as the display mode, apart from the player's progress. */
export function App({ log, preferences }: { log: Log; preferences: Storage }) {
  // The Log core holds all state; re-render after each command.
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  // The Log core remembers the chosen expansion and tab on the device.
  const { expansion, tab } = log.selection();
  const setExpansion = (choice: ExpansionChoice) => {
    log.setSelection({ expansion: choice });
    refresh();
  };
  const setTab = (key: TabKey) => {
    // Choosing a tab in the All view has no selection to change, but still ends the NEW view.
    if (expansion === "all") log.showAllEntries();
    else log.setSelection({ tab: key });
    refresh();
  };
  const searchRef = useRef<HTMLInputElement>(null);
  // Hidden by default; the filters still apply while the panel is closed.
  const [filtersOpen, setFiltersOpen] = useState(false);
  // "/" or Ctrl/Cmd+K opens the filters and focuses the search box, except while typing in a field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || inDialog(event)) return;
      const inField =
        event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]");
      const slash = event.key === "/" && !event.ctrlKey && !event.metaKey && !inField;
      const palette = event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey) && !event.shiftKey;
      if (!slash && !palette) return;
      event.preventDefault();
      setFiltersOpen(true);
      // The search box mounts on the next render.
      setTimeout(() => {
        searchRef.current?.focus();
        searchRef.current?.select();
      }, 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const railCollapsed = log.railCollapsed();
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => readDisplayMode(preferences));

  const chooseDisplayMode = (mode: DisplayMode) => {
    setDisplayMode(mode);
    writeDisplayMode(preferences, mode);
  };
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [confirming, setConfirming] = useState<"complete" | "clear" | null>(null);
  const [characterMenuOpen, setCharacterMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const toastCount = useRef(0);
  const [confirmingUpdate, setConfirmingUpdate] = useState(false);
  // The update dialog: Review opens the update the notice offers (`preview`); the Update action fetches its own.
  const [update, setUpdate] = useState<{ preview?: UpdatePreview } | null>(null);
  // The automatic check runs once as the app opens; the Log core decides whether it is due and what it finds.
  const autoChecked = useRef(false);
  useEffect(() => {
    if (autoChecked.current) return;
    autoChecked.current = true;
    void log.autoCheckForUpdate().then(refresh);
  }, [log]);
  // Update needs the wiki, so it is disabled while the device is offline.
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const sectionNames = new Map(
    log
      .sections()
      .map((s) => [s.id, `${log.expansions().find((e) => e.id === s.expansionId)?.name ?? ""} ${sectionTitle(s)}`]),
  );

  const say = (text: string) => setToast({ id: ++toastCount.current, text });

  // The expansions whose rail tile is celebrating, each with a counter so a repeat restarts the animation.
  // Only a change that crosses an expansion to 100% sets it; load, switching Character and Undo never do.
  const [celebrating, setCelebrating] = useState<Record<string, number>>({});
  const celebrationCount = useRef(0);
  // Cleared on a timer, like the row flash, so a tile that remounts later does not replay it.
  useEffect(() => {
    if (Object.keys(celebrating).length === 0) return;
    const timer = setTimeout(() => setCelebrating({}), 1500);
    return () => clearTimeout(timer);
  }, [celebrating]);
  const expansionName = (id: string) => log.expansions().find((e) => e.id === id)?.name ?? "";

  /** Shows the message for a change, adding a note for each section and expansion it finished. */
  const announce = (text: string | null, result: ChangeResult) => {
    refresh();
    if (result.changed === 0) return;
    if (result.expansionsCompleted.length > 0) {
      const count = ++celebrationCount.current;
      setCelebrating((now) => ({ ...now, ...Object.fromEntries(result.expansionsCompleted.map((id) => [id, count])) }));
    }
    const finished = [
      ...result.sectionsFinished.map((id) => `${sectionNames.get(id)} complete!`),
      ...result.expansionsCompleted.map((id) => `${expansionName(id)} complete!`),
    ];
    // A single row's change needs no message of its own; only finishing a section is worth one.
    const message = [text, ...finished].filter(Boolean).join("\n");
    if (message) say(message);
  };

  const undo = () => {
    if (!log.canUndo()) return;
    const undone = log.undo();
    refresh();
    say(undone ? "Change undone." : "Nothing to undo: that name and World are in use again.");
  };
  // Ctrl/Cmd+Z undoes, except while typing in a field, where it keeps its own meaning.
  const undoRef = useRef(undo);
  undoRef.current = undo;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== "z")
        return;
      if (inDialog(event)) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      undoRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The entry whose status the player just changed by hand, so only that row animates. Bulk actions, Undo,
  // updates and switching lists never set it, and it clears once the animation ends.
  const [flash, setFlash] = useState<EntryFlash | null>(null);
  const flashEntry = (entryId: string) => {
    const status = log.entryStatus(entryId);
    // Only Completed animates; Not interested and Unmarked change quietly.
    setFlash(status === "completed" ? { entryId, status } : null);
  };

  const actions: EntryActions = {
    onToggleCompleted: (entryId) => {
      const result = log.toggleCompleted(entryId);
      announce(null, result);
      flashEntry(entryId);
    },
    onToggleNotInterested: (entryId) => {
      const result = log.toggleNotInterested(entryId);
      announce(null, result);
      flashEntry(entryId);
    },
    flash,
  };
  // Cleared on a timer rather than when the animation ends: the row may unmount first (a hiding filter, a
  // section switch), and it must not replay when it returns.
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(timer);
  }, [flash]);

  const expansionNames = new Map(log.expansions().map((e) => [e.id, e.name]));
  const expansionSections = log.sections().filter((s) => s.expansionId === expansion);

  // Which view is open, and what it lists, are the Log core's.
  const listing = log.listing();
  const viewingNew = listing.view === "new";
  const availableOpen = listing.view === "available";
  const availableTab = availableOpen ? log.availableTab() : null;
  const tabs: TabChoice<TabKey>[] =
    expansion === "all"
      ? [{ key: "all", label: "All", progress: log.overallProgress() }]
      : [
          ...expansionSections.map((s) => ({
            key: s.kind,
            label: sectionTitle(s),
            progress: log.sectionProgress(s.id),
          })),
          { key: "all", label: "All", progress: log.expansionProgress(expansion) },
        ];
  const activeTab: TabKey = expansion === "all" ? "all" : tab;

  // On a switch the old list stays up while React renders the new one in the background, so the rail
  // marker and tabs move at once instead of freezing behind a long list. Under the same key (ticking,
  // filtering) the live listing shows, so those changes stay immediate.
  // Only the key is deferred (a string, so an unchanged key schedules no second render); the last
  // listing rendered under the key on show is kept to hold the old list up meanwhile.
  const listKey = availableOpen ? "available" : `${expansion}:${activeTab}`;
  const shownKey = useDeferredValue(listKey);
  const switching = shownKey !== listKey;
  // A new expansion or section starts at the top: the list's own scroller, and the window's content where that
  // scrolls instead (phones).
  const scrollRef = useRef<HTMLDivElement>(null);
  const windowScrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    if (windowScrollRef.current) windowScrollRef.current.scrollTop = 0;
  }, [shownKey]);
  const lastShown = useRef(listing);
  if (!switching) lastShown.current = listing;
  const shownListing = switching ? lastShown.current : listing;

  const activeFilters = log.activeFilterCount();
  // Complete Shown and Clear Shown act on what the open view lists.
  const completeCount = log.completeShownCount();
  const clearCount = log.clearShownCount();

  const confirmBulk = () => {
    if (confirming === "complete") {
      const n = completeCount;
      announce(`Marked ${entryCount(n)} Completed.`, log.completeShown());
    } else if (confirming === "clear") {
      const n = clearCount;
      announce(`Cleared ${entryCount(n)}.`, log.clearShown());
    }
    setConfirming(null);
  };

  // Icons from an in-browser update are kept for offline use as soon as the service worker can keep them.
  useEffect(() => cacheWikiIcons(log.unbundledIcons()));

  const character = log.currentCharacter();

  return (
    <ChangedByHandContext.Provider value={flash !== null}>
      <div className="page">
        <div className="window">
          {/* Everything but the jump buttons scrolls together on a phone; on desktop the wrapper has no box of its own */}
          <div className="window-scroll" ref={windowScrollRef}>
            <header className="title-bar">
              <h1>Content Unlock Log</h1>
              <button
                type="button"
                className="character"
                aria-haspopup="dialog"
                aria-label={`Current character: ${log.characterLabel(character)}. Switch character`}
                onClick={() => setCharacterMenuOpen(true)}
              >
                {character.level !== null && <span className="character-level">Level {character.level} ·</span>}
                {/* eslint-disable-next-line no-restricted-syntax -- the title bar styles name and World apart */}
                <span className="character-name">{character.name}</span>
                {character.world && <span className="character-world">({character.world})</span>}
              </button>
            </header>

            <div className={`window-body${railCollapsed ? " collapsed" : ""}`}>
              <ExpansionRail
                log={log}
                chosen={expansion}
                noneChosen={viewingNew || availableOpen}
                celebrating={celebrating}
                availableOpen={availableOpen}
                onChooseAvailable={() => {
                  // Available now replaces the NEW view; choosing a tile leaves it.
                  log.showAvailableNow();
                  refresh();
                }}
                onChoose={setExpansion}
                collapsed={railCollapsed}
                onToggleCollapsed={() => {
                  log.setRailCollapsed(!railCollapsed);
                  refresh();
                }}
              />

              <main className="main">
                <UpdateNotice
                  log={log}
                  onReview={(preview) => setUpdate({ preview })}
                  onDismiss={() => {
                    log.dismissUpdateNotice();
                    refresh();
                  }}
                />
                <NewNotice
                  log={log}
                  viewing={viewingNew}
                  onShow={() => {
                    log.showNewEntries();
                    refresh();
                  }}
                  onShowAll={() => {
                    log.showAllEntries();
                    refresh();
                  }}
                  onMarkSeen={() => {
                    const n = log.markNewSeen();
                    refresh();
                    say(`Marked ${entryCount(n)} as seen.`);
                  }}
                />
                <div className="tabs-row">
                  {availableTab ? (
                    <div className="tabs">
                      <h2 className="tab-static">
                        <span>
                          {availableTab.label}
                          {availableTab.rows !== null && (
                            <>
                              {" "}
                              <span className="count">({availableTab.rows})</span>
                            </>
                          )}
                        </span>
                      </h2>
                    </div>
                  ) : (
                    <SectionTabs
                      tabs={tabs}

                      active={viewingNew ? null : activeTab}
                      onChoose={(key) => expansion !== "all" && setTab(key)}
                      label="Sections"
                    />
                  )}
                  <button
                    type="button"
                    className="filters-toggle"
                    aria-expanded={filtersOpen}
                    aria-controls="filter-bar"
                    onClick={() => setFiltersOpen(!filtersOpen)}
                  >
                    Filters
                    {activeFilters > 0 && (
                      <span
                        className="filters-active"
                        title={`${activeFilters} active`}
                        aria-label={`${activeFilters} active`}
                      >
                        {activeFilters}
                      </span>
                    )}{" "}
                    {filtersOpen ? "▴" : "▾"}
                  </button>
                </div>
                <FilterBar
                  log={log}
                  searchRef={searchRef}
                  onChange={refresh}
                  open={filtersOpen}
                  alwaysHidingMarked={availableOpen}
                />
                <div className="scroll" ref={scrollRef}>
                  <SwitchFade switchKey={shownKey}>
                    {shownListing.view === "available" ? (
                      <AvailableNow
                        log={log}
                        listing={shownListing}
                        expansionNames={expansionNames}
                        mode={displayMode}
                        actions={actions}
                        onSetLevel={() => setCharacterMenuOpen(true)}
                      />
                    ) : shownListing.view === "new" ? (
                      <NewEntriesView
                        log={log}
                        sections={shownListing.sections}
                        expansionNames={expansionNames}
                        mode={displayMode}
                        actions={actions}
                      />
                    ) : (
                      shownListing.sections.map((section) => (
                        <SectionPanel
                          key={section.id}
                          log={log}
                          section={section}
                          expansionName={expansionNames.get(section.expansionId) ?? ""}
                          mode={displayMode}
                          actions={actions}
                        />
                      ))
                    )}
                  </SwitchFade>
                </div>
              </main>
            </div>

            {characterMenuOpen && (
              <CharacterMenu
                log={log}
                onClose={() => setCharacterMenuOpen(false)}
                onChange={(message) => {
                  refresh();
                  if (message) say(message);
                }}
              />
            )}
            {confirmingUpdate && (
              <ConfirmDialog
                title="Update from the wiki"
                text="Fetch the latest list from the wiki and review what changed? Nothing is applied until you confirm the changes, and your progress is never changed."
                confirmLabel="Update"
                onConfirm={() => {
                  setConfirmingUpdate(false);
                  setUpdate({});
                }}
                onCancel={() => setConfirmingUpdate(false)}
              />
            )}
            {update && (
              <UpdateDialog
                log={log}
                preview={update.preview}
                onClose={() => setUpdate(null)}
                onChecked={refresh}
                onApplied={(message) => {
                  setUpdate(null);
                  refresh();
                  say(message);
                }}
              />
            )}
            {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
            {confirming && (
              <ConfirmDialog
                title={confirming === "complete" ? "Complete Shown" : "Clear Shown"}
                text={
                  confirming === "complete"
                    ? `Mark ${entryCount(completeCount)} Completed? Not interested entries are left alone.`
                    : `Set ${entryCount(clearCount)} back to Unmarked?`
                }
                confirmLabel={confirming === "complete" ? "Complete" : "Clear"}
                onConfirm={confirmBulk}
                onCancel={() => setConfirming(null)}
              />
            )}

            <HintBar
              mode={displayMode}
              onMode={chooseDisplayMode}
              canUndo={log.canUndo()}
              onUndo={undo}
              onHelp={() => setHelpOpen(true)}
              online={online}
              onUpdate={() => setConfirmingUpdate(true)}
            />
            {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}

            <div className="button-footer" role="group" aria-label="Shown entries">
              <button type="button" disabled={clearCount === 0 || switching} onClick={() => setConfirming("clear")}>
                Clear Shown
              </button>
              <svg className="chevron" viewBox="0 0 17 9" aria-hidden="true">
                <path d="M0.75 0.75L8.5 5.25L16.25 0.75M0.75 4.25L8.5 8.75L16.25 4.25" />
              </svg>
              <button
                type="button"
                disabled={completeCount === 0 || switching}
                onClick={() => setConfirming("complete")}
              >
                Complete Shown
              </button>
            </div>

            <footer className="footer-bar">
              <span>An unofficial, personal tool. FINAL FANTASY XIV © SQUARE ENIX CO., LTD. All Rights Reserved.</span>
              <span className="footer-source">
                <span>
                  Content from <a href={WIKI_PAGE_URL}>Content Unlock</a> on the community FFXIV wiki.
                </span>
                <UpdateButton className="in-footer" online={online} onClick={() => setConfirmingUpdate(true)} />
              </span>
            </footer>
          </div>
          <ScrollJump scroller={windowScrollRef} />
        </div>
      </div>
    </ChangedByHandContext.Provider>
  );
}

/**
 * Fades its list in with a short upward slide when `switchKey` changes (a new expansion or section).
 * The first render, and every later change to the list under the same key, play nothing.
 */
function SwitchFade({ switchKey, children }: { switchKey: string; children: ReactNode }) {
  const [state, setState] = useState({ key: switchKey, animate: false });
  if (state.key !== switchKey) setState({ key: switchKey, animate: true });
  // Keyed, so a switch remounts the wrapper and restarts the animation; the class then stays put.
  return (
    <div key={switchKey} className={state.animate ? "switch-fade" : undefined}>
      {children}
    </div>
  );
}

/** Every Unmarked entry the current character can reach at their level; the Log core decides which. */
function AvailableNow({
  log,
  listing,
  expansionNames,
  mode,
  actions,
  onSetLevel,
}: {
  log: Log;
  listing: Listing;
  expansionNames: Map<string, string>;
  mode: DisplayMode;
  actions: EntryActions;
  onSetLevel: () => void;
}) {
  const { level, sections, filteredOut } = listing;
  if (level === null) {
    return (
      <p className="section-empty available-empty">
        {log.characterLabel(log.currentCharacter())} has no level yet. Set one to see what is available now.{" "}
        <button type="button" onClick={onSetLevel}>
          Set level
        </button>
      </p>
    );
  }
  if (sections.length === 0 && filteredOut > 0) {
    return <p className="section-empty available-empty">All available entries are hidden by the search or filters.</p>;
  }
  if (sections.length === 0) {
    return (
      <p className="section-empty available-empty">
        Nothing left to unlock at level {level}. Raise the character&apos;s level to see more.{" "}
        <button type="button" onClick={onSetLevel}>
          Change level
        </button>
      </p>
    );
  }
  return (
    <SectionGroups
      log={log}
      sections={sections}
      idPrefix="available"
      expansionNames={expansionNames}
      mode={mode}
      actions={actions}
    />
  );
}

/** Grid or table: the one place the display mode picks how a list of entries is drawn. */
function Entries({
  log,
  entries,
  mode,
  actions,
}: {
  log: Log;
  entries: Entry[];
  mode: DisplayMode;
  actions: EntryActions;
}) {
  const Layout = mode === "grid" ? EntryGrid : EntryTable;
  return <Layout entries={entries} statusOf={log.entryStatus} isNew={log.isNew} actions={actions} />;
}

/** The sections the Available now and NEW views list: a plain heading over each section's entries. */
function SectionGroups({
  log,
  sections,
  idPrefix,
  expansionNames,
  mode,
  actions,
}: {
  log: Log;
  sections: Section[];
  /** Keeps heading IDs apart from the other views'. */
  idPrefix: string;
  expansionNames: Map<string, string>;
  mode: DisplayMode;
  actions: EntryActions;
}) {
  return (
    <>
      {sections.map((section) => (
        <section key={section.id} className="section" aria-labelledby={`${idPrefix}-${section.id}-heading`}>
          <div className="section-head">
            <h2 id={`${idPrefix}-${section.id}-heading`}>
              {expansionNames.get(section.expansionId)} <span>{sectionTitle(section)}</span>
            </h2>
          </div>
          <Entries log={log} entries={section.entries} mode={mode} actions={actions} />
        </section>
      ))}
    </>
  );
}

/** The notice above the log when the automatic check found new content: Review opens it, Dismiss hides it. */
function UpdateNotice({
  log,
  onReview,
  onDismiss,
}: {
  log: Log;
  onReview: (preview: UpdatePreview) => void;
  onDismiss: () => void;
}) {
  const preview = log.updateNotice();
  if (!preview) return null;
  return (
    <div className="new-notice" role="status">
      <span className="new-notice-text">New content is available on the wiki.</span>
      <button type="button" onClick={() => onReview(preview)}>
        Review
      </button>
      <button type="button" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}

/** The notice above Filters while there are NEW entries not yet seen: what they are, and what to do about them. */
function NewNotice({
  log,
  viewing,
  onShow,
  onShowAll,
  onMarkSeen,
}: {
  log: Log;
  viewing: boolean;
  onShow: () => void;
  onShowAll: () => void;
  onMarkSeen: () => void;
}) {
  const notice = log.newNotice();
  if (!notice) return null;
  return (
    <div className="new-notice" role="status">
      <span className="new-notice-text">
        <NewBadge />
        <span>
          {notice.names.join(" · ")}
          {notice.more > 0 && ` and ${notice.more} more`}
        </span>
      </span>
      <button type="button" onClick={viewing ? onShowAll : onShow}>
        {viewing ? "Show all entries" : "Show"}
      </button>
      <button type="button" onClick={onMarkSeen}>
        Mark as seen
      </button>
    </div>
  );
}

/** Every NEW entry from all expansions, section by section; the Log core decides which. */
function NewEntriesView({
  log,
  sections,
  expansionNames,
  mode,
  actions,
}: {
  log: Log;
  sections: Section[];
  expansionNames: Map<string, string>;
  mode: DisplayMode;
  actions: EntryActions;
}) {
  if (sections.length === 0) {
    return <p className="section-empty">All NEW entries are hidden by the search or filters.</p>;
  }
  return (
    <SectionGroups
      log={log}
      sections={sections}
      idPrefix="new"
      expansionNames={expansionNames}
      mode={mode}
      actions={actions}
    />
  );
}

function SectionPanel({
  log,
  section,
  expansionName,
  mode,
  actions,
}: {
  log: Log;
  section: Section;
  expansionName: string;
  mode: DisplayMode;
  actions: EntryActions;
}) {
  const progress = log.sectionProgress(section.id);
  const shown = section.entries;
  return (
    <section className="section" aria-labelledby={`${section.id}-heading`}>
      <div className="section-head">
        <h2 id={`${section.id}-heading`}>
          {expansionName} <span>{sectionTitle(section)}</span>
        </h2>
        <ProgressBar progress={progress} label={`${expansionName} ${sectionTitle(section)} progress`} />
        <Count progress={progress} />
      </div>
      {shown.length === 0 ? (
        <p className="section-empty">All entries in this section are hidden by the search or filters.</p>
      ) : (
        <Entries log={log} entries={shown} mode={mode} actions={actions} />
      )}
    </section>
  );
}
