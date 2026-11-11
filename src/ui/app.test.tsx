// @vitest-environment jsdom
import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createMemoryStorage } from "../adapters/memoryStorage";
import bundledContent from "../content/bundled-content.json";
import { createLog, type Content } from "../log";
import { App } from "./App";

/** The bundled content with an in-memory store, a fixed clock and a wiki that is never reached. */
function openLog() {
  const storage = createMemoryStorage();
  const log = createLog({
    content: bundledContent as Content,
    storage,
    clock: { now: () => new Date("2026-11-03T12:00:00.000Z") },
    wiki: {
      fetchPage: () => Promise.reject(new Error("offline")),
      fetchRevisionId: () => Promise.reject(new Error("offline")),
    },
  });
  return { log, storage };
}

/** A smoke test, not a UI test: the page must render and survive a click on each rail tile. */
describe("App renders", () => {
  let root: Root | null = null;
  let host: HTMLElement;

  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    // jsdom has no layout engine, so the rail's tile observer is a stub.
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    host.remove();
  });

  async function mount() {
    const { log, storage } = openLog();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root!.render(
        <StrictMode>
          <App log={log} preferences={storage} />
        </StrictMode>,
      );
    });
  }

  it("shows the rail and the list on load", async () => {
    await mount();
    expect(host.querySelector("nav[aria-label='Expansions']")).not.toBeNull();
    expect(host.querySelectorAll(".entries tbody tr, .grid > *").length).toBeGreaterThan(0);
  });

  it("survives choosing each tile and each section tab", async () => {
    await mount();
    for (const tile of host.querySelectorAll<HTMLElement>(".rail-item")) {
      await act(async () => tile.click());
      expect(host.querySelector(".scroll")).not.toBeNull();
      for (const tab of host.querySelectorAll<HTMLElement>("[role=tab]")) {
        await act(async () => tab.click());
        expect(host.querySelector(".scroll")).not.toBeNull();
      }
    }
  });
});
