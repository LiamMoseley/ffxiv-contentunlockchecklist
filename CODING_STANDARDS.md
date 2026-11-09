# Coding standards

Judgement calls for review. Mechanical rules live in `eslint.config.js`; formatting is Prettier's (`npm run format` fixes it, CI runs `npm run format:check`).

## Testing

**The agreed test seam is the Log core's commands and queries.** Write tests there, with the in-memory adapters and the fixed clock. This is pre-agreed: don't ask again before writing them.

**Persisted formats are contracts.** Tests may assert directly on the stored progress (ADR-0001) and the backup file, against literal expected values, because later versions of the app and future sync must read them unchanged. Every storage key the Log core writes counts, not only the progress: a new key gets a literal assertion on its key and value (`storage-keys.test.ts` fails a `contentUnlockLog.*` key in `log.ts` that no other test names). Everything else goes through the Log core's commands and queries.

**The service worker and the shell-write hook have their own tests, beside the code.** `scripts/sw.test.mjs` runs `scripts/sw.template.js` against fake `caches`, `fetch` and `self`; `.claude/hooks/block-source-shell-writes.test.mjs` feeds the hook commands. A change to either adds a case there. They are not part of the Log core, so the seam above does not apply to them.

**The worker never trusts the browser's HTTP cache, and says why it ignores `Vary`.** GitHub Pages lets a file sit in the HTTP cache for 10 minutes, so install fetches with `cache: "reload"` and the page with `cache: "no-cache"`; a stale `index.html` kept under a new version points at scripts that no longer exist. A cache lookup that passes `ignoreVary` carries a comment naming the header it ignores and why.

**A context provider goes in `main.tsx`, around `<App>`.** Wrapping `App`'s own return re-indents the whole component and buries the real change in the diff.

**Start-up work in `createLog` goes just before its `return`.** The closure declares its helpers as `const`s in order (`statusOf`, `selection`, `filters`, `history`), so work that runs while the log is created, such as offering a bundled copy, hits an uninitialised `const` if it sits higher up.

**Keep the UI thin.** The UI has no tests, so any rule that decides what is valid, derived or allowed (uniqueness, a Data Center from a World, what Reset clears) belongs in the Log core, where it is tested. A component only collects input, calls a command and shows the result.

**The device's state is an adapter reading, not a rule.** A component may read whether the device is online (`navigator.onLine`) to disable a control and say why. What an update does, and what a failed fetch means, stays in the Log core.

**One query decides what a view lists.** Every view that lists entries gets its list from one Log core query, and everything derived from that list (Complete Shown and Clear Shown, counts, badges, empty states) uses the same query. A second list built in a component, such as bulk actions reading the section view while a different view is open, drifts from what the player sees.
