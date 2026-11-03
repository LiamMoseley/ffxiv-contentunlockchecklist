# Local-first progress, stored in a sync-ready shape

The first release keeps progress on the device only, with no server. But device-to-device sync (PRD section 6.8) is planned, and its rules (newest change wins, deleted characters stay deleted) need every stored change to carry a timestamp and deletions to leave a marker. So progress is stored in that shape from day one, even though nothing reads the timestamps yet. Adding sync later then needs no migration of existing progress.

Concretely, progress is stored as current state, not as a change log: each (character, entry) pair holds its entry status and when it last changed, and each character holds its details, when they last changed, and a deleted marker. Characters have a random ID; name and World are a uniqueness rule and the key for matching on import, never the identity, so renaming a character keeps its progress.

## Considered Options

- **Local-only, reshape later:** simpler now, but would need a data migration across every device before sync could merge anything.
- **Build sync into v1:** delays the core checklist for a feature the PRD marks as proposed.
- **An append-only change log:** grows forever for no benefit at this data size; current state with per-field timestamps merges just as well.

## Consequences

- Undo is a new change that writes the earlier statuses back with a fresh timestamp, not a rewind. A rewind would lose to the newer change on another device once sync exists. Undo history is per device and in memory only.
- Deleting a character leaves a deleted marker so that a device that was offline can't bring it back.
