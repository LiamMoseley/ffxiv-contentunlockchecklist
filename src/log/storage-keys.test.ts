import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dir = new URL("./", import.meta.url);
const read = (name: string) => readFileSync(new URL(name, dir), "utf8");

/** Every storage key the Log core writes: the `contentUnlockLog.*` string constants in log.ts and preferences.ts. */
const keys = ["log.ts", "preferences.ts"].flatMap((file) =>
  [...read(file).matchAll(/"(contentUnlockLog\.[A-Za-z]+)"/g)].map((m) => m[1]),
);

const otherTests = readdirSync(dir)
  .filter((f) => f.endsWith(".test.ts") && f !== "storage-keys.test.ts")
  .map(read)
  .join("\n");

describe("persisted storage keys", () => {
  it("finds the Log core's keys", () => {
    expect(keys.length).toBeGreaterThan(0);
  });

  it.each(keys)(
    "%s has a test asserting its literal key (CODING_STANDARDS.md: persisted formats are contracts)",
    (key) => {
      expect(otherTests).toContain(`"${key}"`);
    },
  );
});
