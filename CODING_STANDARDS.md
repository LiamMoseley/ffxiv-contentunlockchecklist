# Coding standards

Judgement calls for review. Mechanical rules live in `eslint.config.js`.

## Testing

**Persisted formats are contracts.** Tests may assert directly on the stored progress (ADR-0001) and the backup file, against literal expected values, because later versions of the app and future sync must read them unchanged. Everything else goes through the Log core's commands and queries, as the PRD's Testing Decisions say.
