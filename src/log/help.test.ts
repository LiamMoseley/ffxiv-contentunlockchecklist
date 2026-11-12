import { describe, expect, it } from "vitest";
import { helpContent } from "./index";

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

  it("says Undo reverses the last change", () => {
    expect(help.undo).toBe("Undo reverses the last change.");
  });
});
