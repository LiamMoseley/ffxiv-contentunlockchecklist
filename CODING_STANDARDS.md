# Coding standards

Judgement calls for review. Mechanical rules live in `eslint.config.js`.

## Testing

**The agreed test seam is the Log core's commands and queries.** Write tests there, with the in-memory adapters and the fixed clock. This is pre-agreed: don't ask again before writing them.

**Persisted formats are contracts.** Tests may assert directly on the stored progress (ADR-0001) and the backup file, against literal expected values, because later versions of the app and future sync must read them unchanged. Every storage key the Log core writes counts, not only the progress: a new key gets a literal assertion on its key and value. Everything else goes through the Log core's commands and queries.

**Keep the UI thin.** The UI has no tests, so any rule that decides what is valid, derived or allowed (uniqueness, a Data Center from a World, what Reset clears) belongs in the Log core, where it is tested. A component only collects input, calls a command and shows the result.
