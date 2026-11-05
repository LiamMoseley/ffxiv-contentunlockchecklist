import type { KeyboardEvent } from "react";
import { firstIcon, iconFile, type Entry, type EntryStatus, type RichText } from "../log";

export type DisplayMode = "list" | "grid";

export const STATUS_LABEL: Record<EntryStatus, string> = {
  unmarked: "Unmarked",
  completed: "Completed",
  notInterested: "Not interested",
};

/** What the player does to an entry: cycle its status, or jump straight to Not interested. */
export type EntryActions = {
  onCycle: (entryId: string) => void;
  onNotInterested: (entryId: string) => void;
};

/** The three-state tick-box: empty, yellow, or grey with a diagonal stroke. */
export function StatusBox({ status }: { status: EntryStatus }) {
  return <span className={`status-box ${status}`} aria-hidden="true" />;
}

/** A cell's text with the wiki's icons and links, one block per line. */
function RichCell({ text }: { text: RichText }) {
  // Nothing at all, so the card layout can hide an empty cell and its label.
  if (text.length === 0) return null;
  return (
    <div className="rich">
      {text.map((line, i) => (
        <span className="line" key={i}>
          {line.map((segment, j) => {
            if ("icon" in segment) {
              return (
                <img
                  key={j}
                  className="wiki-icon"
                  src={iconUrl(segment.icon)}
                  width={segment.size}
                  height={segment.size}
                  alt=""
                />
              );
            }
            if (!segment.href) return segment.text;
            return (
              <a
                key={j}
                className="wiki-link"
                href={segment.href}
                target="_blank"
                rel="noopener noreferrer"
                // Following a link never changes the entry's status.
                onClick={(event) => event.stopPropagation()}
              >
                {segment.text}
              </a>
            );
          })}
        </span>
      ))}
    </div>
  );
}

const iconUrl = (icon: string) => `${import.meta.env.BASE_URL}icons/${iconFile(icon)}`;

/** The status box as a button; its click, like a click anywhere on the entry, reaches the entry's handler. */
function StatusButton({ entry, status }: { entry: Entry; status: EntryStatus }) {
  return (
    <button type="button" className="status" aria-label={`${entry.unlock}: ${STATUS_LABEL[status]}`} title={STATUS_LABEL[status]}>
      <StatusBox status={status} />
    </button>
  );
}

/**
 * What makes an entry focusable and operable: a click anywhere on it cycles its status, Space cycles
 * it while the entry itself is focused (the status button does so natively), and X sets Not interested.
 */
function entryProps(actions: EntryActions, entryId: string) {
  return {
    tabIndex: 0,
    onClick: () => actions.onCycle(entryId),
    onKeyDown: (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.toLowerCase() === "x") {
        event.preventDefault();
        actions.onNotInterested(entryId);
      } else if (event.key === " " && event.target === event.currentTarget) {
        event.preventDefault();
        actions.onCycle(entryId);
      }
    },
  };
}

const levelParts = (entry: Entry) =>
  [
    entry.level && { key: "level", text: entry.level },
    entry.itemLevel && { key: "item-level", text: `iLv. ${entry.itemLevel}` },
  ].filter((part) => !!part);

/** "Lv. 61 · Dungeon": a card's one-line summary. Level-cap entries show their item level instead. */
const summary = (entry: Entry) =>
  [
    entry.level ? `Lv. ${entry.level}` : entry.itemLevel ? `iLv. ${entry.itemLevel}` : "",
    entry.type.split("\n")[0],
  ]
    .filter(Boolean)
    .join(" · ");

export type EntryListProps = {
  entries: Entry[];
  statusOf: (entryId: string) => EntryStatus;
  actions: EntryActions;
};

export function EntryTable({ entries, statusOf, actions }: EntryListProps) {
  return (
    <table className="entries">
      <thead>
        <tr>
          <th>Status</th>
          <th>Level</th>
          <th>Unlock</th>
          <th>Type</th>
          <th>Quest</th>
          <th>Location</th>
          <th>Information</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const status = statusOf(entry.id);
          return (
            <tr key={entry.id} className={status} {...entryProps(actions, entry.id)}>
              <td className="status-cell">
                <StatusButton entry={entry} status={status} />
              </td>
              <td data-label="Level" className="level">
                {levelParts(entry).map((part) => (
                  <span key={part.key}>{part.text}</span>
                ))}
              </td>
              <td data-label="Unlock" className="unlock">
                <RichCell text={entry.rich.unlock} />
              </td>
              <td data-label="Type">
                <RichCell text={entry.rich.type} />
              </td>
              <td data-label="Quest">
                <RichCell text={entry.rich.quest} />
              </td>
              <td data-label="Location">
                <RichCell text={entry.rich.location} />
              </td>
              <td data-label="Information">
                <RichCell text={entry.rich.information} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function EntryGrid({ entries, statusOf, actions }: EntryListProps) {
  return (
    <ul className="entry-grid">
      {entries.map((entry) => {
        const status = statusOf(entry.id);
        const icon = firstIcon(entry.rich.unlock);
        return (
          <li key={entry.id} className={`entry-card ${status}`} {...entryProps(actions, entry.id)}>
            <div className="card-icon">
              {icon && <img className="wiki-icon" src={iconUrl(icon.icon)} width={icon.size} height={icon.size} alt="" />}
            </div>
            <div className="card-text">
              <div className="card-name">
                <RichCell text={entry.rich.unlock.map((line) => line.filter((s) => !("icon" in s)))} />
              </div>
              <div className="card-summary">{summary(entry)}</div>
            </div>
            <StatusButton entry={entry} status={status} />
          </li>
        );
      })}
    </ul>
  );
}

/** The hint bar: the three-state legend and the DISPLAY MODE toggle. */
export function HintBar({ mode, onMode }: { mode: DisplayMode; onMode: (mode: DisplayMode) => void }) {
  return (
    <div className="hint-bar">
      <span className="hint-icon" aria-hidden="true">
        ?
      </span>
      <ul className="legend" aria-label="Status boxes">
        {(Object.keys(STATUS_LABEL) as EntryStatus[]).map((status) => (
          <li key={status}>
            <StatusBox status={status} /> {STATUS_LABEL[status]}
          </li>
        ))}
      </ul>
      <span className="hint-keys">Space: change status · X: not interested</span>
      <div className="display-mode" role="group" aria-label="Display mode">
        <span className="display-mode-label">DISPLAY MODE</span>
        {(["list", "grid"] as const).map((option) => (
          <button key={option} type="button" aria-pressed={mode === option} onClick={() => onMode(option)}>
            {option === "list" ? "List" : "Grid"}
          </button>
        ))}
      </div>
    </div>
  );
}
