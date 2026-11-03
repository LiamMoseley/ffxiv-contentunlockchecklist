import type { Storage } from "../log";

/** Storage adapter that keeps everything in memory. Used in tests. */
export function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    read: (key) => values.get(key) ?? null,
    write: (key, value) => void values.set(key, value),
  };
}
