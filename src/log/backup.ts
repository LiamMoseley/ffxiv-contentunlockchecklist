import type { EntryStatus, StatusRecord } from "./progress";

/**
 * The backup file: one JSON document holding every character with its entry statuses and their
 * timestamps. A persisted contract, so later versions of the app (and sync) must keep reading it.
 */
export const BACKUP_FORMAT_VERSION = 1;

export type BackupCharacter = {
  name: string;
  world: string;
  dataCenter: string;
  level: number | null;
  updatedAt: string;
  /** By entry ID, orphaned statuses included. */
  statuses: Record<string, StatusRecord>;
};

export type Backup = {
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  characters: BackupCharacter[];
};

export type BackupError = "notABackup" | "newerVersion" | "unknownWorld";

const STATUSES: EntryStatus[] = ["unmarked", "completed", "notInterested"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isStatusRecord(value: unknown): value is StatusRecord {
  return isRecord(value) && STATUSES.includes(value.status as EntryStatus) && typeof value.updatedAt === "string";
}

function isBackupCharacter(value: unknown): value is BackupCharacter {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    value.name.trim() !== "" &&
    typeof value.world === "string" &&
    typeof value.dataCenter === "string" &&
    (value.level === null || typeof value.level === "number") &&
    typeof value.updatedAt === "string" &&
    isRecord(value.statuses) &&
    Object.values(value.statuses).every(isStatusRecord)
  );
}

/** Reads the text of a backup file, rejecting anything that is not one this version can read. */
export function parseBackup(text: string): { ok: true; backup: Backup } | { ok: false; error: BackupError } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "notABackup" };
  }
  if (!isRecord(data) || typeof data.formatVersion !== "number") return { ok: false, error: "notABackup" };
  if (data.formatVersion > BACKUP_FORMAT_VERSION) return { ok: false, error: "newerVersion" };
  if (data.formatVersion !== BACKUP_FORMAT_VERSION) return { ok: false, error: "notABackup" };
  if (!Array.isArray(data.characters) || !data.characters.every(isBackupCharacter))
    return { ok: false, error: "notABackup" };
  return { ok: true, backup: data as unknown as Backup };
}
