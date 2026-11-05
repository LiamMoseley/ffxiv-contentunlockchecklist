import { useEffect, useReducer, useRef, useState } from "react";
import type { ChangeResult, Log, Section, SectionKind, Storage } from "../log";
import { EntryGrid, EntryTable, HintBar, type DisplayMode, type EntryActions } from "./EntryList";
import { ConfirmDialog, Toast } from "./Messages";
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
  const [expansion, setExpansion] = useState<ExpansionChoice>(() => log.expansions()[0]?.id ?? "all");
  // Kept while switching expansions, so a player who chose All stays on All.
  const [tab, setTab] = useState<TabKey>("levelling");
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
  const toastCount = useRef(0);

  const sectionNames = new Map(
    log.sections().map((s) => [s.id, `${log.expansions().find((e) => e.id === s.expansionId)?.name ?? ""} ${sectionTitle(s)}`]),
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
    if (!log.undo()) return;
    refresh();
    say("Change undone.");
  };
  // Ctrl/Cmd+Z undoes, except while typing in a field, where it keeps its own meaning.
  const undoRef = useRef(undo);
  undoRef.current = undo;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== "z") return;
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
          ...expansionSections.map((s) => ({ key: s.kind, label: sectionTitle(s), progress: log.sectionProgress(s.id) })),
          { key: "all", label: "All", progress: log.expansionProgress(expansion) },
        ];
  const activeTab: TabKey = expansion === "all" ? "all" : tab;

  const shownSections =
    expansion === "all"
      ? log.sections()
      : expansionSections.filter((s) => activeTab === "all" || s.kind === activeTab);

  const shownIds = shownSections.flatMap((s) => s.entries.map((e) => e.id));
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
          <div className="character">
            {character.level !== null && <span className="character-level">Level {character.level} ·</span>}
            <span className="character-name">{character.name}</span>
            {character.world && <span className="character-world">({character.world})</span>}
          </div>
        </header>

        <div className={`window-body${railCollapsed ? " collapsed" : ""}`}>
          <ExpansionRail
            log={log}
            chosen={expansion}
            onChoose={setExpansion}
            collapsed={railCollapsed}
            onToggleCollapsed={() => setRailCollapsed(!railCollapsed)}
          />

          <main className="main">
            <SectionTabs
              tabs={tabs}
              active={activeTab}
              onChoose={(key) => expansion !== "all" && setTab(key)}
              label="Sections"
            />
            <div className="scroll">
              {shownSections.map((section) => (
                <SectionPanel
                  key={section.id}
                  log={log}
                  section={section}
                  expansionName={expansionNames.get(section.expansionId) ?? ""}
                  mode={displayMode}
                  actions={actions}
                />
              ))}
            </div>
          </main>
        </div>

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
      <Entries entries={section.entries} statusOf={log.entryStatus} actions={actions} />
    </section>
  );
}
