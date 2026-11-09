import { useEffect, useRef, useState } from "react";
import type { Entry, Log, SuggestedMatch, UpdatePreview } from "../log";

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

  /** The second step: the suggested matches, shown after the new, changed and removed entries. */
  const [reviewing, setReviewing] = useState(false);
  /** The ticked matches. Nothing is saved until Apply; the Log core treats every unticked match as declined. */
  const [accepted, setAccepted] = useState<SuggestedMatch[]>([]);
  const tick = (match: SuggestedMatch, ticked: boolean) =>
    setAccepted((list) => (ticked ? [...list, match] : list.filter((m) => m !== match)));

  const apply = (preview: UpdatePreview) => {
    log.applyUpdate(preview, accepted);
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
        {state.phase === "preview" && !reviewing && <Preview preview={state.preview} />}
        {state.phase === "preview" && reviewing && (
          <Matches preview={state.preview} accepted={accepted} onTick={tick} />
        )}
        <div className="dialog-buttons">
          <button type="button" ref={closeRef} onClick={onClose}>
            {state.phase === "preview" ? "Cancel" : "Close"}
          </button>
          {state.phase === "preview" && reviewing && (
            <button type="button" onClick={() => setReviewing(false)}>
              Back
            </button>
          )}
          {state.phase === "preview" && !reviewing && state.preview.suggestions.length > 0 && (
            <button type="button" className="primary" onClick={() => setReviewing(true)}>
              Review suggested matches
            </button>
          )}
          {state.phase === "preview" && (reviewing || state.preview.suggestions.length === 0) && (
            <button type="button" className="primary" onClick={() => apply(state.preview)}>
              Apply update
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** The second step: a tick box per suggested match, to choose which to accept before the update is applied. */
function Matches({
  preview,
  accepted,
  onTick,
}: {
  preview: UpdatePreview;
  accepted: SuggestedMatch[];
  onTick: (match: SuggestedMatch, ticked: boolean) => void;
}) {
  return (
    <div className="update-preview">
      <p>
        These entries look renamed. Tick a match to move its progress, for every character, to the new entry. A match
        you leave unticked moves nothing and is never suggested again. Nothing is saved until you choose Apply update.
      </p>
      <div className="update-scroll">
        <section className="update-matches">
          <h3>Suggested matches ({preview.suggestions.length})</h3>
          <ul className="update-items">
            {preview.suggestions.map((m) => (
              <li key={`${m.from.id}|${m.to.id}`} className="update-item">
                <label className="update-match">
                  <input type="checkbox" checked={accepted.includes(m)} onChange={(e) => onTick(m, e.target.checked)} />
                  <span>
                    <strong className="update-name">{name(m.from)}</strong> → <strong>{name(m.to)}</strong>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Preview({ preview }: { preview: UpdatePreview }) {
  const { added, changed, removed } = preview;
  return (
    <div className="update-preview">
      <p>
        Nothing is applied until you choose Apply update. Your progress is never changed
        {preview.suggestions.length > 0 ? " unless you accept a suggested match" : ""}; the status of a removed entry is
        kept and comes back if the entry returns.
      </p>
      <div className="update-scroll">
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
    </div>
  );
}
