import type { EntryStatus } from "./progress";

export type HelpControl = { keys: string; does: string };
export type HelpControlGroup = { title: string; items: HelpControl[] };
export type HelpContent = {
  controls: HelpControlGroup[];
  statusBoxes: { status: EntryStatus; meaning: string }[];
  undo: string;
  /** Plain explanations of the app's features, each a title and one paragraph. `view` topics sit beside the
   * status boxes and Undo, `setup` topics (filters, characters) in a group of their own. */
  topics: { group: "view" | "setup"; title: string; text: string }[];
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
          {
            keys: "Space",
            does: "Completes the focused entry, like a left click. Enter does the same on its status box.",
          },
          { keys: "X", does: "Sets the focused entry to Not interested, like a right click." },
          { keys: "/ or Ctrl/Cmd+K", does: "Opens the filters and moves focus to the search box." },
          { keys: "Ctrl/Cmd+Z", does: "Undoes the last change." },
          { keys: "Tab", does: "Moves focus to the next control; Shift+Tab goes back." },
          { keys: "Escape", does: "Closes the open dialog, or clears the text in the search box." },
        ],
      },
    ],
    statusBoxes: [
      { status: "unmarked", meaning: "An empty box: you have not marked this entry yet." },
      { status: "completed", meaning: "A yellow box: you have completed this entry. It is dimmed in the list." },
      {
        status: "notInterested",
        meaning: "A grey box with a diagonal stroke: you will not do this entry. It is left out of progress counts.",
      },
    ],
    undo: "Undo reverses the last change.",
    topics: [
      {
        group: "view",
        title: "Filters and search",
        text: "Filters opens a panel, and so does pressing /. Search matches any word in the entries in view. Type shows one kind of content, Optional challenges hides them or shows only them, and two checkboxes hide Completed or Not interested entries. Filters are remembered, and a number on the button counts those in use. Clear filters resets them all. Complete Shown and Clear Shown act only on the entries the filters leave showing.",
      },
      {
        group: "setup",
        title: "Characters",
        text: "The button at the top right names the current character. Select it to switch characters, or to Add, Edit, Reset or Delete one. Progress, counts and filters belong to the current character only, and Reset clears only theirs. Export saves every character to a backup file, and Import adds that file's progress back.",
      },
      {
        group: "setup",
        title: "Levels and Available now",
        text: "Give a character a level, their highest job level, when you add or edit them. Available now then lists every Unmarked entry they can reach at that level, and an entry leaves the list when you complete it. Without a level it shows a Set level button.",
      },
      {
        group: "setup",
        title: "Expansion tiles",
        text: "The tiles on the left choose what the list shows: Available now, All (every expansion) or one expansion, each with its progress bar. For an expansion, the tabs above the list switch between its sections. The arrow at the bottom of the tiles shrinks them to save room.",
      },
    ],
  };
}
