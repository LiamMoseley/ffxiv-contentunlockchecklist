import { useEffect, useRef, useState } from "react";
import type { Entry, Log, UpdatePreview } from "../log";

type State =
  | { phase: "checking" }
  | { phase: "unreachable" }
  | { phase: "upToDate" }
  | { phase: "preview"; preview: UpdatePreview };

const FIELD_NAMES = {
  level: "Level",
  itemLevel: "Item level",
  unlock: "Unlock",
  type: "Type",
  quest: "Quest",
  location: "Location",
  information: "Information",
  optionalChallenge: "Optional challenge",
} as const;

/** The fields listed under a new or removed entry, when it has a value for them. */
const DETAIL_FIELDS = ["level", "itemLevel", "type", "quest", "location"] as const;

const name = (entry: Entry) => entry.unlock || entry.quest;

/** A field's value as the dialog shows it: an empty one as "none", the optional challenge tag as yes or no. */
const show = (value: string | boolean) =>
  typeof value === "boolean" ? (value ? "yes" : "no") : value.replace(/\s*\n\s*/g, "; ") || "none";

/** A new or removed entry: its name, then a labelled line for each detail it has. */
function EntryDetails({ entry }: { entry: Entry }) {
  const fields = DETAIL_FIELDS.filter((f) => entry[f] !== "");
  return (
    <li className="update-item">
      <strong className="update-name">{name(entry)}</strong>
      <ul className="update-diff">
        {fields.map((f) => (
          <li key={f}>
            <span className="update-fields">{FIELD_NAMES[f]}:</span> {show(entry[f])}
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Fetches the wiki's list and shows what would change; the player applies it or leaves it. */
export function UpdateDialog({
  log,
  onClose,
  onApplied,
  onChecked,
}: {
  log: Log;
  onClose: () => void;
  onApplied: (message: string) => void;
  /** A check can adopt a page that changes no entry, so the view must redraw after every check. */
  onChecked: () => void;
}) {
  const [state, setState] = useState<State>({ phase: "checking" });
  useEffect(() => {
    let cancelled = false;
    void log.checkForUpdate().then((check) => {
      onChecked();
      if (cancelled) return;
      setState(check.status === "changes" ? { phase: "preview", preview: check.preview } : { phase: check.status });
    });
    return () => {
      cancelled = true;
    };
  }, [log]);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), [state.phase]);

  const apply = (preview: UpdatePreview) => {
    log.applyUpdate(preview);
    onApplied("Log updated from the wiki. Your progress is unchanged.");
  };

  return (
    <div
      className="dialog-backdrop"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="dialog update-dialog" role="dialog" aria-modal="true" aria-labelledby="update-title">
        <h2 id="update-title">Update from the wiki</h2>
        {state.phase === "checking" && <p role="status">Checking the wiki…</p>}
        {state.phase === "unreachable" && <p role="alert">The wiki couldn&apos;t be reached. Nothing was changed.</p>}
        {state.phase === "upToDate" && <p role="status">The log is up to date.</p>}
        {state.phase === "preview" && <Preview preview={state.preview} />}
        <div className="dialog-buttons">
          <button type="button" ref={closeRef} onClick={onClose}>
            {state.phase === "preview" ? "Cancel" : "Close"}
          </button>
          {state.phase === "preview" && (
            <button type="button" className="primary" onClick={() => apply(state.preview)}>
              Apply update
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Preview({ preview }: { preview: UpdatePreview }) {
  const { added, changed, removed } = preview;
  return (
    <div className="update-preview">
      <p>
        Nothing is applied until you choose Apply update. Your progress is never changed; the status of a removed entry
        is kept and comes back if the entry returns.
      </p>
      {added.length > 0 && (
        <section className="update-added">
          <h3>New ({added.length})</h3>
          <ul className="update-items">
            {added.map((e) => (
              <EntryDetails key={e.id} entry={e} />
            ))}
          </ul>
        </section>
      )}
      {changed.length > 0 && (
        <section className="update-changed">
          <h3>Changed ({changed.length})</h3>
          <ul className="update-items">
            {changed.map((c) => (
              <li key={c.after.id} className="update-item">
                <strong className="update-name">{name(c.after)}</strong>
                <ul className="update-diff">
                  {c.fields.map((f) => (
                    <li key={f}>
                      <span className="update-fields">{FIELD_NAMES[f]}:</span> <del>{show(c.before[f])}</del> →{" "}
                      <ins>{show(c.after[f])}</ins>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}
      {removed.length > 0 && (
        <section className="update-removed">
          <h3>Removed ({removed.length})</h3>
          <ul className="update-items">
            {removed.map((e) => (
              <EntryDetails key={e.id} entry={e} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
