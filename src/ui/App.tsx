import { useReducer, useState } from "react";
import type { EntryStatus, Log, Section, SectionKind } from "../log";
import { ExpansionRail, type ExpansionChoice } from "./ExpansionRail";
import { Count, ProgressBar } from "./ProgressBar";
import { SectionTabs, type TabChoice } from "./SectionTabs";

const STATUS_LABEL: Record<EntryStatus, string> = {
  unmarked: "Unmarked",
  completed: "Completed",
  notInterested: "Not interested",
};

const STATUS_MARK: Record<EntryStatus, string> = {
  unmarked: "☐",
  completed: "☑",
  notInterested: "⊘",
};

const WIKI_PAGE_URL = "https://ffxiv.consolegameswiki.com/wiki/Content_Unlock";

/** A section tab: one of the expansion's two sections, or both. */
type TabKey = SectionKind | "all";

/** The wiki writes "Level 51 - 60"; the window shows "Level 51–60". */
const sectionTitle = (section: Section) => section.heading.replace(/\s*-\s*/, "–");

export function App({ log }: { log: Log }) {
  // The Log core holds all state; re-render after each command.
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [expansion, setExpansion] = useState<ExpansionChoice>(() => log.expansions()[0]?.id ?? "all");
  // Kept while switching expansions, so a player who chose All stays on All.
  const [tab, setTab] = useState<TabKey>("levelling");
  const [railCollapsed, setRailCollapsed] = useState(false);

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
                  onCycle={(entryId) => {
                    log.cycleEntryStatus(entryId);
                    refresh();
                  }}
                />
              ))}
              <Credits />
            </div>
          </main>
        </div>

        <footer className="footer-bar">
          <span>An unofficial personal tool.</span>
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
  onCycle,
}: {
  log: Log;
  section: Section;
  expansionName: string;
  onCycle: (entryId: string) => void;
}) {
  const progress = log.sectionProgress(section.id);
  const levelHeading = section.kind === "levelCap" ? "Item level" : "Level";
  return (
    <section className="section" aria-labelledby={`${section.id}-heading`}>
      <div className="section-head">
        <h2 id={`${section.id}-heading`}>
          {expansionName} <span>{sectionTitle(section)}</span>
        </h2>
        <ProgressBar progress={progress} label={`${expansionName} ${sectionTitle(section)} progress`} />
        <Count progress={progress} />
      </div>
      <table className="entries">
        <thead>
          <tr>
            <th>Status</th>
            <th>{levelHeading}</th>
            <th>Unlock</th>
            <th>Type</th>
            <th>Quest</th>
            <th>Location</th>
            <th>Information</th>
          </tr>
        </thead>
        <tbody>
          {section.entries.map((entry) => {
            const status = log.entryStatus(entry.id);
            return (
              <tr key={entry.id} className={status}>
                <td>
                  <button
                    type="button"
                    className="status"
                    aria-label={`${entry.unlock}: ${STATUS_LABEL[status]}`}
                    title={STATUS_LABEL[status]}
                    onClick={() => onCycle(entry.id)}
                  >
                    {STATUS_MARK[status]}
                  </button>
                </td>
                <td data-label={levelHeading}>{section.kind === "levelCap" ? entry.itemLevel : entry.level}</td>
                <td data-label="Unlock" className="unlock">
                  {entry.unlock}
                </td>
                <td data-label="Type">{entry.type}</td>
                <td data-label="Quest" className="quest">
                  {entry.quest}
                </td>
                <td data-label="Location">{entry.location}</td>
                <td data-label="Information">{entry.information}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function Credits() {
  return (
    <p className="credits">
      Content Unlock Log is an unofficial personal tool, not affiliated with or endorsed by Square Enix. Entries come
      from the <a href={WIKI_PAGE_URL}>Content Unlock page</a> of the community FFXIV wiki (ffxiv.consolegameswiki.com).
      <br />
      FINAL FANTASY is a registered trademark of Square Enix Holdings Co., Ltd. FINAL FANTASY XIV © SQUARE ENIX CO.,
      LTD. All Rights Reserved.
    </p>
  );
}
