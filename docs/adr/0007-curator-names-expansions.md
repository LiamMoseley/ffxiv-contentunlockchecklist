# The Curator names expansions in a file of their own

The wiki's Content Unlock page never names an expansion: its sections are headed only by level bands ("Level 101 - 110", "Level 110"). Until now the app supplied the names of the six known expansions from its own code, and showed any other band under a placeholder named by its levels.

The Curator now owns expansion details in a committed expansions file in this repo, separate from the curation decisions file. It lists every expansion, the existing six included, by level cap: its ID, name and short name. The curation script builds a content release's expansions from it, with the level band and order coming from the wiki's sections, and the expansion list leaves the app's code. Naming an expansion is not editing the wiki, which stays out of scope: the wiki has no name to edit, and the app has always added one.

When the wiki adds a level band the file doesn't have, the script adds a placeholder line marked `?`. The check that blocks a curation PR while any decision is `?` blocks it until the Curator names the expansion, so no release reaches players without a name. Holding back a nameless revision is the same as holding back any other: the whole revision stays unmerged.

## Consequences

- An expansion's ID is chosen by the Curator, short and stable like `dt`, and never changes once published, because progress and the player's saved selection refer to it.
- Tile pictograms stay in the app's code, keyed by expansion ID. A new expansion shows the generic pictogram until an app deploy adds its own, and no release waits for that. Tiles have no per-expansion colours, so nothing else needs a deploy.
- The app keeps its placeholder named by levels only as a fallback for a release that somehow arrives without a name.

## Considered Options

- **Name it in the decisions file:** that file is overwritten on every run and records one release's decisions, while a name lasts for good.
- **Publish the placeholder until someone names it:** players would see "Level 101–110" on a tile for an expansion whose name has been public for months.
