# Content releases are self-contained and numbered

Supersedes ADR-0002 where it says a device keeps the copy with the higher wiki revision.

The Curator publishes the log's content as a series of content releases. Each one is complete: every entry, the list of removed entries (ADR-0004) and the expansions with their names and level caps. It is never a delta against the release before it. A release carries its own release number, which goes up by one with each publish, the wiki revision it came from and the date it was published. A device applies a release only when its number is higher than the one the device holds. A wiki revision can't serve as the version, because the Curator can republish the same revision with a corrected match, or hold one back.

A release carries no summary of what changed. The device works that out by comparing the release with the copy it holds, using entry IDs:

- **Added:** IDs the device's copy has neither as entries nor in its removed list.
- **Restored:** IDs in the device's copy's removed list.
- **Removed:** IDs the new release no longer has as entries.
- **Renamed:** the same ID with a different unlock name or quest.

Other field edits (level, location, notes) apply without being counted. Because the counts are worked out against what the device holds, a device that skipped releases gets the same result as one that applied each of them. It fetches only the latest release, and it never replays a chain.

## Consequences

- NEW tags accumulate: an added entry joins the device's NEW set and stays until the player marks it as seen, and a removed entry leaves the set. A restored entry is not tagged NEW. Before this, each update replaced the tags, which would give a device that skipped a release different tags from one that didn't.
- A new expansion's name arrives with the content instead of waiting for a redeploy of the app.
- Each release carries a `format` integer. An app that meets a format it doesn't know ignores the release, keeps its stored copy and tries again once the app itself has updated, so a cached old copy never misreads a newer shape.

## Considered Options

- **Deltas between releases:** smaller downloads, but a device several releases behind would need every delta in order, and a change summary stored in a release is only right for a device that applied the release just before it.
- **The wiki revision ID as the version:** it can't tell a republished revision with corrected matches from the original.
