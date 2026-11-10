# Entry identity is derived from its content

An entry's ID is calculated from its normalised unlock name and quest names. Level, notes, location, position and section heading are left out, so ordinary wiki edits never detach a character's progress. The expansion is always appended (`name@expansion`), and when two rows in one expansion share a name and quest, order of appearance within it tells them apart (`name@expansion#2`). A rename changes the ID: the old status is kept as an orphaned status and offered to the player as a suggested match, and it is never moved without their say-so.

The ID is derived rather than assigned so that every device calculates the same ID for the same row. With assigned IDs carried forward by matching against the previous snapshot, two devices updating separately could give one entry different IDs, which would break sync (ADR-0001).

## Every ID carries its expansion (#51)

Qualifying only rows that share a name meant a wiki edit that added a second row with the same unlock and quest renamed the first: `name` became `name@expansion`, and the player's progress was orphaned. Qualifying every row by expansion removes that. A duplicate added in another expansion, earlier or later on the page, never changes an existing entry's ID. Keeping existing IDs by matching against the previous content was rejected for the reason above: it would make the ID depend on which snapshot a device had last seen, which breaks sync (ADR-0001).

Two cases still change an ID, and both orphan the progress:

- The wiki moves a row to a different expansion. Suggested matches only pair entries within one expansion, so none is offered.
- The wiki adds an identical row to the *same* expansion, above the existing one, which shifts the order-of-appearance suffix.

No progress existed when this was decided, so no stored ID needed migrating.
