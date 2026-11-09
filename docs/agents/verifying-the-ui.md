# Verifying the UI in the browser pane

Start the app with `preview_start {name: "dev"}` (`.claude/launch.json`).

- **Drive forms with `form_input`, `find` and `javascript_tool`.** Typing with `computer` into dialog fields lost keystrokes here, and a screenshot taken straight after an action can show the state before it.
- **Prove styling with computed styles** (`getComputedStyle(el)` through `javascript_tool`: font family, size, transform), then take one screenshot for the owner.
- **Set up state through `localStorage`** (`contentUnlockLog.progress`, `contentUnlockLog.currentCharacter`), then reload: faster than clicking through the UI.
- **Wait about 500ms after an action, then read the page, before any screenshot or zoom.** A capture straight after a click, a reload or a style edit shows the old render; re-capture once before concluding a change did not apply.
- **Set a React input with the native setter, then dispatch `input` (text) or `change` (select).** Assigning `.value` directly is ignored: `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "text")` (`HTMLSelectElement` for a select), then `el.dispatchEvent(new Event("input", { bubbles: true }))`.
- **Reach an empty list by marking everything, then press Undo.** In Available now, Complete Shown then Complete empties it; Undo in the hint bar restores the entries, so the pane's stored progress is left as found.
- **Check responsive layout with `resize_window`** (a narrow width such as 800 and a wide one such as 1500), and reset it with `preset: "desktop"` afterwards.
- **Stop the server** with `preview_stop` when done. Test data stays in the pane's local storage.
- **Restart a stopped server with `preview_start {name: "dev"}`.** `navigate` to localhost fails and leaves a blank pane.
