import { WIKI_IMAGE_BASE } from "../log";

/** Registers the service worker that keeps the app working offline. Not in development, where it would serve stale files. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

const requested = new Set<string>();

/**
 * Fetches wiki icons the app does not ship, so the service worker keeps them for offline use. The wiki rejects
 * images that carry a Referer, so none is sent. Does nothing until the service worker controls the page, since an
 * earlier request would not be kept; the caller asks again on a later render.
 */
export function cacheWikiIcons(icons: string[]): void {
  if (!navigator.serviceWorker?.controller || !navigator.onLine) return;
  for (const icon of icons) {
    if (requested.has(icon)) continue;
    requested.add(icon);
    fetch(WIKI_IMAGE_BASE + icon, { mode: "no-cors", referrerPolicy: "no-referrer" }).catch(() =>
      requested.delete(icon),
    );
  }
}
