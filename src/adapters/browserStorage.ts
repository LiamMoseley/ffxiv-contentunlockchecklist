import type { Storage } from "../log";

/** Storage adapter backed by the browser's localStorage. */
export function createBrowserStorage(local: globalThis.Storage = window.localStorage): Storage {
  return {
    read: (key) => local.getItem(key),
    write: (key, value) => local.setItem(key, value),
  };
}
