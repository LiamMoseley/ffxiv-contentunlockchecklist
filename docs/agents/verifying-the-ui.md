# Verifying the UI in the browser pane

Start the app with `preview_start {name: "dev"}` (`.claude/launch.json`).

- **Drive forms with `form_input`, `find` and `javascript_tool`.** Typing with `computer` into dialog fields lost keystrokes here, and a screenshot taken straight after an action can show the state before it.
- **Prove styling with computed styles** (`getComputedStyle(el)` through `javascript_tool`: font family, size, transform), then take one screenshot for the owner.
- **Set up state through `localStorage`** (`contentUnlockLog.progress`, `contentUnlockLog.currentCharacter`), then reload: faster than clicking through the UI.
- **Stop the server** with `preview_stop` when done. Test data stays in the pane's local storage.
