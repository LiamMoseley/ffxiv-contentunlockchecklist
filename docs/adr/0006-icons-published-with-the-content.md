# Icons are published with the content

Supersedes ADR-0002 where it says icons that only appear after an in-browser update come from the wiki.

The curation script copies every icon a content release uses from the wiki into this repo, and the curation PR commits any new ones beside the decisions file. Merging publishes them to the same host as the content. A release names each icon by the file name it is published under, not by its path on the wiki, so the app never contacts the wiki and never needs to know how the wiki lays out its images.

Icons belong to the content, not to the app. They are left out of the service worker's precache of the app's own files, so publishing a release with a new icon doesn't give the app a new version. When a device applies a release it fetches each icon the release names that it doesn't already hold, into a cache that outlives app deploys.

## Consequences

- The wiki's rule against hot-linked images (it rejects requests that carry a referrer) stops mattering to players, and the runtime cache for wiki icons goes.
- A release applies once its content is stored, without waiting for its icons. A missing icon is fetched in the background and retried on the next launch, and until then its entry shows without one.
- The curation script never deletes an icon file, so a restored entry's icon (ADR-0004) is still published. A device drops icons its current copy no longer uses and fetches them again if they come back.
- The copy step only downloads icons the repo doesn't have, so a wiki image replaced under the same file name is not picked up. The Curator deletes the file in a curation PR to force a fresh copy.
- An icon that fails to download fails the curation run, so no release names an icon that was never published.
- The curation report lists the new icons. The decisions file records nothing about them.

## Considered Options

- **Keep pointing at the wiki's image URLs:** less in the repo, but every player would depend on the wiki being up and on its referrer rule never tightening, and the app would still check the wiki, which curated content set out to stop.
- **A release waits for every icon:** an icon that fails to load would hold back a whole release, and a first launch would stay on "Connect to load the log" over decoration.
