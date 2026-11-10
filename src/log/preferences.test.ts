import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "../adapters/memoryStorage";
import { readDisplayMode, writeDisplayMode } from "./index";
import type { Storage } from "./index";

describe("display mode", () => {
  it("is the list until the player chooses cards", () => {
    expect(readDisplayMode(createMemoryStorage())).toBe("list");
  });

  it("is remembered under its key as the literal mode", () => {
    const storage = createMemoryStorage();
    writeDisplayMode(storage, "grid");
    expect(storage.read("contentUnlockLog.displayMode")).toBe("grid");
    expect(readDisplayMode(storage)).toBe("grid");
    writeDisplayMode(storage, "list");
    expect(storage.read("contentUnlockLog.displayMode")).toBe("list");
    expect(readDisplayMode(storage)).toBe("list");
  });

  it("reads anything else as the list", () => {
    const storage = createMemoryStorage();
    storage.write("contentUnlockLog.displayMode", "tiles");
    expect(readDisplayMode(storage)).toBe("list");
  });

  it("still works when the device will not store it", () => {
    const broken: Storage = {
      read: () => {
        throw new Error("blocked");
      },
      write: () => {
        throw new Error("blocked");
      },
    };
    expect(readDisplayMode(broken)).toBe("list");
    expect(() => writeDisplayMode(broken, "grid")).not.toThrow();
  });
});
