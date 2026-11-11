import { createContext, useContext, type KeyboardEvent } from "react";
import {
  entryIcon,
  entryName,
  iconFile,
  WIKI_IMAGE_BASE,
  type DisplayMode,
  type Entry,
  type EntryStatus,
  type RichText,
} from "../log";

export const STATUS_LABEL: Record<EntryStatus, string> = {
  unmarked: "Unmarked",
  completed: "Completed",
  notInterested: "Not interested",
};

/** What the player does to an entry: cycle its status, or jump straight to Not interested. */
export type EntryActions = {
  onCycle: (entryId: string) => void;
  onNotInterested: (entryId: string) => void;
  /** The entry the player just set to Completed or Not interested, which plays its animation. */
  flash?: EntryFlash | null;
};

export type EntryFlash = { entryId: string; status: EntryStatus };

/** The three-state tick-box: empty, yellow, or grey with a diagonal stroke. */
export function StatusBox({ status, flash }: { status: EntryStatus; flash?: boolean }) {
  return <span className={`status-box ${status}${flash ? " flash" : ""}`} aria-hidden="true" />;
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
              return <WikiIcon key={j} icon={segment.icon} size={segment.size} />;
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

/** Whether the app ships a wiki icon; the App supplies the Log core's answer. */
export const BundledIconContext = createContext<(icon: string) => boolean>(() => true);

/**
 * A wiki icon. A bundled one is served from the app. One that only appeared after an in-browser update comes from
 * the wiki, which rejects requests that carry a Referer, so none is sent; the service worker keeps it for offline use.
 */
function WikiIcon({ icon, size }: { icon: string; size: number }) {
  const bundled = useContext(BundledIconContext)(icon);
  return (
    <img
      className="wiki-icon"
      src={bundled ? `${import.meta.env.BASE_URL}icons/${iconFile(icon)}` : WIKI_IMAGE_BASE + icon}
      referrerPolicy="no-referrer"
      width={size}
      height={size}
      alt=""
    />
  );
}

/** The status box as a button; its click, like a click anywhere on the entry, reaches the entry's handler. */
function StatusButton({ entry, status, flash }: { entry: Entry; status: EntryStatus; flash: boolean }) {
  return (
    <button
      type="button"
      className="status"
      aria-label={`${entry.unlock}: ${STATUS_LABEL[status]}`}
      title={STATUS_LABEL[status]}
    >
      <StatusBox status={status} flash={flash} />
    </button>
  );
}

/** What an entry's row needs to play its status animation: whether it is flashing, and the class that plays it. */
function flashProps(actions: EntryActions, entry: Entry, status: EntryStatus) {
  const flashing = actions.flash?.entryId === entry.id && actions.flash.status === status;
  return {
    flashing,
    className: flashing && status === "completed" ? "flash-completed" : "",
  };
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
  [entry.level ? `Lv. ${entry.level}` : entry.itemLevel ? `iLv. ${entry.itemLevel}` : "", entry.type.split("\n")[0]]
    .filter(Boolean)
    .join(" · ");

/** The gold NEW badge after an entry's name. */
export function NewBadge() {
  return <span className="new-badge">NEW</span>;
}

export type EntryListProps = {
  entries: Entry[];
  statusOf: (entryId: string) => EntryStatus;
  isNew: (entryId: string) => boolean;
  actions: EntryActions;
};

export function EntryTable({ entries, statusOf, isNew, actions }: EntryListProps) {
  return (
    <table className="entries">
      <colgroup>
        <col className="col-status" />
        <col className="col-level" />
        <col className="col-unlock" />
        <col className="col-type" />
        <col className="col-quest" />
        <col className="col-location" />
        <col className="col-information" />
      </colgroup>
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
          const flash = flashProps(actions, entry, status);
          return (
            <tr key={entry.id} className={`${status} ${flash.className}`} {...entryProps(actions, entry.id)}>
              <td className="status-cell">
                <StatusButton entry={entry} status={status} flash={flash.flashing} />
              </td>
              <td data-label="Level" className="level">
                {levelParts(entry).map((part) => (
                  <span key={part.key}>{part.text}</span>
                ))}
              </td>
              <td data-label="Unlock" className="unlock">
                <RichCell text={entry.rich.unlock} />
                {isNew(entry.id) && <NewBadge />}
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

export function EntryGrid({ entries, statusOf, isNew, actions }: EntryListProps) {
  return (
    <ul className="entry-grid">
      {entries.map((entry) => {
        const status = statusOf(entry.id);
        const icon = entryIcon(entry);
        const name = entryName(entry);
        const flash = flashProps(actions, entry, status);
        return (
          <li
            key={entry.id}
            className={`entry-card ${status} ${flash.className}`}
            title={name}
            {...entryProps(actions, entry.id)}
          >
            <span className="card-icon">{icon && <WikiIcon icon={icon.icon} size={36} />}</span>
            <span className="card-text">
              <b>
                {name}
                {isNew(entry.id) && <NewBadge />}
              </b>
              <small>{summary(entry)}</small>
            </span>
            <span className="card-status">
              <StatusButton entry={entry} status={status} flash={flash.flashing} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The hint bar: the three-state legend and the DISPLAY MODE toggle. */
export function HintBar({
  mode,
  onMode,
  canUndo,
  onUndo,
}: {
  mode: DisplayMode;
  onMode: (mode: DisplayMode) => void;
  canUndo: boolean;
  onUndo: () => void;
}) {
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
      <button type="button" className="undo" disabled={!canUndo} onClick={onUndo}>
        Undo
      </button>
      <div className="display-mode" role="group" aria-label="Display mode">
        <span className="display-mode-label">Display Mode</span>
        <button
          type="button"
          aria-pressed={mode === "list"}
          aria-label="List"
          title="List"
          onClick={() => onMode("list")}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
            <path d="M1 2h2v2H1zM5 2h8v2H5zM1 6h2v2H1zM5 6h8v2H5zM1 10h2v2H1zM5 10h8v2H5z" />
          </svg>
        </button>
        <button
          type="button"
          aria-pressed={mode === "grid"}
          aria-label="Cards"
          title="Cards"
          onClick={() => onMode("grid")}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
            <path d="M1 1h5v5H1zM8 1h5v5H8zM1 8h5v5H1zM8 8h5v5H8z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
