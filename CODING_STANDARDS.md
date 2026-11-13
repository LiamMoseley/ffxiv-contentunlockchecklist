# Coding standards

Judgement calls for review. Mechanical rules live in `eslint.config.js`; formatting is Prettier's (`npm run format` fixes it, CI runs `npm run format:check`).

## Testing

**The agreed test seam is the Log core's commands and queries.** Write tests there, with the in-memory adapters and the fixed clock. This is pre-agreed: don't ask again before writing them.

**`src/ui/app.test.tsx` is a render smoke test, outside the seam.** It mounts `<App>` on the bundled content under jsdom and clicks every rail tile and section tab, so a component that throws or loops on render (an unbounded `setState` in an effect) fails `npm run check` instead of showing a black page in the browser. It asserts no look or behaviour: UI rules still belong in the Log core ("Keep the UI thin"). A new UI feature that needs a browser API jsdom lacks stubs it in that file's `beforeAll`. The `matchMedia` stub there carries no-op `addEventListener` and `removeEventListener`, since `EntryTable` subscribes to the 1000px query (#124): a new subscriber to another query reuses it.

**A breakpoint kept in both JavaScript and CSS names both places.** `STACKED_ROW_QUERY` in `EntryList.tsx` and `@media (max-width: 1000px)` in `app.css` must agree, and the JavaScript constant's comment names the stylesheet (#124). Layout that CSS alone can express stays in CSS; a JavaScript switch is for markup that differs between layouts.

**Persisted formats are contracts.** Tests may assert directly on the stored progress (ADR-0001) and the backup file, against literal expected values, because later versions of the app and future sync must read them unchanged. Every storage key the Log core writes counts, not only the progress: a new key gets a literal assertion on its key and value (`storage-keys.test.ts` fails a `contentUnlockLog.*` key in `log.ts` that no other test names). Everything else goes through the Log core's commands and queries.

**The service worker and the shell-write hook have their own tests, beside the code.** `scripts/sw.test.mjs` runs `scripts/sw.template.js` against fake `caches`, `fetch` and `self`; `.claude/hooks/block-source-shell-writes.test.mjs` feeds the hook commands. A change to either adds a case there. They are not part of the Log core, so the seam above does not apply to them.

**The worker never trusts the browser's HTTP cache, and says why it ignores `Vary`.** GitHub Pages lets a file sit in the HTTP cache for 10 minutes, so install fetches with `cache: "reload"` and the page with `cache: "no-cache"`; a stale `index.html` kept under a new version points at scripts that no longer exist. A cache lookup that passes `ignoreVary` carries a comment naming the header it ignores and why.

**A context provider goes in `main.tsx`, around `<App>`.** Wrapping `App`'s own return re-indents the whole component and buries the real change in the diff.

**Start-up work in `createLog` goes just before its `return`.** The closure declares its helpers as `const`s in order (`statusOf`, `selection`, `filters`, `history`), so work that runs while the log is created, such as offering a bundled copy, hits an uninitialised `const` if it sits higher up.

**Keep the UI thin.** The UI has no tests, so any rule that decides what is valid, derived or allowed (uniqueness, a number shown in a tab (#95), a Data Center from a World, what Reset clears) belongs in the Log core, where it is tested. A component only collects input, calls a command and shows the result. A message built from a command's counts (the import summary) is such a rule: the command returns the text, and a test asserts it as a literal.

**Duplication is a check, not a judgement.** `npm run duplication` (jscpd, settings in `.jscpd.json`) fails on a repeated block of 8 lines. Extract the shared helper rather than raising the limit.

**The device's state is an adapter reading, not a rule.** A component may read whether the device is online (`navigator.onLine`) to disable a control and say why. What an update does, and what a failed fetch means, stays in the Log core.

**The look settled by the UI prototype verdict is the owner's.** Fading Completed and Not interested rows by opacity, the Completed text colour and the bronze frame came from `docs/prototypes/ui-verdict.md` (the prototype itself is archived at the `archive/prototype-ui` tag). An accessibility fix that changes one of them (a contrast change, an underline, a different fade) is a decision to put to the owner with the contrast numbers, not a change to make: #47 changed the fading, and the owner had it restored.

**A ticket agrees with the PRD and `GLOSSARY.md`.** Flag a ticket or acceptance criterion that widens or narrows what a PRD story or a glossary term (Section, View) says: the owner confirms the reading before it is built. Search and filters narrow a view and never widen it.

**A window-level key handler ignores keys pressed inside a dialog.** `/`, Ctrl/Cmd+K and Ctrl/Cmd+Z in `App.tsx` start with `inDialog(event)`, so a key meant for the open dialog never moves focus or changes progress behind its backdrop. A new window-level handler does the same. A shortcut the UI binds is also named in `helpContent()` (`help.test.ts` fails when a bound key is missing).

**Text styles come from the tokens at the top of `app.css` (#119).** `npm run type-tokens` fails on a size literal or a 600 weight in a rule; what follows is the judgement the check cannot make.
- *Sizes:* `--size-badge` 10px, `--size-xs` 12px (table headings, counts, meta, the hint bar legend, the footer bar), `--size-sm` 13px (the log's table and card text, notices, buttons, form labels), `--size-md` 14px (help and dialog text), `--size-lg` 15px (phone Unlock text), `--size-xl` 16px (the update dialog's section headings), and `--size-tab` 13px. Pick the nearest step rather than adding a half-pixel one. (`--text-*` is taken: those are colours.)
- *Roles* carry weight, size, line height and face together: `--type-title` (app title), `--type-display` (dialog headings), `--type-name` (character name), `--type-section` (section heading), `--type-rail` and `--type-rail-collapsed`, `--type-count`, and `--type-overline`, the small gold uppercase heading that the help dialog, the Characters menu and Display Mode share.
- *Weights:* 400 by default; 300 only for the rail and the big counts; 700 only for badges and the overline heading.
- *Shared tokens:* a token redefined in the phone `:root` moves every rule that reads it. #119's phone `--type-display` shrank the dialog headings along with the app title until a computed-style diff caught it; the app title got its own `--type-title`.
- *Relative sizes:* `1em`, `0.82em` and an inherited size resolve against the parent (the update dialog's 16px). Read the computed pixels before picking a step, or the text shrinks (the dialog headings went 16px to 14px until `--size-xl`).
- *Phones:* a size that is smaller on phones is redefined in the `:root` of the phone `@media` block, not overridden on its selector. Phone-only controls (Update, Undo, Filters) take a scale step.

**A size taken from another rule uses its CSS variable.** The help dialog's cap comes from `--page-pad`, `--window-frame`, `--window-min-height` and `--dialog-gap`, so changing the window's frame moves the dialog with it. A copied `68px` drifts silently.

**One validation rule per field, shared by every path that writes it.** Adding, editing and importing a character all go through the same function for the World (`acceptedWorld`), so a rule changed in one cannot drift in another. A test that exercises each path guards it.

**A control that disables itself on activation hands focus to the page.** Clear filters went disabled the moment a keyboard user pressed it, and focus dropped to `<body>`. Move focus to a sensible neighbour in the same handler.

**Motion that changes the entry list's height needs the All tile's cost in mind.** The list holds up to 429 rows, and a per-frame resize re-measures them all (#94). Animate `transform` and `opacity`, or contain the list's size.

**One query decides what a view lists.** Every view that lists entries gets its list from one Log core query, and everything derived from that list (Complete Shown and Clear Shown, counts, badges, empty states) uses the same query. A second list built in a component, such as bulk actions reading the section view while a different view is open, drifts from what the player sees.
