import type { Storage } from "./log";

/** How entries are laid out: a table, or cards. */
export type DisplayMode = "list" | "grid";

const DISPLAY_MODE_KEY = "contentUnlockLog.displayMode";

/** The remembered display mode; storage that is unavailable or holds anything else means the list. */
export function readDisplayMode(preferences: Storage): DisplayMode {
  try {
    return preferences.read(DISPLAY_MODE_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

/** Remembers the display mode; the choice still holds for this visit when the device will not store it. */
export function writeDisplayMode(preferences: Storage, mode: DisplayMode): void {
  try {
    preferences.write(DISPLAY_MODE_KEY, mode);
  } catch {
    // Not stored.
  }
}
