import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

// The service worker (scripts/sw.template.js) run against fake `caches`, `fetch` and `self`: install, activate, then
// fetch events with the network off. It sits outside the Log core's test seam because it is not part of the Log core;
// a real browser is still the check for what these fakes cannot show (see docs/agents/verifying-the-ui.md).

const SCOPE = "https://example.test/app/";
const WIKI_ICON = "https://ffxiv.consolegameswiki.com/mediawiki/images/thumb/f/fc/New.png/48px-New.png";
const FONT_FILE = "https://fonts.gstatic.com/s/x.woff2";
const FONT_CSS = "https://fonts.googleapis.com/css2?family=X";

/** A fresh worker with its fake browser: `network` is what it reached, `offline` cuts it off. */
function startWorker({ version = "v1", stores = new Map() } = {}) {
  const template = readFileSync(new URL("./sw.template.js", import.meta.url), "utf8");
  const code = template
    .replace("__VERSION__", version)
    .replace("__PRECACHE__", JSON.stringify(["./", "assets/app.js", "icons/a.png"]))
    .replace("__FONT_STYLESHEETS__", JSON.stringify([FONT_CSS]));

  const state = { offline: false, network: [], matchOptions: [], precacheModes: [], pageFetchModes: [] };
  const response = (url, type = "basic") => ({
    url,
    type,
    ok: type !== "opaque",
    clone() {
      return this;
    },
    text: async () => `@font-face{src:url(${FONT_FILE})}`,
  });
  const key = (r) => (typeof r === "string" ? r : r.url);
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        put: async (r, v) => void store.set(key(r), v),
        match: async (r, options) => {
          state.matchOptions.push(options);
          return store.get(key(r));
        },
        addAll: async (requests) => {
          for (const r of requests) {
            state.precacheModes.push(r.cache);
            store.set(key(r), response(key(r)));
          }
        },
      };
    },
    keys: async () => [...stores.keys()],
    delete: async (name) => void stores.delete(name),
  };
  const listeners = {};
  const self = {
    registration: { scope: SCOPE },
    location: new URL(`${SCOPE}sw.js`),
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener: (type, listener) => (listeners[type] = listener),
  };
  const fetchFn = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    state.network.push(url);
    if (init?.signal) state.pageFetchModes.push(init.cache);
    if (state.offline) throw new TypeError("offline");
    return response(url, url.startsWith("https://ffxiv.consolegameswiki.com") ? "opaque" : "basic");
  };
  vm.runInNewContext(code, {
    self,
    caches,
    fetch: fetchFn,
    Request: class {
      constructor(url, init) {
        Object.assign(this, { url, ...init });
      }
    },
    Response: { error: () => "ERROR" },
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
  });

  /** Dispatches an event and returns what the worker passed to waitUntil or respondWith. */
  const dispatch = async (type, event = {}) => {
    let result;
    listeners[type]({ ...event, waitUntil: (p) => (result = p), respondWith: (p) => (result = p) });
    return result;
  };
  const fetchEvent = (url, mode = "no-cors") => dispatch("fetch", { request: { url, method: "GET", mode } });
  return { state, stores, dispatch, fetchEvent, listeners };
}

describe("service worker", () => {
  it("keeps the app shell and the fonts when it installs, then deletes older shell caches when it activates", async () => {
    const worker = startWorker({ version: "v2", stores: new Map([["shell-v1", new Map()]]) });

    await worker.dispatch("install");
    await worker.dispatch("activate");

    expect([...worker.stores.keys()].sort()).toEqual(["runtime-v1", "shell-v2"]);
    expect([...worker.stores.get("shell-v2").keys()]).toEqual([
      `${SCOPE}`,
      `${SCOPE}assets/app.js`,
      `${SCOPE}icons/a.png`,
    ]);
    expect([...worker.stores.get("runtime-v1").keys()]).toEqual([FONT_CSS, FONT_FILE]);
  });

  it("installs the shell from the network and revalidates the page, never trusting the browser's HTTP cache", async () => {
    const worker = startWorker();

    await worker.dispatch("install");
    await worker.fetchEvent(SCOPE, "navigate");

    expect(worker.state.precacheModes).toEqual(["reload", "reload", "reload"]);
    expect(worker.state.pageFetchModes).toEqual(["no-cache"]);
  });

  it("serves the page, a bundled file and the fonts with the network off", async () => {
    const worker = startWorker();
    await worker.dispatch("install");
    worker.state.offline = true;

    expect((await worker.fetchEvent(`${SCOPE}?x=1`, "navigate")).url).toBe(SCOPE);
    expect((await worker.fetchEvent(`${SCOPE}assets/app.js`, "cors")).url).toBe(`${SCOPE}assets/app.js`);
    expect((await worker.fetchEvent(FONT_FILE, "cors")).url).toBe(FONT_FILE);
  });

  it("keeps a wiki icon the first time it is fetched and serves it with the network off", async () => {
    const worker = startWorker();
    await worker.dispatch("install");

    expect((await worker.fetchEvent(WIKI_ICON)).type).toBe("opaque");
    worker.state.offline = true;
    worker.state.network.length = 0;

    expect((await worker.fetchEvent(WIKI_ICON)).type).toBe("opaque");
    expect(worker.state.network).toEqual([]);
  });

  it("looks files up ignoring Vary, so a server's `Vary: Origin` cannot hide a cached script", async () => {
    const worker = startWorker();
    await worker.dispatch("install");
    worker.state.offline = true;
    worker.state.matchOptions.length = 0;

    await worker.fetchEvent(`${SCOPE}assets/app.js`, "cors");
    await worker.fetchEvent(SCOPE, "navigate");

    expect(worker.state.matchOptions).toEqual([{ ignoreVary: true }, { ignoreVary: true }]);
  });

  it("leaves requests to the wiki's API alone", async () => {
    const worker = startWorker();
    let responded = false;

    const result = worker.listeners.fetch({
      request: { url: "https://ffxiv.consolegameswiki.com/mediawiki/api.php", method: "GET", mode: "cors" },
      respondWith: () => (responded = true),
    });

    expect(result).toBeUndefined();
    expect(responded).toBe(false);
  });
});
