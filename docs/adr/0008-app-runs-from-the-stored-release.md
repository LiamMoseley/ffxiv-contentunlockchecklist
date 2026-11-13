# The app runs from the stored content release, with nothing bundled

Supersedes what is left of ADR-0002: the bundled snapshot, and the in-browser parse behind the player's Update action and the automatic wiki check.

The app ships no content. On first launch it fetches the latest content release and stores it on the device, and from then on it runs from that stored copy, offline included. The wiki parser and the wiki adapter move into the curation script, the only code that reads the wiki, so the app's bundle no longer carries them. The Log core takes a release source in place of the bundled content and the wiki source. Until a release is stored, it reports that the log is not loaded.

## Consequences

- The Update action, the change review, the suggested-match UI, the declined pairs and the wiki revision checks all go. After an update, a single summary line ("Content updated: 3 added, 1 renamed") is kept until the player dismisses it, and its counts add up across updates. The NEW notice is unchanged.
- The first release a device stores is not an update: it tags nothing NEW and shows no summary line.
- The service worker precaches only the app's own files. Content release requests go to the network. The app keeps release icons in a cache of its own, fetching the ones it lacks and deleting the ones the release no longer uses, and the worker serves icons from that cache.
- The highest character level comes from the release's highest level cap, so a new expansion raises it without a deploy.
- The stored release has a key of its own. The keys for the old stored content, declined pairs, dismissed revision, last check and held update are no longer read and are not cleaned up, since no player had stored progress before curated content.
- A first launch with no connection can't show the log. That is the price of never shipping a copy that has gone stale.

## Considered Options

- **Keep a bundled release as a first-launch fallback:** the log would show offline from the start, but every app deploy would carry content that a newer release supersedes at once, and an old bundle would need comparing against the stored release.
