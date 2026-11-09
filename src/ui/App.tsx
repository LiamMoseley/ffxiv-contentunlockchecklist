import { useEffect, useReducer, useRef, useState } from "react";
import type { ChangeResult, Log, Section, SectionKind, Storage } from "../log";
import { EntryGrid, EntryTable, HintBar, type DisplayMode, type EntryActions } from "./EntryList";
import { CharacterMenu } from "./CharacterMenu";
import { ConfirmDialog, Toast } from "./Messages";
import { FilterBar } from "./FilterBar";
import { ExpansionRail, type ExpansionChoice } from "./ExpansionRail";
import { Count, ProgressBar } from "./ProgressBar";
import { SectionTabs, type TabChoice } from "./SectionTabs";

const WIKI_PAGE_URL = "https://ffxiv.consolegameswiki.com/wiki/Content_Unlock";

/** A section tab: one of the expansion's two sections, or both. */
type TabKey = SectionKind | "all";

/** The wiki writes "Level 51 - 60"; the window shows "Level 51–60". */
const sectionTitle = (section: Section) => section.heading.replace(/\s*-\s*/, "–");

const DISPLAY_MODE_KEY = "contentUnlockLog.displayMode";

/** The remembered display mode; storage that is unavailable or holds anything else means the list. */
function readDisplayMode(preferences: Storage): DisplayMode {
  try {
    return preferences.read(DISPLAY_MODE_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

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
    log.setSelection({ tab: key });
    refresh();
  };
  const searchRef = useRef<HTMLInputElement>(null);
  // Hidden by default; the filters still apply while the panel is closed.
  const [filtersOpen, setFiltersOpen] = useState(false);
  // "/" or Ctrl/Cmd+K opens the filters and focuses the search box, except while typing in a field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey) return;
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
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => readDisplayMode(preferences));

  const chooseDisplayMode = (mode: DisplayMode) => {
    setDisplayMode(mode);
    try {
      preferences.write(DISPLAY_MODE_KEY, mode);
    } catch {
      // The choice still holds for this visit when the device will not store it.
    }
  };
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [confirming, setConfirming] = useState<"complete" | "clear" | null>(null);
  const [characterMenuOpen, setCharacterMenuOpen] = useState(false);
  // "Available now" replaces the section view; a view choice for this visit only.
  const [availableOpen, setAvailableOpen] = useState(false);
  const toastCount = useRef(0);

  const sectionNames = new Map(
    log
      .sections()
      .map((s) => [s.id, `${log.expansions().find((e) => e.id === s.expansionId)?.name ?? ""} ${sectionTitle(s)}`]),
  );

  const say = (text: string) => setToast({ id: ++toastCount.current, text });

  /** Shows the message for a change, adding a note for each section it finished. */
  const announce = (text: string | null, result: ChangeResult) => {
    refresh();
    if (result.changed === 0) return;
    const finished = result.sectionsFinished.map((id) => `${sectionNames.get(id)} complete!`);
    // A single row's change needs no message of its own; only finishing a section is worth one.
    const message = [text, ...finished].filter(Boolean).join(" ");
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
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      undoRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const actions: EntryActions = {
    onCycle: (entryId) => {
      const result = log.cycleEntryStatus(entryId);
      announce(null, result);
    },
    onNotInterested: (entryId) => {
      const result = log.setEntryStatus(entryId, "notInterested");
      announce(null, result);
    },
  };

  const expansionNames = new Map(log.expansions().map((e) => [e.id, e.name]));
  const expansionSections = log.sections().filter((s) => s.expansionId === expansion);

  const tabs: TabChoice<TabKey>[] =
    expansion === "all"
      ? [{ key: "all", label: "Every section", progress: log.overallProgress() }]
      : [
          ...expansionSections.map((s) => ({
            key: s.kind,
            label: sectionTitle(s),
            progress: log.sectionProgress(s.id),
          })),
          { key: "all", label: "All", progress: log.expansionProgress(expansion) },
        ];
  const activeTab: TabKey = expansion === "all" ? "all" : tab;

  const shownSections =
    expansion === "all" ? log.sections() : expansionSections.filter((s) => activeTab === "all" || s.kind === activeTab);

  const activeFilters = log.activeFilterCount({ availableNow: availableOpen });
  // Complete Shown and Clear Shown act on what the window lists: Available now, or the filtered sections.
  const shownIds = availableOpen
    ? log.availableNow().sections.flatMap((s) => s.entries.map((e) => e.id))
    : shownSections.flatMap((s) => log.shownEntries(s.id).map((e) => e.id));
  const completeCount = log.completeShownCount(shownIds);
  const clearCount = log.clearShownCount(shownIds);
  const entries = (n: number) => `${n} ${n === 1 ? "entry" : "entries"}`;

  const confirmBulk = () => {
    if (confirming === "complete") {
      const n = completeCount;
      announce(`Marked ${entries(n)} Completed.`, log.completeShown(shownIds));
    } else if (confirming === "clear") {
      const n = clearCount;
      announce(`Cleared ${entries(n)}.`, log.clearShown(shownIds));
    }
    setConfirming(null);
  };

  const character = log.currentCharacter();

  return (
    <div className="page">
      <div className="window">
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
            inactive={availableOpen}
            onChoose={setExpansion}
            collapsed={railCollapsed}
            onToggleCollapsed={() => setRailCollapsed(!railCollapsed)}
          />

          <main className="main">
            <div className={`tabs-row${availableOpen ? " available" : ""}`}>
              {availableOpen ? (
                <>
                  <h2 className="available-title">Available now</h2>
                  <div className="tabs-spacer" />
                </>
              ) : (
                <SectionTabs
                  tabs={tabs}
                  active={activeTab}
                  onChoose={(key) => expansion !== "all" && setTab(key)}
                  label="Sections"
                />
              )}
              <button
                type="button"
                className="filters-toggle"
                aria-pressed={availableOpen}
                onClick={() => setAvailableOpen(!availableOpen)}
              >
                {availableOpen ? "Back to the log" : "Available now"}
              </button>
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
            {filtersOpen && (
              <FilterBar log={log} searchRef={searchRef} onChange={refresh} alwaysHidingMarked={availableOpen} />
            )}
            <div className="scroll">
              {availableOpen ? (
                <AvailableNow
                  log={log}
                  expansionNames={expansionNames}
                  mode={displayMode}
                  actions={actions}
                  onSetLevel={() => setCharacterMenuOpen(true)}
                />
              ) : (
                shownSections.map((section) => (
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
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
        {confirming && (
          <ConfirmDialog
            title={confirming === "complete" ? "Complete Shown" : "Clear Shown"}
            text={
              confirming === "complete"
                ? `Mark ${entries(completeCount)} Completed? Not interested entries are left alone.`
                : `Set ${entries(clearCount)} back to Unmarked?`
            }
            confirmLabel={confirming === "complete" ? "Complete" : "Clear"}
            onConfirm={confirmBulk}
            onCancel={() => setConfirming(null)}
          />
        )}

        <HintBar mode={displayMode} onMode={chooseDisplayMode} canUndo={log.canUndo()} onUndo={undo} />

        <div className="button-footer" role="group" aria-label="Shown entries">
          <button type="button" disabled={clearCount === 0} onClick={() => setConfirming("clear")}>
            Clear Shown
          </button>
          <span className="chevron" aria-hidden="true">
            ︾
          </span>
          <button type="button" disabled={completeCount === 0} onClick={() => setConfirming("complete")}>
            Complete Shown
          </button>
        </div>

        <footer className="footer-bar">
          <span>FINAL FANTASY XIV © SQUARE ENIX CO., LTD. All Rights Reserved.</span>
          <span>
            Content from the <a href={WIKI_PAGE_URL}>Content Unlock page</a> of the community FFXIV wiki.
          </span>
        </footer>
      </div>
    </div>
  );
}

/** Every Unmarked entry the current character can reach at their level; the Log core decides which. */
function AvailableNow({
  log,
  expansionNames,
  mode,
  actions,
  onSetLevel,
}: {
  log: Log;
  expansionNames: Map<string, string>;
  mode: DisplayMode;
  actions: EntryActions;
  onSetLevel: () => void;
}) {
  const { level, sections, hidden } = log.availableNow();
  const Entries = mode === "grid" ? EntryGrid : EntryTable;
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
  if (sections.length === 0 && hidden > 0) {
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
    <>
      {sections.map((section) => (
        <section key={section.id} className="section" aria-labelledby={`available-${section.id}-heading`}>
          <div className="section-head">
            <h2 id={`available-${section.id}-heading`}>
              {expansionNames.get(section.expansionId)} <span>{sectionTitle(section)}</span>
            </h2>
          </div>
          <Entries entries={section.entries} statusOf={log.entryStatus} actions={actions} />
        </section>
      ))}
    </>
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
  const shown = log.shownEntries(section.id);
  const Entries = mode === "grid" ? EntryGrid : EntryTable;
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
        <Entries entries={shown} statusOf={log.entryStatus} actions={actions} />
      )}
    </section>
  );
}
