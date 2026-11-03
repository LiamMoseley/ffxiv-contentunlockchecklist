/**
 * Progress, stored as current state in the sync-ready shape of ADR-0001: every character and every
 * (character, entry) status carries when it last changed, and characters are marked deleted rather
 * than erased.
 */

export type EntryStatus = "unmarked" | "completed" | "notInterested";

export type Character = {
  /** Random, and never changes: name and World are not the identity. */
  id: string;
  name: string;
  world: string;
  dataCenter: string;
  level: number | null;
  updatedAt: string;
  deleted: boolean;
};

export type StatusRecord = { status: EntryStatus; updatedAt: string };

export type Progress = {
  formatVersion: 1;
  characters: Record<string, Character>;
  /** By character ID, then entry ID. Unmarked is a missing record or one set back to Unmarked. */
  statuses: Record<string, Record<string, StatusRecord>>;
};

export const DEFAULT_CHARACTER_NAME = "Adventurer";

export function newProgress(characterId: string, now: string): Progress {
  return {
    formatVersion: 1,
    characters: {
      [characterId]: {
        id: characterId,
        name: DEFAULT_CHARACTER_NAME,
        world: "",
        dataCenter: "",
        level: null,
        updatedAt: now,
        deleted: false,
      },
    },
    statuses: {},
  };
}
