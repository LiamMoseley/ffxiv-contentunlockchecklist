import { useEffect, useRef, useState, type FormEvent } from "react";
import type { BackupError, Character, CharacterError, Log } from "../log";
import { ConfirmDialog } from "./Messages";
import { Count, ProgressBar } from "./ProgressBar";

const ERROR_TEXT: Record<CharacterError, string> = {
  nameRequired: "Enter a name.",
  invalidLevel: "Level must be a whole number from 1 to 100.",
  unknownWorld: "Choose a World from the list.",
  nameTaken: "Another character already has this name on this World.",
  notFound: "That character no longer exists.",
};

const IMPORT_ERROR_TEXT: Record<BackupError, string> = {
  notABackup: "That file is not a backup from this app.",
  newerVersion: "That backup was made by a newer version of the app. Update the app to read it.",
};

type Mode =
  { kind: "list" } | { kind: "form"; editing: Character | null } | { kind: "confirm"; action: "reset" | "delete" };

/**
 * The character switcher, opened from the title bar: lists every character with its progress and
 * adds, edits, resets and deletes them. Reset and Delete apply to the current character.
 * `onChange` is called after each change to the log, with a message to show when there is one.
 */
export function CharacterMenu({
  log,
  onClose,
  onChange,
}: {
  log: Log;
  onClose: () => void;
  onChange: (message?: string) => void;
}) {
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const current = log.currentCharacter();
  const label = log.characterLabel(current);
  const onlyOne = log.characters().length === 1;
  const fileRef = useRef<HTMLInputElement>(null);

  const exportBackup = () => {
    const { fileName, json } = log.exportBackup();
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    onChange(`Saved ${fileName}.`);
  };

  const importBackup = async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const result = log.importBackup(await file.text());
    if (!result.ok) {
      onChange(IMPORT_ERROR_TEXT[result.error]);
      return;
    }
    const { charactersAdded, charactersMerged, entriesAdded } = result;
    if (charactersAdded === 0 && entriesAdded === 0) {
      onChange("Nothing to import: this device already has everything in that backup.");
      return;
    }
    onChange(
      `Imported ${entriesAdded} ${entriesAdded === 1 ? "entry" : "entries"}: ${charactersAdded} character${charactersAdded === 1 ? "" : "s"} added, ${charactersMerged} filled in. Undo to revert.`,
    );
  };

  if (mode.kind === "form") {
    return (
      <CharacterForm
        log={log}
        editing={mode.editing}
        onCancel={() => setMode({ kind: "list" })}
        onSaved={(saved, adding) => {
          if (adding) log.switchCharacter(saved.id);
          onChange(adding ? `Added ${log.characterLabel(saved)}.` : `Saved ${log.characterLabel(saved)}.`);
          setMode({ kind: "list" });
        }}
      />
    );
  }

  return (
    <>
      <div
        className="dialog-backdrop"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <div className="dialog character-menu" role="dialog" aria-modal="true" aria-labelledby="character-menu-title">
          <h2 id="character-menu-title">Characters</h2>
          <ul className="character-list">
            {log.characters().map((character) => {
              const progress = log.characterProgress(character.id);
              const isCurrent = character.id === current.id;
              return (
                <li key={character.id}>
                  <button
                    type="button"
                    className={`character-row${isCurrent ? " current" : ""}`}
                    aria-current={isCurrent}
                    autoFocus={isCurrent}
                    onClick={() => {
                      log.switchCharacter(character.id);
                      onChange();
                    }}
                  >
                    <span className="character-row-name">{log.characterLabel(character)}</span>
                    <span className="character-row-level">
                      {character.level !== null ? `Level ${character.level}` : "No level"}
                    </span>
                    <ProgressBar progress={progress} label={`${log.characterLabel(character)} progress`} thin />
                    <Count progress={progress} />
                  </button>
                </li>
              );
            })}
          </ul>
          <h3 className="character-section-title">Character</h3>
          <div className="dialog-buttons character-actions">
            <button type="button" onClick={() => setMode({ kind: "form", editing: null })}>
              Add character
            </button>
            <button type="button" onClick={() => setMode({ kind: "form", editing: current })}>
              Edit character
            </button>
            <button type="button" onClick={() => setMode({ kind: "confirm", action: "reset" })}>
              Reset
            </button>
            <button
              type="button"
              disabled={onlyOne}
              title={onlyOne ? "The last character can't be deleted" : undefined}
              onClick={() => setMode({ kind: "confirm", action: "delete" })}
            >
              Delete
            </button>
          </div>
          <h3 className="character-section-title">Backup</h3>
          <div className="dialog-buttons character-actions">
            <button type="button" onClick={exportBackup}>
              Export backup
            </button>
            <button type="button" onClick={() => fileRef.current?.click()}>
              Import backup
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              aria-label="Backup file"
              onChange={(event) => void importBackup(event.target)}
            />
          </div>
          <div className="dialog-buttons character-actions">
            <button type="button" className="primary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
      {mode.kind === "confirm" && mode.action === "reset" && (
        <ConfirmDialog
          title="Reset progress"
          text={`Clear all progress for ${label}? Other characters are not affected.`}
          confirmLabel="Reset"
          onCancel={() => setMode({ kind: "list" })}
          onConfirm={() => {
            log.resetCharacter();
            onChange(`Reset progress for ${label} only.`);
            onClose();
          }}
        />
      )}
      {mode.kind === "confirm" && mode.action === "delete" && (
        <ConfirmDialog
          title="Delete character"
          text={`Delete ${label} and their progress? You can undo this straight after.`}
          confirmLabel="Delete"
          onCancel={() => setMode({ kind: "list" })}
          onConfirm={() => {
            const result = log.deleteCharacter(current.id);
            onChange(result.ok ? `Deleted ${label}.` : "The last character can't be deleted.");
            setMode({ kind: "list" });
          }}
        />
      )}
    </>
  );
}

function CharacterForm({
  log,
  editing,
  onCancel,
  onSaved,
}: {
  log: Log;
  editing: Character | null;
  onCancel: () => void;
  onSaved: (saved: Character, adding: boolean) => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [world, setWorld] = useState(editing?.world ?? "");
  const [level, setLevel] = useState(editing?.level?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => nameRef.current?.select(), []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const details = { name, world, level: level.trim() === "" ? null : Number(level) };
    const result = editing ? log.editCharacter(editing.id, details) : log.addCharacter(details);
    if (result.ok) onSaved(result.character, !editing);
    else setError(ERROR_TEXT[result.error]);
  };

  return (
    <div
      className="dialog-backdrop"
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
    >
      <form
        className="dialog character-form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-form-title"
        onSubmit={submit}
        noValidate
      >
        <h2 id="character-form-title">{editing ? "Edit character" : "Add character"}</h2>
        <label>
          Name
          <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </label>
        <label>
          World (optional)
          <select value={world} onChange={(e) => setWorld(e.target.value)}>
            <option value="">No World</option>
            {log.worlds().map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
        <p className="form-data-center">Data Center: {log.dataCenterOf(world) ?? "none"}</p>
        <label>
          Level (optional)
          <input value={level} onChange={(e) => setLevel(e.target.value)} inputMode="numeric" autoComplete="off" />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-buttons">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary">
            {editing ? "Save" : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}
