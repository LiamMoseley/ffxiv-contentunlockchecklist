# Coding standards

Judgement calls for review. Mechanical rules live in `eslint.config.js`; formatting is Prettier's (`npm run format` fixes it, CI runs `npm run format:check`).

## Testing

**The agreed test seam is the Log core's commands and queries.** Write tests there, with the in-memory adapters and the fixed clock. This is pre-agreed: don't ask again before writing them.

**Persisted formats are contracts.** Tests may assert directly on the stored progress (ADR-0001) and the backup file, against literal expected values, because later versions of the app and future sync must read them unchanged. Every storage key the Log core writes counts, not only the progress: a new key gets a literal assertion on its key and value. Everything else goes through the Log core's commands and queries.

**Keep the UI thin.** The UI has no tests, so any rule that decides what is valid, derived or allowed (uniqueness, a Data Center from a World, what Reset clears) belongs in the Log core, where it is tested. A component only collects input, calls a command and shows the result.

**One query decides what a view lists.** Every view that lists entries gets its list from one Log core query, and everything derived from that list (Complete Shown and Clear Shown, counts, badges, empty states) uses the same query. A second list built in a component, such as bulk actions reading the section view while a different view is open, drifts from what the player sees.
