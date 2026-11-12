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
    // ...and no matchMedia: the search placeholder asks whether the device is a touch one.
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
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

  it("opens the help dialog from the (?) button", async () => {
    await mount();
    const button = host.querySelector<HTMLElement>("button[aria-label='Help']");
    expect(button).not.toBeNull();
    await act(async () => button!.click());
    expect(host.querySelector("[role=dialog][aria-labelledby='help-title']")).not.toBeNull();
  });

  async function openHelp() {
    const button = host.querySelector<HTMLElement>("button[aria-label='Help']")!;
    button.focus();
    await act(async () => button.click());
    return button;
  }
  const helpDialog = () => host.querySelector("[role=dialog][aria-labelledby='help-title']");
  const press = (key: string, target: Element) =>
    act(async () => void target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })));
  /** Focus returns to the opener on a deferred timer. */
  const settle = () => act(async () => void (await new Promise((resolve) => setTimeout(resolve, 10))));

  it("shows every help topic in the dialog", async () => {
    await mount();
    await openHelp();
    const headings = [...helpDialog()!.querySelectorAll("h3")].map((h) => h.textContent);
    expect(headings).toEqual([
      "Mouse",
      "Touch",
      "Keyboard",
      "Status boxes",
      "Undo",
      "Filters and search",
      "Characters",
      "Levels and Available now",
      "Expansion tiles",
    ]);
  });

  it("closes the help dialog with Close and with Escape, returning focus to the (?)", async () => {
    await mount();
    const opener = await openHelp();
    const close = [...helpDialog()!.querySelectorAll("button")].find((b) => b.textContent === "Close")!;
    await act(async () => close.click());
    await settle();
    expect(helpDialog()).toBeNull();
    expect(document.activeElement).toBe(opener);

    await openHelp();
    await press("Escape", helpDialog()!.querySelector("button")!);
    await settle();
    expect(helpDialog()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("leaves the app's shortcuts alone while the help dialog is open", async () => {
    await mount();
    await openHelp();
    await press("/", helpDialog()!.querySelector("button")!);
    expect(host.querySelector(".filter-bar-wrap.closed")).not.toBeNull();
  });

  it("opens the filters with / outside a dialog", async () => {
    await mount();
    await press("/", document.body);
    expect(host.querySelector(".filter-bar-wrap")).not.toBeNull();
    expect(host.querySelector(".filter-bar-wrap.closed")).toBeNull();
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
