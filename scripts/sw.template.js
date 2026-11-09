// The app's service worker (ADR-0002, US-24). `scripts/serviceWorkerPlugin.ts` fills in the three placeholders
// below and writes the result to dist/sw.js at build time, so the file changes (and the browser installs it)
// exactly when a deploy changes something the app needs.
//
// - The shell cache holds the app's own files: page, scripts, styles, bundled content (inside the scripts) and icons.
//   It is named for the build, so a new deploy gets a fresh one and the old one is deleted.
// - The runtime cache holds what comes from other sites: the Google fonts and the wiki icons that only appear after
//   an in-browser update. It outlives deploys, since those files do not change with them.

const VERSION = "__VERSION__";
const PRECACHE = /** @type {string[]} */ (__PRECACHE__);
const FONT_STYLESHEETS = /** @type {string[]} */ (__FONT_STYLESHEETS__);

const SHELL = `shell-${VERSION}`;
const RUNTIME = "runtime-v1";
const WIKI_IMAGES = "https://ffxiv.consolegameswiki.com/mediawiki/images/";
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];
const NAVIGATION_TIMEOUT_MS = 3000;

const scopeUrl = (path) => new URL(path, self.registration.scope).href;
const indexUrl = () => scopeUrl("./");

/** Keeps the fonts for offline use: the stylesheet, and the font files it names. */
async function cacheFonts() {
  const cache = await caches.open(RUNTIME);
  for (const stylesheet of FONT_STYLESHEETS) {
    const response = await fetch(stylesheet);
    if (!response.ok) continue;
    await cache.put(stylesheet, response.clone());
    const files = [...(await response.text()).matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]);
    await Promise.all(
      files.map(async (file) => {
        const font = await fetch(file);
        if (font.ok) await cache.put(file, font);
      }),
    );
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL);
      await shell.addAll(PRECACHE.map(scopeUrl));
      // Fonts are a nicety: without them the app falls back to its other fonts, so a failure here must not
      // stop the update from installing.
      await cacheFonts().catch(() => {});
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name !== SHELL && name !== RUNTIME) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

/** The cached response if there is one; otherwise the network's, kept when it is usable. */
async function cacheFirst(request, cacheName, { keepOpaque = false } = {}) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || (keepOpaque && response.type === "opaque")) await cache.put(request, response.clone());
  return response;
}

/**
 * The page: the network's if it answers promptly (so a new deploy shows on the next visit), else the cached copy
 * (offline, or on a connection too slow to wait for).
 */
async function page(request) {
  const cache = await caches.open(SHELL);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NAVIGATION_TIMEOUT_MS);
    const response = await fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
    if (response.ok && new URL(request.url).pathname === new URL(indexUrl()).pathname) {
      await cache.put(indexUrl(), response.clone());
    }
    return response;
  } catch {
    return (await cache.match(indexUrl())) ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(page(request));
  } else if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, SHELL));
  } else if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request, RUNTIME));
  } else if (request.url.startsWith(WIKI_IMAGES)) {
    // An icon is an <img> request, which the page makes without a referrer; the wiki rejects images that carry one.
    event.respondWith(cacheFirst(request, RUNTIME, { keepOpaque: true }));
  }
});
