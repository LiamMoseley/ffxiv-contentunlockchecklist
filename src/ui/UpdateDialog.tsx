import { useEffect, useRef, useState } from "react";
import type { Entry, Log, UpdatePreview } from "../log";

type State =
  | { phase: "checking" }
  | { phase: "unreachable" }
  | { phase: "upToDate" }
  | { phase: "preview"; preview: UpdatePreview };

const FIELD_NAMES = {
  level: "level",
  itemLevel: "item level",
  unlock: "unlock",
  type: "type",
  quest: "quest",
  location: "location",
  information: "information",
  optionalChallenge: "optional challenge tag",
} as const;

const name = (entry: Entry) => entry.unlock || entry.quest;

/** Fetches the wiki's list and shows what would change; the player applies it or leaves it. */
export function UpdateDialog({
  log,
  onClose,
  onApplied,
}: {
  log: Log;
  onClose: () => void;
  onApplied: (message: string) => void;
}) {
  const [state, setState] = useState<State>({ phase: "checking" });
  useEffect(() => {
    let cancelled = false;
    void log.checkForUpdate().then((check) => {
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
        <section>
          <h3>New ({added.length})</h3>
          <ul>
            {added.map((e) => (
              <li key={e.id}>{name(e)}</li>
            ))}
          </ul>
        </section>
      )}
      {changed.length > 0 && (
        <section>
          <h3>Changed ({changed.length})</h3>
          <ul>
            {changed.map((c) => (
              <li key={c.after.id}>
                {name(c.after)}{" "}
                <span className="update-fields">({c.fields.map((f) => FIELD_NAMES[f]).join(", ")})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {removed.length > 0 && (
        <section>
          <h3>Removed ({removed.length})</h3>
          <ul>
            {removed.map((e) => (
              <li key={e.id}>{name(e)}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
