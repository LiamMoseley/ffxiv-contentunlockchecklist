# Entry IDs are assigned by the Curator

Supersedes ADR-0003.

Each entry has a stable ID: a short random string (for example `k7q2xp`) given once and never derived from the wiki's text. The last published content is the only record of IDs. The curation script matches the wiki's rows against it, carries the IDs of matched entries forward, and gives unmatched rows new random IDs, which the Curator reviews. ADR-0003 derived IDs from content because devices updating separately had no shared authority. The Curator is now that authority, and every device takes its IDs from the same published content, so sync (ADR-0001) stays safe.

The ID is opaque. Neither the app nor the script reads meaning into it, so it never goes stale when the wording changes, and a readable slug or a sequential number was rejected for that reason and because two curation branches could hand out the same next number.

## Consequences

- A rename the Curator confirms keeps the ID, so it moves no progress.
- The Curator can match an entry across expansions. The script proposes matches within an expansion first.
- An identical row added above an existing one is a new entry. The existing entry keeps its ID; the Curator can swap them.
- A removed entry's ID is retired: it is never given to a different entry. The published content keeps a list of removed entries (ID, last wording, expansion), and when a row like one of them reappears the script proposes restoring it under its original ID, which the Curator confirms.
- Devices keep each character's status on a removed entry, so a restore brings that progress back.
- No progress was stored when this was decided, so nothing was migrated. The first curated content replaces whatever content a device holds, and backups made before it are not supported.
