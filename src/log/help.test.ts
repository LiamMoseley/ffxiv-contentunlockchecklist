import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { helpContent } from "./index";

const uiDir = new URL("../ui/", import.meta.url);

/** Every key the UI compares `event.key` with (`=== "x"`, `!== "Tab"`), as the help dialog names it. */
const boundKeys = [
  ...new Set(
    readdirSync(uiDir)
      .filter((file) => file.endsWith(".tsx") && !file.endsWith(".test.tsx"))
      .flatMap((file) => [
        ...readFileSync(new URL(file, uiDir), "utf8").matchAll(/\.key(?:\.toLowerCase\(\))? [!=]== "([^"]+)"/g),
      ])
      .map((match) => (match[1] === " " ? "Space" : match[1]!)),
  ),
];

describe("help content covers the UI's key bindings", () => {
  const listed = helpContent()
    .controls.find((group) => group.title === "Keyboard")!
    .items.map((item) => item.keys)
    .join(" | ")
    .toLowerCase();

  it("finds the UI's key bindings", () => {
    expect(boundKeys.length).toBeGreaterThan(0);
  });

  it.each(boundKeys)("lists the %s key (CODING_STANDARDS.md: the help names every shortcut the UI binds)", (key) => {
    expect(listed).toContain(key.toLowerCase());
  });
});

describe("help content", () => {
  const help = helpContent();
  const group = (title: string) => help.controls.find((g) => g.title === title)?.items ?? [];

  it("explains the mouse controls", () => {
    expect(group("Mouse")).toEqual([
      { keys: "Left click", does: "Completes the entry." },
      { keys: "Right click", does: "Sets the entry to Not interested." },
    ]);
  });

  it("explains the touch controls", () => {
    expect(group("Touch")).toEqual([
      { keys: "Tap", does: "Completes the entry." },
      { keys: "Long-press", does: "Sets the entry to Not interested." },
    ]);
  });

  it("lists every keyboard shortcut the app binds", () => {
    expect(group("Keyboard").map((item) => item.keys)).toEqual([
      "Space",
      "X",
      "/ or Ctrl/Cmd+K",
      "Ctrl/Cmd+Z",
      "Tab",
      "Escape",
    ]);
  });

  it("describes the three status boxes", () => {
    expect(help.statusBoxes.map((box) => box.status)).toEqual(["unmarked", "completed", "notInterested"]);
    for (const box of help.statusBoxes) expect(box.meaning.length).toBeGreaterThan(0);
  });

  it("explains the expansion tiles, filters, characters and levels", () => {
    expect(help.topics.map((topic) => [topic.group, topic.title])).toEqual([
      ["view", "Filters and search"],
      ["setup", "Characters"],
      ["setup", "Levels and Available now"],
      ["setup", "Expansion tiles"],
    ]);
    const text = (title: string) => help.topics.find((topic) => topic.title === title)?.text ?? "";
    expect(text("Expansion tiles")).toContain("Available now");
    expect(text("Filters and search")).toContain("Optional challenges");
    expect(text("Characters")).toContain("Export");
    expect(text("Levels and Available now")).toContain("Set level");
  });

  it("says Undo reverses the last change", () => {
    expect(help.undo).toBe("Undo reverses the last change.");
  });
});
