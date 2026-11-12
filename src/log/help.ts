import type { EntryStatus } from "./progress";

export type HelpControl = { keys: string; does: string };
export type HelpControlGroup = { title: string; items: HelpControl[] };
export type HelpContent = {
  controls: HelpControlGroup[];
  statusBoxes: { status: EntryStatus; meaning: string }[];
  undo: string;
};

/**
 * What the help dialog says. The keyboard list names every shortcut the UI binds (entry keys in
 * `EntryList`, search and Undo in `App`, Tab and Escape in `Dialog`): a new shortcut is added here too.
 */
export function helpContent(): HelpContent {
  return {
    controls: [
      {
        title: "Mouse",
        items: [
          { keys: "Left click", does: "Completes the entry." },
          { keys: "Right click", does: "Sets the entry to Not interested." },
        ],
      },
      {
        title: "Touch",
        items: [
          { keys: "Tap", does: "Completes the entry." },
          { keys: "Long-press", does: "Sets the entry to Not interested." },
        ],
      },
      {
        title: "Keyboard",
        items: [
          { keys: "Space", does: "Completes the focused entry, like a left click." },
          { keys: "X", does: "Sets the focused entry to Not interested, like a right click." },
          { keys: "/ or Ctrl/Cmd+K", does: "Opens the filters and moves focus to the search box." },
          { keys: "Ctrl/Cmd+Z", does: "Undoes the last change." },
          { keys: "Tab", does: "Moves focus to the next control; Shift+Tab goes back." },
          { keys: "Escape", does: "Closes the open dialog." },
        ],
      },
    ],
    statusBoxes: [
      { status: "unmarked", meaning: "An empty box: you have not marked this entry yet." },
      { status: "completed", meaning: "A yellow box: you have unlocked this entry. It is dimmed in the list." },
      {
        status: "notInterested",
        meaning: "A grey box with a diagonal stroke: you will not do this entry. It is left out of progress counts.",
      },
    ],
    undo: "Undo reverses the last change.",
  };
}
